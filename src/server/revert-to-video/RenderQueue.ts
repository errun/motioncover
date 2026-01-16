import { EventEmitter } from "events";
import { FrameScheduler } from "./FrameScheduler";
import type { VideoRecipe } from "@/features/revert-to-video/recipeTypes";
import { randomUUID } from "crypto";

export type RenderJob = {
  id: string;
  recipe: VideoRecipe;
  status: "pending" | "rendering" | "completed" | "failed";
  progress: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string | null;
  eta?: number;
  outputPath?: string;
};

export class RenderQueue extends EventEmitter {
  private maxConcurrent: number;
  private outputDir: string;
  private queue: RenderJob[] = [];
  private active: Map<string, RenderJob> = new Map();
  private completed: Map<string, RenderJob> = new Map();
  private schedulers: Map<string, FrameScheduler> = new Map();

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
      this.queue.splice(queueIndex, 1);
      this.emit("cancelled", { jobId });
      return true;
    }

    if (this.schedulers.has(jobId)) {
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
      job.outputPath = result.path;

      this.active.delete(job.id);
      this.completed.set(job.id, job);
      this.schedulers.delete(job.id);
      this.emit("complete", { jobId: job.id, path: result.path });
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
      this.active.delete(job.id);
      this.completed.set(job.id, job);
      this.schedulers.delete(job.id);
      this.emit("error", { jobId: job.id, error: job.error });
    }

    this.processQueue();
  }
}
