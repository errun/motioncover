import { EventEmitter } from "events";
import fs from "fs/promises";
import path from "path";
import { CanvasRenderer } from "./CanvasRenderer";
import { FFmpegPipeline } from "./FFmpegPipeline";
import type { VideoRecipe, AudioMappingConfig } from "@/features/revert-to-video/recipeTypes";

const lerp = (current: number, target: number, factor: number) =>
  current + (target - current) * factor;

const DEFAULT_AUDIO_MAPPING: AudioMappingConfig = {
  globalGain: 0.75,
  lowBaseGain: 0.65,
  lowDynGain: 8.0,
  midBaseGain: 0.65,
  midDynGain: 7.0,
  highBaseGain: 0.65,
  highDynGain: 6.0,
};

export class FrameScheduler extends EventEmitter {
  private outputDir: string;
  private isRendering = false;
  private shouldCancel = false;
  private audioMapping: AudioMappingConfig = { ...DEFAULT_AUDIO_MAPPING };

  private smoothLow = 0;
  private smoothMid = 0;
  private smoothHigh = 0;
  private smoothLowDelta = 0;
  private smoothMidDelta = 0;
  private smoothHighDelta = 0;
  private prevRawLow = 0;
  private prevRawMid = 0;
  private prevRawHigh = 0;
  private baselineLow = 0;
  private baselineMid = 0;
  private baselineHigh = 0;

  constructor(options: { outputDir: string }) {
    super();
    this.outputDir = options.outputDir;
    this.resetAudioState();
  }

  async render(recipe: VideoRecipe, jobId: string) {
    if (this.isRendering) {
      throw new Error("Already rendering");
    }

    this.isRendering = true;
    this.shouldCancel = false;

    try {
      await fs.mkdir(this.outputDir, { recursive: true });

      const outputPath = path.join(this.outputDir, `${jobId}.mp4`);
      const audioPath = await this.extractAudio(recipe.audio, jobId);

      const renderer = new CanvasRenderer({
        width: recipe.meta.width,
        height: recipe.meta.height,
      });
      await renderer.loadImage(recipe.image.source);

      const pipeline = new FFmpegPipeline({
        width: recipe.meta.width,
        height: recipe.meta.height,
        fps: recipe.meta.fps,
        outputPath,
        audioPath,
        preset: "medium",
      });

      pipeline.on("progress", (data: { frame: number }) => {
        this.emit("progress", {
          frame: data.frame,
          total: recipe.meta.totalFrames,
          percent: (data.frame / recipe.meta.totalFrames) * 100,
        });
      });

      pipeline.start();

      const { frames, effects, meta } = recipe;
      this.audioMapping = {
        ...DEFAULT_AUDIO_MAPPING,
        ...(effects?.audioMapping || {}),
      };

      const startTime = Date.now();
      this.resetAudioState();

      for (let i = 0; i < meta.totalFrames; i += 1) {
        if (this.shouldCancel) {
          pipeline.cancel();
          throw new Error("Rendering cancelled");
        }

        const time = i / meta.fps;
        const rawFrame = frames[i] || { low: 0, mid: 0, high: 0 };
        const audioData = this.mapAudioFrame(rawFrame);

        const frameBuffer = renderer.renderFrame({
          frameIndex: i,
          time,
          audioData,
          effects,
        });

        await pipeline.writeFrame(frameBuffer);

        if (i % 100 === 0 && i > 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const fps = i / Math.max(elapsed, 0.1);
          const eta = (meta.totalFrames - i) / Math.max(fps, 0.1);

          this.emit("progress", {
            frame: i,
            total: meta.totalFrames,
            percent: (i / meta.totalFrames) * 100,
            fps: fps.toFixed(1),
            eta: Math.round(eta),
          });
        }
      }

      const result = await pipeline.finish();

      if (audioPath) {
        await fs.unlink(audioPath).catch(() => {});
      }

      renderer.dispose();
      this.emit("complete", { path: result.path });
      return result;
    } finally {
      this.isRendering = false;
    }
  }

  cancel() {
    this.shouldCancel = true;
  }

  private resetAudioState() {
    this.smoothLow = 0;
    this.smoothMid = 0;
    this.smoothHigh = 0;
    this.smoothLowDelta = 0;
    this.smoothMidDelta = 0;
    this.smoothHighDelta = 0;
    this.prevRawLow = 0;
    this.prevRawMid = 0;
    this.prevRawHigh = 0;
    this.baselineLow = 0;
    this.baselineMid = 0;
    this.baselineHigh = 0;
  }

