export type RecipeMeta = {
  duration: number;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
};

export type AudioSource = {
  source: string;
  sampleRate: number;
};

export type ImageSource = {
  source: string;
  width: number;
  height: number;
};

export type AudioFrame = {
  low: number;
  mid: number;
  high: number;
};

export type AudioMappingConfig = {
  globalGain: number;
  lowBaseGain: number;
  lowDynGain: number;
  midBaseGain: number;
  midDynGain: number;
  highBaseGain: number;
  highDynGain: number;
};

export type EffectConfig = {
  chromaticAberration: { intensity: number };
  filmGrain: { amount: number };
  breathing: { scale: number };
  vignette: { strength: number };
  audioMapping?: AudioMappingConfig;
};

export type VideoRecipe = {
  version: string;
  meta: RecipeMeta;
  audio: AudioSource;
  image: ImageSource;
  frames: AudioFrame[];
  effects: EffectConfig;
};

export function createDefaultEffects(): EffectConfig {
  return {
    chromaticAberration: { intensity: 1.0 },
    filmGrain: { amount: 0.08 },
    breathing: { scale: 0.15 },
    vignette: { strength: 0.3 },
    audioMapping: {
      globalGain: 0.75,
      lowBaseGain: 0.65,
      lowDynGain: 8.0,
      midBaseGain: 0.65,
      midDynGain: 7.0,
      highBaseGain: 0.65,
      highDynGain: 6.0,
    },
  };
}

export function validateRecipe(recipe: VideoRecipe): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!recipe.version) errors.push("Missing version");
  if (!recipe.meta) errors.push("Missing meta");
  if (!recipe.image?.source) errors.push("Missing image data");
  if (!recipe.frames || recipe.frames.length === 0) errors.push("Missing frames");

  if (recipe.meta) {
    if (recipe.meta.fps < 1 || recipe.meta.fps > 60) errors.push("FPS must be 1-60");
    if (recipe.meta.width < 100 || recipe.meta.width > 4096) errors.push("Width must be 100-4096");
    if (recipe.meta.height < 100 || recipe.meta.height > 4096) errors.push("Height must be 100-4096");
    if (recipe.meta.duration < 1 || recipe.meta.duration > 600) errors.push("Duration must be 1-600");
  }

  return { valid: errors.length === 0, errors };
}

export function quantizeFrames(frames: AudioFrame[]): Uint8Array {
  const data = new Uint8Array(frames.length * 3);
  for (let i = 0; i < frames.length; i += 1) {
    data[i * 3] = Math.round(frames[i].low * 255);
    data[i * 3 + 1] = Math.round(frames[i].mid * 255);
    data[i * 3 + 2] = Math.round(frames[i].high * 255);
  }
  return data;
}

export function dequantizeFrames(data: Uint8Array): AudioFrame[] {
  const frames: AudioFrame[] = [];
  for (let i = 0; i < data.length; i += 3) {
    frames.push({
      low: data[i] / 255,
      mid: data[i + 1] / 255,
      high: data[i + 2] / 255,
    });
  }
  return frames;
}
