import { RecipeGenerator } from "./RecipeGenerator";
import type { EffectConfig } from "./recipeTypes";

type ExportProgress = {
  stage: "recipe" | "upload" | "render";
  message: string;
  progress: number;
  frame?: number;
  total?: number;
  eta?: number;
};

export class VideoExporter {
  private serverUrl: string;
  private fps: number;
  private width: number;
  private height: number;
  private generator: RecipeGenerator;
  private ws: WebSocket | null = null;
  private currentJobId: string | null = null;

  constructor(options: { serverUrl?: string; fps?: number; width?: number; height?: number } = {}) {
    const defaultUrl =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    this.serverUrl = options.serverUrl ?? defaultUrl;
    this.fps = options.fps || 30;
    this.width = options.width || 1080;
    this.height = options.height || 1080;
    this.generator = new RecipeGenerator({
      fps: this.fps,
      width: this.width,
      height: this.height,
    });
  }

  async export({
    audioFile,
    imageFile,
    effects,
    maxDurationSec,
    segmentStartSec,
    segmentDurationSec,
    onProgress = () => {},
  }: {
    audioFile: File;
    imageFile: File | string;
    effects?: EffectConfig;
    maxDurationSec?: number;
    segmentStartSec?: number;
    segmentDurationSec?: number;
    onProgress?: (p: ExportProgress) => void;
  }): Promise<{ url: string; jobId: string }> {
    try {
      onProgress({ stage: "recipe", message: "Analyzing audio...", progress: 0 });

      const recipe = await this.generator.generate({
        audioFile,
        imageFile,
        effects,
        maxDurationSec,
        segmentStartSec,
        segmentDurationSec,
        onProgress: (p) => {
          onProgress({
            stage: "recipe",
            message: this.getRecipeMessage(p.stage),
            progress: p.progress * 0.3,
          });
        },
      });

      onProgress({ stage: "upload", message: "Uploading...", progress: 0.3 });

      const baseUrl = this.serverUrl || "";
      const response = await fetch(`${baseUrl}/api/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || "Failed to submit render job");
      }

      const { jobId, wsUrl } = (await response.json()) as { jobId: string; wsUrl: string | null };
      this.currentJobId = jobId;

      return await new Promise((resolve, reject) => {
        if (!wsUrl) {
          this.pollStatus(jobId, onProgress, resolve, reject);
          return;
        }

        const server = new URL(this.serverUrl);
        const wsProtocol = server.protocol === "https:" ? "wss" : "ws";
        const wsFullUrl = `${wsProtocol}://${server.host}${wsUrl}`;
        this.ws = new WebSocket(wsFullUrl);

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data as string) as {
            type: "progress" | "complete" | "error";
            data: { frame?: number; total?: number; percent?: number; eta?: number; url?: string; message?: string };
          };

          switch (message.type) {
            case "progress":
              onProgress({
                stage: "render",
                message: `Rendering ${message.data.frame}/${message.data.total}`,
                progress: 0.3 + ((message.data.percent || 0) / 100) * 0.7,
                frame: message.data.frame,
                total: message.data.total,
                eta: message.data.eta,
              });
              break;
            case "complete":
              this.cleanup();
              resolve({
                url: `${baseUrl}${message.data.url}`,
                jobId,
              });
              break;
            case "error":
              this.cleanup();
              reject(new Error(message.data.message || "Render failed"));
              break;
            default:
              break;
          }
        };

        this.ws.onerror = () => {
          this.cleanup();
          reject(new Error("WebSocket connection failed"));
        };

        this.ws.onclose = () => {
          if (this.currentJobId) {
            this.pollStatus(jobId, onProgress, resolve, reject);
          }
        };
      });
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  cancel() {
    if (this.currentJobId) {
      const baseUrl = this.serverUrl || "";
      fetch(`${baseUrl}/api/render/${this.currentJobId}/cancel`, {
        method: "POST",
      }).catch(() => {});
    }
    this.cleanup();
  }

  private getRecipeMessage(stage: string) {
    const messages: Record<string, string> = {
      preparing: "Preparing...",
      audio: "Analyzing audio...",
      image: "Processing image...",
      generating: "Generating recipe...",
      complete: "Recipe ready",
    };
    return messages[stage] || "Working...";
  }

  private async pollStatus(
    jobId: string,
    onProgress: (p: ExportProgress) => void,
    resolve: (value: { url: string; jobId: string }) => void,
    reject: (reason?: Error) => void
  ) {
    try {
      const baseUrl = this.serverUrl || "";
      const response = await fetch(`${baseUrl}/api/render/${jobId}`);
      const job = (await response.json()) as {
        status: "pending" | "rendering" | "completed" | "failed";
        progress?: number;
        eta?: number;
        outputPath?: string;
        error?: string;
      };

      if (job.status === "completed") {
        onProgress({
          stage: "render",
          message: "Render complete!",
          progress: 1,
        });
        const fileName = job.outputPath ? job.outputPath.split(/[\\/]/).pop() : `${jobId}.mp4`;
        resolve({ url: `${baseUrl}/api/download/${fileName}`, jobId });
      } else if (job.status === "failed") {
        reject(new Error(job.error || "Render failed"));
      } else {
        // Update progress for pending or rendering status
        const percent = job.progress ?? 0;
        const renderProgress = 0.3 + (percent / 100) * 0.7;

        if (job.status === "pending") {
          onProgress({
            stage: "render",
            message: "Waiting in queue...",
            progress: 0.3,
          });
        } else {
          onProgress({
            stage: "render",
            message: `Rendering... ${Math.round(percent)}%`,
            progress: renderProgress,
            eta: job.eta,
          });
        }

        setTimeout(() => this.pollStatus(jobId, onProgress, resolve, reject), 1000);
      }
    } catch (error) {
      reject(error as Error);
    }
  }

  private cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentJobId = null;
  }
}
