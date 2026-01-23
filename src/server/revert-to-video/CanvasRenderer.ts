// Dynamic import to avoid build errors when @napi-rs/canvas is not available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let canvasModule: any = null;

async function getCanvasModule() {
  if (!canvasModule) {
    try {
      canvasModule = await import("@napi-rs/canvas");
    } catch {
      throw new Error(
        "Video rendering is not available in this environment. " +
        "@napi-rs/canvas is required but not installed."
      );
    }
  }
  return canvasModule as {
    createCanvas: (width: number, height: number) => Canvas;
    loadImage: (source: string) => Promise<Image>;
  };
}

// Minimal type definitions for the canvas module
interface Canvas {
  width: number;
  height: number;
  getContext(type: "2d"): CanvasRenderingContext2D;
}

interface Image {
  width: number;
  height: number;
}

interface CanvasRenderingContext2D {
  fillStyle: string;
  filter?: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  drawImage(image: Image, x: number, y: number, w: number, h: number): void;
  getImageData(x: number, y: number, w: number, h: number): ImageData;
  putImageData(data: ImageData, x: number, y: number): void;
}

type CoverParams = {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
};

type RenderParams = {
  frameIndex: number;
  time: number;
  audioData: { low: number; mid: number; high: number };
  effects: {
    breathing?: { scale?: number };
    chromaticAberration?: { intensity?: number };
    filmGrain?: { amount?: number };
    vignette?: { strength?: number };
  };
};

export class CanvasRenderer {
  private width: number;
  private height: number;
  private canvas: Canvas | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private image: Image | null = null;
  private coverParams: CoverParams | null = null;
  private containParams: CoverParams | null = null;
  private backdropColor = "#000";
  private initialized = false;

  constructor(options: { width: number; height: number }) {
    this.width = options.width;
    this.height = options.height;
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    const { createCanvas } = await getCanvasModule();
    this.canvas = createCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext("2d");
    this.initialized = true;
  }

  async loadImage(source: string) {
    await this.ensureInitialized();
    const { loadImage } = await getCanvasModule();
    this.image = await loadImage(source);
    await this.calculateCoverParams();
  }

  private async calculateCoverParams() {
    if (!this.image) return;
    const canvasAspect = this.width / this.height;
    const imageAspect = this.image.width / this.image.height;

    let coverWidth = this.width;
    let coverHeight = this.height;
    let coverOffsetX = 0;
    let coverOffsetY = 0;

    if (imageAspect > canvasAspect) {
      coverHeight = this.height;
      coverWidth = this.height * imageAspect;
      coverOffsetX = (this.width - coverWidth) / 2;
    } else {
      coverWidth = this.width;
      coverHeight = this.width / imageAspect;
      coverOffsetY = (this.height - coverHeight) / 2;
    }

    let containWidth = this.width;
    let containHeight = this.height;
    let containOffsetX = 0;
    let containOffsetY = 0;

    if (imageAspect > canvasAspect) {
      containWidth = this.width;
      containHeight = this.width / imageAspect;
      containOffsetY = (this.height - containHeight) / 2;
    } else {
      containHeight = this.height;
      containWidth = this.height * imageAspect;
      containOffsetX = (this.width - containWidth) / 2;
    }

    this.coverParams = {
      drawWidth: coverWidth,
      drawHeight: coverHeight,
      offsetX: coverOffsetX,
      offsetY: coverOffsetY,
    };
    this.containParams = {
      drawWidth: containWidth,
      drawHeight: containHeight,
      offsetX: containOffsetX,
      offsetY: containOffsetY,
    };
    this.backdropColor = await this.computeAverageColor();
  }

  private async computeAverageColor() {
    if (!this.image) return "#000";
    const { createCanvas } = await getCanvasModule();
    const sampleCanvas = createCanvas(8, 8);
    const sampleCtx = sampleCanvas.getContext("2d");
    sampleCtx.drawImage(this.image, 0, 0, 8, 8);
    const data = sampleCtx.getImageData(0, 0, 8, 8).data;
    let r = 0;
    let g = 0;
    let b = 0;
    const total = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    const avgR = Math.round(r / total);
    const avgG = Math.round(g / total);
    const avgB = Math.round(b / total);
    return `rgb(${avgR}, ${avgG}, ${avgB})`;
  }

