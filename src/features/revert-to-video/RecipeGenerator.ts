import { OfflineAnalyzer } from "./OfflineAnalyzer";
import { createDefaultEffects, validateRecipe } from "./recipeTypes";
import type { EffectConfig, VideoRecipe } from "./recipeTypes";

type GenerateProgress = {
  stage: "preparing" | "audio" | "image" | "generating" | "complete";
  progress: number;
};

export class RecipeGenerator {
  private fps: number;
  private width: number;
  private height: number;
  private analyzer: OfflineAnalyzer;

  constructor(options: { fps?: number; width?: number; height?: number } = {}) {
    this.fps = options.fps || 30;
    this.width = options.width || 1080;
    this.height = options.height || 1080;
    this.analyzer = new OfflineAnalyzer({ fps: this.fps });
  }

  async generate({
    audioFile,
    imageFile,
    effects,
    maxDurationSec,
    segmentStartSec,
    segmentDurationSec,
    rhythmMode,
    bpm,
    title,
    onProgress = () => {},
  }: {
    audioFile: File | ArrayBuffer;
    imageFile: File | string;
    effects?: EffectConfig;
    maxDurationSec?: number;
    segmentStartSec?: number;
    segmentDurationSec?: number;
    rhythmMode?: "beat" | "bpm";
    bpm?: number;
    title?: string;
    onProgress?: (p: GenerateProgress) => void;
  }): Promise<VideoRecipe> {
    onProgress({ stage: "preparing", progress: 0 });

    let audioBuffer: ArrayBuffer;
    let audioDataUrl: string;

    if (audioFile instanceof ArrayBuffer) {
      audioBuffer = audioFile;
      audioDataUrl = await this.arrayBufferToBase64(audioBuffer.slice(0));
    } else {
      audioBuffer = await this.readFileAsArrayBuffer(audioFile);
      audioDataUrl = await this.readFileAsDataURL(audioFile);
    }

    onProgress({ stage: "audio", progress: 0.05 });

    const audioResult = await this.analyzer.analyze(audioBuffer, (p) => {
      onProgress({ stage: "audio", progress: 0.05 + p.progress * 0.5 });
    });

    onProgress({ stage: "image", progress: 0.55 });

    const imageData = await this.processImage(imageFile);

    onProgress({ stage: "generating", progress: 0.8 });

    const startSec = Math.max(0, segmentStartSec ?? 0);
    const fallbackDuration = maxDurationSec ?? audioResult.duration - startSec;
    const requestedDuration =
      typeof segmentDurationSec === "number" ? segmentDurationSec : fallbackDuration;
    const availableDuration = Math.max(0, audioResult.duration - startSec);
    const segmentDuration = Math.max(0, Math.min(requestedDuration, availableDuration));

    const startFrame = Math.max(0, Math.floor(startSec * this.fps));
    const maxFrames = Math.max(1, Math.floor(segmentDuration * this.fps));
    const endFrame = Math.min(audioResult.totalFrames, startFrame + maxFrames);
    let trimmedFrames = audioResult.frames.slice(startFrame, endFrame);
    if (trimmedFrames.length === 0 && audioResult.frames.length > 0) {
      const fallbackFrame = audioResult.frames[Math.min(startFrame, audioResult.frames.length - 1)];
      trimmedFrames = [fallbackFrame];
    }
    const trimmedDuration = trimmedFrames.length / this.fps;

    let outputFrames = trimmedFrames;
    if (rhythmMode === "bpm") {
      const bpmValue = typeof bpm === "number" && bpm > 0 ? bpm : 120;
      outputFrames = this.generateBpmFrames(bpmValue, trimmedFrames.length);
    }

    if (startSec > 0 || segmentDuration < audioResult.duration - 0.01) {
      const slicedBuffer = this.sliceAudioBuffer(audioResult.decodedBuffer, startSec, trimmedDuration);
      const wavBuffer = this.audioBufferToWav(slicedBuffer);
      audioDataUrl = await this.arrayBufferToBase64(wavBuffer, "audio/wav");
    }

    const recipe: VideoRecipe = {
      version: "1.0",
      meta: {
        duration: trimmedDuration,
        fps: this.fps,
        width: this.width,
        height: this.height,
        totalFrames: trimmedFrames.length,
        title: title || this.getTitleFromAudio(audioFile),
      },
      audio: {
        source: audioDataUrl,
        sampleRate: audioResult.sampleRate,
      },
      image: {
        source: imageData.dataUrl,
        width: imageData.width,
        height: imageData.height,
      },
      frames: outputFrames,
      effects: effects || createDefaultEffects(),
    };

    const validation = validateRecipe(recipe);
    if (!validation.valid) {
      throw new Error(`Recipe validation failed: ${validation.errors.join(", ")}`);
    }

    onProgress({ stage: "complete", progress: 1 });
    return recipe;
  }

  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  private async processImage(imageFile: File | string): Promise<{ dataUrl: string; width: number; height: number }> {
    let dataUrl: string;
    if (typeof imageFile === "string") {
      dataUrl = imageFile;
    } else {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
        reader.readAsDataURL(imageFile);
      });
    }

    const img = await this.loadImage(dataUrl);
    const maxSize = 2048;
    let { width, height } = img;

    if (width > maxSize || height > maxSize) {
      const scale = maxSize / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas 2D context not available");
      }
      ctx.drawImage(img, 0, 0, width, height);
      dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    }

    return { dataUrl, width, height };
  }

  private generateBpmFrames(bpm: number, totalFrames: number) {
    const frames = new Array(totalFrames);
    const beatInterval = 60 / bpm;
    for (let i = 0; i < totalFrames; i += 1) {
      const time = i / this.fps;
      const phase = (time % beatInterval) / beatInterval;
      const pulse = Math.exp(-phase * 6);
      frames[i] = {
        low: Math.min(1, pulse),
        mid: Math.min(1, pulse * 0.7),
        high: Math.min(1, pulse * 0.5),
      };
    }
    return frames;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });
  }

  private arrayBufferToBase64(buffer: ArrayBuffer, mimeType?: string): Promise<string> {
    return new Promise((resolve) => {
      const blob = new Blob([buffer], mimeType ? { type: mimeType } : undefined);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  private sliceAudioBuffer(buffer: AudioBuffer, startSec: number, durationSec: number) {
    const sampleRate = buffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const endSample = Math.min(buffer.length, Math.floor((startSec + durationSec) * sampleRate));
    const frameCount = Math.max(1, endSample - startSample);
    const channels = buffer.numberOfChannels;

    const AudioContextCtor =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const context = AudioContextCtor ? new AudioContextCtor() : null;
    const sliced = context
      ? context.createBuffer(channels, frameCount, sampleRate)
      : new AudioBuffer({ length: frameCount, numberOfChannels: channels, sampleRate });

    for (let channel = 0; channel < channels; channel += 1) {
      const input = buffer.getChannelData(channel);
      const output = sliced.getChannelData(channel);
      output.set(input.slice(startSample, endSample));
    }

    if (context && "close" in context) {
      context.close();
    }

    return sliced;
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const samples = buffer.length;
    const blockAlign = (numChannels * bitDepth) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples * blockAlign;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i += 1) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples; i += 1) {
      for (let channel = 0; channel < numChannels; channel += 1) {
        const sample = buffer.getChannelData(channel)[i];
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  private getTitleFromAudio(audioFile: File | ArrayBuffer): string | undefined {
    if (audioFile instanceof File && audioFile.name) {
      const base = audioFile.name.replace(/\.[^/.]+$/, "");
      const trimmed = base.trim();
      return trimmed || undefined;
    }
    return undefined;
  }
}
