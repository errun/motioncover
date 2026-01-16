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
    onProgress = () => {},
  }: {
    audioFile: File | ArrayBuffer;
    imageFile: File | string;
    effects?: EffectConfig;
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

    const recipe: VideoRecipe = {
      version: "1.0",
      meta: {
        duration: audioResult.duration,
        fps: this.fps,
        width: this.width,
        height: this.height,
        totalFrames: audioResult.totalFrames,
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
      frames: audioResult.frames,
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

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
    return new Promise((resolve) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
}
