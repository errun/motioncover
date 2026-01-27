import { EventEmitter } from "events";
import fs from "fs/promises";
import path from "path";
import { FrameScheduler } from "./FrameScheduler";
import type { VideoRecipe } from "@/features/revert-to-video/recipeTypes";
import { randomUUID } from "crypto";

export type RenderJob = {
  id: string;
  recipe: VideoRecipe;
  status: "pending" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string | null;
  eta?: number;
  outputPath?: string;
  position?: number;
};

export class RenderQueue extends EventEmitter {
  private maxConcurrent: number;
  private outputDir: string;
  private queue: RenderJob[] = [];
  private active: Map<string, RenderJob> = new Map();
  private completed: Map<string, RenderJob> = new Map();
  private schedulers: Map<string, FrameScheduler> = new Map();
  private cancelled: Set<string> = new Set();

  constructor(options: { maxConcurrent: number; outputDir: string }) {
    super();
    this.maxConcurrent = options.maxConcurrent;
    this.outputDir = options.outputDir;
  }

  enqueue(recipe: VideoRecipe) {
    const jobId = randomUUID();
    const job: RenderJob = {
      id: jobId,
      recipe,
      status: "pending",
      progress: 0,
      createdAt: Date.now(),
      error: null,
    };

    this.queue.push(job);
    this.emit("queued", { jobId, position: this.queue.length });
    this.processQueue();
    return jobId;
  }

  getJob(jobId: string) {
    if (this.active.has(jobId)) return this.active.get(jobId);
    if (this.completed.has(jobId)) return this.completed.get(jobId);

    const queued = this.queue.find((job) => job.id === jobId);
    if (queued) {
      return { ...queued, position: this.queue.indexOf(queued) + 1 };
    }
    return null;
  }

  cancel(jobId: string) {
    const queueIndex = this.queue.findIndex((job) => job.id === jobId);
    if (queueIndex !== -1) {
      const [job] = this.queue.splice(queueIndex, 1);
      if (job) {
        job.status = "cancelled";
        job.completedAt = Date.now();
        this.completed.set(job.id, job);
      }
      this.emit("cancelled", { jobId });
      return true;
    }

    if (this.schedulers.has(jobId)) {
      this.cancelled.add(jobId);
      this.schedulers.get(jobId)?.cancel();
      return true;
    }

    return false;
  }

  cleanup(maxAge = 3600000) {
    const now = Date.now();
    for (const [jobId, job] of this.completed) {
      if (job.completedAt && now - job.completedAt > maxAge) {
        this.completed.delete(jobId);
      }
    }
  }

  getStats() {
    return {
      pending: this.queue.length,
      active: this.active.size,
      completed: this.completed.size,
    };
  }

  getSnapshot(limitCompleted = 20) {
    const pending = this.queue.map((job, index) => ({
      id: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      position: index + 1,
    }));
    const active = Array.from(this.active.values()).map((job) => ({
      id: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      eta: job.eta,
    }));
    const completed = Array.from(this.completed.values())
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, limitCompleted)
      .map((job) => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.error,
        outputPath: job.outputPath,
      }));
    return {
      stats: this.getStats(),
      pending,
      active,
      completed,
    };
  }

  private async processQueue() {
    if (this.active.size >= this.maxConcurrent) return;
    if (this.queue.length === 0) return;

    const job = this.queue.shift();
    if (!job) return;

    job.status = "rendering";
    job.startedAt = Date.now();
    this.active.set(job.id, job);

    const scheduler = new FrameScheduler({ outputDir: this.outputDir });
    this.schedulers.set(job.id, scheduler);

    scheduler.on("progress", (data: { percent: number; eta?: number }) => {
      job.progress = data.percent;
      job.eta = data.eta;
      this.emit("progress", { jobId: job.id, ...data });
    });

    try {
      const result = await scheduler.render(job.recipe, job.id);
      job.status = "completed";
      job.completedAt = Date.now();
      job.outputPath = await this.maybeRenameOutput(result.path, job);

      this.active.delete(job.id);
      this.completed.set(job.id, job);
      this.schedulers.delete(job.id);
      this.emit("complete", { jobId: job.id, path: result.path });
    } catch (error) {
      if (this.cancelled.has(job.id)) {
        job.status = "cancelled";
        job.error = "Cancelled by user";
        this.cancelled.delete(job.id);
      } else {
        job.status = "failed";
        job.error = error instanceof Error ? error.message : String(error);
      }
      this.active.delete(job.id);
      this.completed.set(job.id, job);
      this.schedulers.delete(job.id);
      this.emit("error", { jobId: job.id, error: job.error });
    }

    this.processQueue();
  }

  private async maybeRenameOutput(outputPath: string, job: RenderJob) {
    if (!outputPath) return outputPath;
    const dir = path.dirname(outputPath);
    const desiredName = this.buildOutputFileName(job.recipe?.meta?.title, job.completedAt);
    if (!desiredName) return outputPath;

    const currentName = path.basename(outputPath);
    if (currentName === desiredName) return outputPath;

    let targetPath = path.join(dir, desiredName);
    if (await this.fileExists(targetPath)) {
      const suffix = job.id.slice(0, 6);
      const base = desiredName.replace(/\.mp4$/i, "");
      targetPath = path.join(dir, `${base}-${suffix}.mp4`);
      if (await this.fileExists(targetPath)) {
        return outputPath;
      }
    }

    try {
      await fs.rename(outputPath, targetPath);
      return targetPath;
    } catch {
      return outputPath;
    }
  }

  private async fileExists(filePath: string) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private buildOutputFileName(title?: string, completedAt?: number) {
    const base = this.sanitizeTitle(title);
    const stamp = this.formatTimestamp(completedAt ? new Date(completedAt) : new Date());
    return `${base}-${stamp}.mp4`;
  }

  private sanitizeTitle(title?: string) {
    const raw = (title || "export").trim().toLowerCase();
    const ascii = raw
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return ascii || "export";
  }

  private formatTimestamp(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }
}
