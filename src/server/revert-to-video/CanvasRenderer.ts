import { createCanvas, loadImage } from "@napi-rs/canvas";

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
  private canvas: ReturnType<typeof createCanvas>;
  private ctx: ReturnType<typeof createCanvas>["getContext"];
  private image: Awaited<ReturnType<typeof loadImage>> | null = null;
  private coverParams: CoverParams | null = null;

  constructor(options: { width: number; height: number }) {
    this.width = options.width;
    this.height = options.height;
    this.canvas = createCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext("2d");
  }

  async loadImage(source: string) {
    this.image = await loadImage(source);
    this.calculateCoverParams();
  }

  private calculateCoverParams() {
    if (!this.image) return;
    const canvasAspect = this.width / this.height;
    const imageAspect = this.image.width / this.image.height;

    let drawWidth = this.width;
    let drawHeight = this.height;
    let offsetX = 0;
    let offsetY = 0;

    if (imageAspect > canvasAspect) {
      drawHeight = this.height;
      drawWidth = this.height * imageAspect;
      offsetX = (this.width - drawWidth) / 2;
    } else {
      drawWidth = this.width;
      drawHeight = this.width / imageAspect;
      offsetY = (this.height - drawHeight) / 2;
    }

    this.coverParams = { drawWidth, drawHeight, offsetX, offsetY };
  }

  renderFrame({ frameIndex, time, audioData, effects }: RenderParams) {
    const { low, high } = audioData;
    const ctx = this.ctx;

    ctx.fillStyle = "#000";
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

    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
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

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyBrightness(factor: number) {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * factor);
      data[i + 1] = Math.min(255, data[i + 1] * factor);
      data[i + 2] = Math.min(255, data[i + 2] * factor);
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyFilmGrain(time: number, amount: number) {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    const grainIntensity = amount * 255;
    const seed = Math.floor(time * 1000) % 10000;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (this.seededRandom(seed + i) - 0.5) * grainIntensity;
      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }

    this.ctx.putImageData(imageData, 0, 0);
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

    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
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

    this.ctx.putImageData(imageData, 0, 0);
  }

  dispose() {
    this.image = null;
    this.coverParams = null;
  }
}
