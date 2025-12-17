import { create } from "zustand";

// Preset type definition
export type PresetName = "default" | "aggressive" | "chill" | "glitch" | "minimal" | "earthquake";

// Default parameters
const defaultParams = {
  displacementScale: 0.5,
  audioReactStrength: 0.7,
  cameraShakeAmp: 0.3,
  rgbShiftAmount: 0.5,
  vhsEnabled: true,
  scanlineIntensity: 0.1,
};

interface AudioState {
  // Audio Analysis
  bassEnergy: number;
  frequencyData: Uint8Array | null;
  isPlaying: boolean;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  audioSource: MediaElementAudioSourceNode | null;

  // Image State
  imageUrl: string | null;
  imageName: string;
  depthMapUrl: string | null;
  isGeneratingDepth: boolean;

  // Control Parameters (Phonk UI)
  displacementScale: number; // 3D INTENSITY
  audioReactStrength: number; // BASS KICK
  cameraShakeAmp: number; // EARTHQUAKE
  rgbShiftAmount: number; // GLITCH LEVEL

  // VHS Effects
  vhsEnabled: boolean;
  scanlineIntensity: number;

  // Recording State
  isRecording: boolean;
  recordingProgress: number;

  // Actions
  setBassEnergy: (value: number) => void;
  setFrequencyData: (data: Uint8Array | null) => void;
  setIsPlaying: (value: boolean) => void;
  setAudioContext: (ctx: AudioContext | null) => void;
  setAnalyser: (analyser: AnalyserNode | null) => void;
  setAudioSource: (source: MediaElementAudioSourceNode | null) => void;

  // Image Actions
  setImageUrl: (url: string | null) => void;
  setImageName: (name: string) => void;
  setDepthMapUrl: (url: string | null) => void;
  setIsGeneratingDepth: (value: boolean) => void;

  // Parameter Setters
  setDisplacementScale: (value: number) => void;
  setAudioReactStrength: (value: number) => void;
  setCameraShakeAmp: (value: number) => void;
  setRgbShiftAmount: (value: number) => void;
  setVhsEnabled: (value: boolean) => void;
  setScanlineIntensity: (value: number) => void;

  // Recording Setters
  setIsRecording: (value: boolean) => void;
  setRecordingProgress: (value: number) => void;

  // Preset
  currentPreset: PresetName;
  applyPreset: (name: PresetName) => void;

  // Reset
  resetParameters: () => void;
}

export interface Preset {
  name: PresetName;
  label: string;
  params: typeof defaultParams;
}

export const PRESETS: Record<PresetName, Preset> = {
  default: {
    name: "default",
    label: "DEFAULT",
    params: defaultParams,
  },
  aggressive: {
    name: "aggressive",
    label: "AGGRESSIVE",
    params: {
      displacementScale: 0.9,
      audioReactStrength: 1.0,
      cameraShakeAmp: 0.7,
      rgbShiftAmount: 0.8,
      vhsEnabled: true,
      scanlineIntensity: 0.2,
    },
  },
  chill: {
    name: "chill",
    label: "CHILL",
    params: {
      displacementScale: 0.3,
      audioReactStrength: 0.4,
      cameraShakeAmp: 0.1,
      rgbShiftAmount: 0.2,
      vhsEnabled: false,
      scanlineIntensity: 0.05,
    },
  },
  glitch: {
    name: "glitch",
    label: "GLITCH",
    params: {
      displacementScale: 0.6,
      audioReactStrength: 0.8,
      cameraShakeAmp: 0.4,
      rgbShiftAmount: 1.0,
      vhsEnabled: true,
      scanlineIntensity: 0.25,
    },
  },
  minimal: {
    name: "minimal",
    label: "MINIMAL",
    params: {
      displacementScale: 0.2,
      audioReactStrength: 0.3,
      cameraShakeAmp: 0.0,
      rgbShiftAmount: 0.0,
      vhsEnabled: false,
      scanlineIntensity: 0.0,
    },
  },
  earthquake: {
    name: "earthquake",
    label: "EARTHQUAKE",
    params: {
      displacementScale: 0.7,
      audioReactStrength: 0.9,
      cameraShakeAmp: 1.0,
      rgbShiftAmount: 0.6,
      vhsEnabled: true,
      scanlineIntensity: 0.15,
    },
  },
};

export const useAudioStore = create<AudioState>((set) => ({
  // Initial State
  bassEnergy: 0,
  frequencyData: null,
  isPlaying: false,
  audioContext: null,
  analyser: null,
  audioSource: null,
  imageUrl: null,
  imageName: "Default Cover",
  depthMapUrl: null,
  isGeneratingDepth: false,
  isRecording: false,
  recordingProgress: 0,
  currentPreset: "default" as PresetName,
  ...defaultParams,

  // Actions
  setBassEnergy: (value) => set({ bassEnergy: value }),
  setFrequencyData: (data) => set({ frequencyData: data }),
  setIsPlaying: (value) => set({ isPlaying: value }),
  setAudioContext: (ctx) => set({ audioContext: ctx }),
  setAnalyser: (analyser) => set({ analyser }),
  setAudioSource: (source) => set({ audioSource: source }),

  // Image Actions
  setImageUrl: (url) => set({ imageUrl: url, depthMapUrl: null }), // Reset depth when image changes
  setImageName: (name) => set({ imageName: name }),
  setDepthMapUrl: (url) => set({ depthMapUrl: url }),
  setIsGeneratingDepth: (value) => set({ isGeneratingDepth: value }),

  // Parameter Setters
  setDisplacementScale: (value) => set({ displacementScale: value, currentPreset: "default" }),
  setAudioReactStrength: (value) => set({ audioReactStrength: value, currentPreset: "default" }),
  setCameraShakeAmp: (value) => set({ cameraShakeAmp: value, currentPreset: "default" }),
  setRgbShiftAmount: (value) => set({ rgbShiftAmount: value, currentPreset: "default" }),
  setVhsEnabled: (value) => set({ vhsEnabled: value }),
  setScanlineIntensity: (value) => set({ scanlineIntensity: value }),

  // Recording Setters
  setIsRecording: (value) => set({ isRecording: value }),
  setRecordingProgress: (value) => set({ recordingProgress: value }),

  // Preset
  applyPreset: (name) => set({ ...PRESETS[name].params, currentPreset: name }),

  // Reset
  resetParameters: () => set({ ...defaultParams, currentPreset: "default" }),
}));

// Helper: Lerp function for smooth transitions
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

// Helper: Clamp function
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