  renderFrame({ frameIndex, time, audioData, effects }: RenderParams) {
    if (!this.ctx) {
      throw new Error("CanvasRenderer not initialized. Call loadImage first.");
    }
    const { low, high } = audioData;
    const ctx = this.ctx;
    const isLetterbox = this.height > this.width && this.coverParams && this.containParams;

    ctx.fillStyle = this.backdropColor;
    ctx.fillRect(0, 0, this.width, this.height);

    const breathScale = 1 + low * (effects.breathing?.scale || 0.15);
    const wave = Math.sin(time * 0.5) * low * 0.02;
    const totalScale = breathScale + wave;

    if (this.image && this.coverParams) {
      ctx.save();
      ctx.translate(this.width / 2, this.height / 2);
      ctx.scale(totalScale, totalScale);
      ctx.translate(-this.width / 2, -this.height / 2);
      const { drawWidth, drawHeight, offsetX, offsetY } = this.coverParams;
      ctx.drawImage(this.image, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();
    }

    if (this.image && isLetterbox && this.containParams) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(0, 0, this.width, this.height);

      const contain = this.containParams;
      const blurScale = 1.04;
      const blurWidth = contain.drawWidth * blurScale;
      const blurHeight = contain.drawHeight * blurScale;
      const blurX = contain.offsetX - (blurWidth - contain.drawWidth) / 2;
      const blurY = contain.offsetY - (blurHeight - contain.drawHeight) / 2;

      ctx.save();
      ctx.translate(this.width / 2, this.height / 2);
      ctx.scale(totalScale, totalScale);
      ctx.translate(-this.width / 2, -this.height / 2);

      if (typeof ctx.filter === "string") {
        ctx.filter = "blur(12px)";
      }
      ctx.drawImage(this.image, blurX, blurY, blurWidth, blurHeight);
      if (typeof ctx.filter === "string") {
        ctx.filter = "none";
      }
      ctx.drawImage(this.image, contain.offsetX, contain.offsetY, contain.drawWidth, contain.drawHeight);
      ctx.restore();
    }

    if (high > 0.01) {
      this.applyChromaticAberration(high, effects.chromaticAberration?.intensity || 1);
    }

    this.applyBrightness(1 + low * 0.8);
    this.applyFilmGrain(time, effects.filmGrain?.amount || 0.08);

    const vignetteStrength = (effects.vignette?.strength || 0.3) - low * 0.15;
    this.applyVignette(vignetteStrength);

    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    return Buffer.from(imageData.data.buffer);
  }

  private applyChromaticAberration(intensity: number, multiplier: number) {
    const baseFactor = 0.02 * 0.8;
    const offset = Math.round(intensity * baseFactor * this.width * multiplier);
    if (offset < 1) return;

    const imageData = this.ctx!.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const i = (y * this.width + x) * 4;
        const rX = Math.min(x + offset, this.width - 1);
        const rI = (y * this.width + rX) * 4;
        data[i] = tempData[rI];

        const bX = Math.max(x - offset, 0);
        const bI = (y * this.width + bX) * 4;
        data[i + 2] = tempData[bI + 2];
      }
    }

    this.ctx!.putImageData(imageData, 0, 0);
  }

  private applyBrightness(factor: number) {
    const imageData = this.ctx!.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * factor);
      data[i + 1] = Math.min(255, data[i + 1] * factor);
      data[i + 2] = Math.min(255, data[i + 2] * factor);
    }
    this.ctx!.putImageData(imageData, 0, 0);
  }

  private applyFilmGrain(time: number, amount: number) {
    const imageData = this.ctx!.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    const grainIntensity = amount * 255;
    const seed = Math.floor(time * 1000) % 10000;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (this.seededRandom(seed + i) - 0.5) * grainIntensity;
      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }

    this.ctx!.putImageData(imageData, 0, 0);
  }

  private seededRandom(seed: number) {
    const x = Math.sin(seed) * 43758.5453123;
    return x - Math.floor(x);
  }

  private applyVignette(strength: number) {
    if (strength <= 0) return;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    const imageData = this.ctx!.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const i = (y * this.width + x) * 4;
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const vignette = 1 - dist * strength;
        data[i] *= vignette;
        data[i + 1] *= vignette;
        data[i + 2] *= vignette;
      }
    }

    this.ctx!.putImageData(imageData, 0, 0);
  }

  dispose() {
    this.image = null;
    this.coverParams = null;
    this.containParams = null;
  }
}