  private mapAudioFrame(frame: { low: number; mid: number; high: number }) {
    const rawLow = Math.max(0, Math.min(1, frame.low || 0));
    const rawMid = Math.max(0, Math.min(1, frame.mid || 0));
    const rawHigh = Math.max(0, Math.min(1, frame.high || 0));

    this.baselineLow = lerp(this.baselineLow, rawLow, 0.01);
    this.baselineMid = lerp(this.baselineMid, rawMid, 0.01);
    this.baselineHigh = lerp(this.baselineHigh, rawHigh, 0.01);

    const relLow = Math.max(
      0,
      (rawLow - this.baselineLow * 0.5) / Math.max(1e-3, 1 - this.baselineLow * 0.5)
    );
    const relMid = Math.max(
      0,
      (rawMid - this.baselineMid * 0.3) / Math.max(1e-3, 1 - this.baselineMid * 0.3)
    );
    const relHigh = Math.max(
      0,
      (rawHigh - this.baselineHigh * 0.3) / Math.max(1e-3, 1 - this.baselineHigh * 0.3)
    );

    this.smoothLow = lerp(this.smoothLow, relLow, 0.25);
    this.smoothMid = lerp(this.smoothMid, relMid, 0.2);
    this.smoothHigh = lerp(this.smoothHigh, relHigh, 0.2);

    const rawLowDelta = Math.max(0, rawLow - this.prevRawLow);
    const rawMidDelta = Math.max(0, rawMid - this.prevRawMid);
    const rawHighDelta = Math.max(0, rawHigh - this.prevRawHigh);

    this.prevRawLow = rawLow;
    this.prevRawMid = rawMid;
    this.prevRawHigh = rawHigh;

    this.smoothLowDelta =
      rawLowDelta > this.smoothLowDelta
        ? lerp(this.smoothLowDelta, rawLowDelta, 0.6)
        : lerp(this.smoothLowDelta, rawLowDelta, 0.15);
    this.smoothMidDelta =
      rawMidDelta > this.smoothMidDelta
        ? lerp(this.smoothMidDelta, rawMidDelta, 0.5)
        : lerp(this.smoothMidDelta, rawMidDelta, 0.12);
    this.smoothHighDelta =
      rawHighDelta > this.smoothHighDelta
        ? lerp(this.smoothHighDelta, rawHighDelta, 0.5)
        : lerp(this.smoothHighDelta, rawHighDelta, 0.12);

    const mapping = this.audioMapping || DEFAULT_AUDIO_MAPPING;
    const deltaScale = 0.5;

    let lowEffect = this.smoothLow * mapping.lowBaseGain + this.smoothLowDelta * deltaScale * mapping.lowDynGain;
    let midEffect = this.smoothMid * mapping.midBaseGain + this.smoothMidDelta * deltaScale * mapping.midDynGain;
    let highEffect = this.smoothHigh * mapping.highBaseGain + this.smoothHighDelta * deltaScale * mapping.highDynGain;

    lowEffect *= mapping.globalGain;
    midEffect *= mapping.globalGain;
    highEffect *= mapping.globalGain;

    return {
      low: Math.min(lowEffect, 3.0),
      mid: Math.min(midEffect, 2.5),
      high: Math.min(highEffect, 3.0),
    };
  }

  private async extractAudio(audioSource: { source: string }, jobId: string) {
    if (!audioSource?.source) return null;

    const mimeMatch = audioSource.source.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "audio/mpeg";

    const extMap: Record<string, string> = {
      "audio/mpeg": ".mp3",
      "audio/mp3": ".mp3",
      "audio/wav": ".wav",
      "audio/wave": ".wav",
      "audio/x-wav": ".wav",
      "audio/ogg": ".ogg",
      "audio/flac": ".flac",
      "audio/aac": ".aac",
      "audio/m4a": ".m4a",
      "audio/mp4": ".m4a",
      "audio/webm": ".webm",
    };

    const ext = extMap[mimeType] || ".mp3";
    const audioPath = path.join(this.outputDir, `${jobId}_audio${ext}`);

    const base64Data = audioSource.source.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (!buffer || buffer.length === 0) {
      return null;
    }

    await fs.writeFile(audioPath, buffer);
    return audioPath;
  }
}
