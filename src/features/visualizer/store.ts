/**
 * Visualizer state store.
 *
 * @module features/visualizer/store
 */

import { create } from "zustand";
import type { PresetName, VisualizerParams, VisualizerStoreState } from "./types";

export const defaultParams: VisualizerParams = {
  displacementScale: 0.5,
  audioReactStrength: 0.7,
  cameraShakeAmp: 0.3,
  rgbShiftAmount: 0.5,
  vhsEnabled: true,
  scanlineIntensity: 0.1,
  bloomStrength: 0.4,
  zoomBlurStrength: 0.0,
};

export const PRESETS: Record<PresetName, { label: string; params: VisualizerParams }> = {
  default: {
    label: "DEFAULT",
    params: defaultParams,
  },
  aggressive: {
    label: "AGGRESSIVE",
    params: {
      displacementScale: 0.9,
      audioReactStrength: 1.0,
      cameraShakeAmp: 0.7,
      rgbShiftAmount: 0.8,
      vhsEnabled: true,
      scanlineIntensity: 0.2,
      bloomStrength: 0.6,
      zoomBlurStrength: 0.5,
    },
  },
  chill: {
    label: "CHILL",
    params: {
      displacementScale: 0.3,
      audioReactStrength: 0.4,
      cameraShakeAmp: 0.1,
      rgbShiftAmount: 0.2,
      vhsEnabled: false,
      scanlineIntensity: 0.05,
      bloomStrength: 0.8,
      zoomBlurStrength: 0.0,
    },
  },
  glitch: {
    label: "GLITCH",
    params: {
      displacementScale: 0.6,
      audioReactStrength: 0.8,
      cameraShakeAmp: 0.4,
      rgbShiftAmount: 1.0,
      vhsEnabled: true,
      scanlineIntensity: 0.25,
      bloomStrength: 0.3,
      zoomBlurStrength: 0.2,
    },
  },
  minimal: {
    label: "MINIMAL",
    params: {
      displacementScale: 0.2,
      audioReactStrength: 0.3,
      cameraShakeAmp: 0.0,
      rgbShiftAmount: 0.0,
      vhsEnabled: false,
      scanlineIntensity: 0.0,
      bloomStrength: 0.1,
      zoomBlurStrength: 0.0,
    },
  },
  earthquake: {
    label: "EARTHQUAKE",
    params: {
      displacementScale: 0.7,
      audioReactStrength: 0.9,
      cameraShakeAmp: 1.0,
      rgbShiftAmount: 0.6,
      vhsEnabled: true,
      scanlineIntensity: 0.15,
      bloomStrength: 0.5,
      zoomBlurStrength: 0.8,
    },
  },
};

export const useVisualizerStore = create<VisualizerStoreState>((set) => ({
  imageUrl: null,
  imageName: "Default Cover",
  depthMapUrl: null,
  isGeneratingDepth: false,

  isRecording: false,
  recordingProgress: 0,

  currentPreset: "default" as PresetName,

  ...defaultParams,

  setImageUrl: (url) => set({ imageUrl: url, depthMapUrl: null }),
  setImageName: (name) => set({ imageName: name }),
  setDepthMapUrl: (url) => set({ depthMapUrl: url }),
  setIsGeneratingDepth: (value) => set({ isGeneratingDepth: value }),

  setDisplacementScale: (value) => set({ displacementScale: value, currentPreset: "default" }),
  setAudioReactStrength: (value) => set({ audioReactStrength: value, currentPreset: "default" }),
  setCameraShakeAmp: (value) => set({ cameraShakeAmp: value, currentPreset: "default" }),
  setRgbShiftAmount: (value) => set({ rgbShiftAmount: value, currentPreset: "default" }),
  setVhsEnabled: (value) => set({ vhsEnabled: value }),
  setScanlineIntensity: (value) => set({ scanlineIntensity: value }),
  setBloomStrength: (value) => set({ bloomStrength: value, currentPreset: "default" }),
  setZoomBlurStrength: (value) => set({ zoomBlurStrength: value, currentPreset: "default" }),

  setIsRecording: (value) => set({ isRecording: value }),
  setRecordingProgress: (value) => set({ recordingProgress: value }),

  applyPreset: (name) => set({ ...PRESETS[name].params, currentPreset: name }),
  resetParameters: () => set({ ...defaultParams, currentPreset: "default" }),
}));

export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
