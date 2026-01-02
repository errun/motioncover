/**
 * Visualizer domain types.
 *
 * @module features/visualizer/types
 */

// =============================================================================
// Visualizer Parameters
// =============================================================================

export interface VisualizerParams {
  displacementScale: number;  // 3D INTENSITY (0-1)
  audioReactStrength: number; // BASS KICK (0-1)
  cameraShakeAmp: number;     // EARTHQUAKE (0-1)
  rgbShiftAmount: number;     // GLITCH LEVEL (0-1)
  vhsEnabled: boolean;
  scanlineIntensity: number;
  bloomStrength: number;      // NEON GLOW (0-1)
  zoomBlurStrength: number;   // IMPACT (0-1)
}

export interface ImageState {
  imageUrl: string | null;
  imageName: string;
  depthMapUrl: string | null;
  isGeneratingDepth: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  recordingProgress: number;
}

// =============================================================================
// Preset Types
// =============================================================================

export type PresetName =
  | "default"
  | "aggressive"
  | "chill"
  | "glitch"
  | "minimal"
  | "earthquake";

export interface PresetConfig {
  label: string;
  params: VisualizerParams;
}

// =============================================================================
// Export Types
// =============================================================================

export type ExportDuration = 5 | 10 | 15 | 30;

export interface ExportConfig {
  duration: ExportDuration;
  showWatermark: boolean;
  format: "webm" | "mp4";
  fps: number;
}

// =============================================================================
// Store Types
// =============================================================================

export interface VisualizerStoreState extends
  ImageState,
  VisualizerParams,
  RecordingState {
  // Preset
  currentPreset: PresetName;

  // Actions - Image
  setImageUrl: (url: string | null) => void;
  setImageName: (name: string) => void;
  setDepthMapUrl: (url: string | null) => void;
  setIsGeneratingDepth: (value: boolean) => void;

  // Actions - Parameters
  setDisplacementScale: (value: number) => void;
  setAudioReactStrength: (value: number) => void;
  setCameraShakeAmp: (value: number) => void;
  setRgbShiftAmount: (value: number) => void;
  setVhsEnabled: (value: boolean) => void;
  setScanlineIntensity: (value: number) => void;
  setBloomStrength: (value: number) => void;
  setZoomBlurStrength: (value: number) => void;

  // Actions - Recording
  setIsRecording: (value: boolean) => void;
  setRecordingProgress: (value: number) => void;

  // Actions - Preset
  applyPreset: (name: PresetName) => void;
  resetParameters: () => void;
}

// =============================================================================
// DevTool Types
// =============================================================================

export interface DevToolState {
  isOpen: boolean;
  fps: number;
  frameTime: number;
  particleCount: number;
}
