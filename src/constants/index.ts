/**
 * Central constants and configuration for the MotionCover application
 * @module constants
 */

import type { AudioAnalysisConfig, PresetConfig, PresetName, VisualizerParams } from "@/types";

// =============================================================================
// Audio Analysis Constants
// =============================================================================

export const AUDIO_CONFIG: AudioAnalysisConfig = {
  fftSize: 256,
  bassMinFreq: 40,
  bassMaxFreq: 100,
  smoothingFactor: 0.1,
};

// =============================================================================
// Visualizer Default Parameters
// =============================================================================

export const DEFAULT_VISUALIZER_PARAMS: VisualizerParams = {
  displacementScale: 0.5,
  audioReactStrength: 0.7,
  cameraShakeAmp: 0.3,
  rgbShiftAmount: 0.5,
  vhsEnabled: true,
  scanlineIntensity: 0.1,
};

// =============================================================================
// Preset Configurations
// =============================================================================

export const PRESETS: Record<PresetName, PresetConfig> = {
  default: {
    name: "DEFAULT",
    description: "Balanced",
    params: {
      displacementScale: 0.5,
      audioReactStrength: 0.7,
      cameraShakeAmp: 0.3,
      rgbShiftAmount: 0.5,
    },
  },
  aggressive: {
    name: "AGGRESSIVE",
    description: "Maximum impact",
    params: {
      displacementScale: 0.9,
      audioReactStrength: 1.0,
      cameraShakeAmp: 0.8,
      rgbShiftAmount: 0.9,
    },
  },
  chill: {
    name: "CHILL",
    description: "Smooth vibes",
    params: {
      displacementScale: 0.3,
      audioReactStrength: 0.4,
      cameraShakeAmp: 0.1,
      rgbShiftAmount: 0.2,
    },
  },
  glitch: {
    name: "GLITCH",
    description: "Digital chaos",
    params: {
      displacementScale: 0.6,
      audioReactStrength: 0.8,
      cameraShakeAmp: 0.5,
      rgbShiftAmount: 1.0,
    },
  },
  minimal: {
    name: "MINIMAL",
    description: "Clean aesthetic",
    params: {
      displacementScale: 0.2,
      audioReactStrength: 0.3,
      cameraShakeAmp: 0.05,
      rgbShiftAmount: 0.1,
    },
  },
  earthquake: {
    name: "EARTHQUAKE",
    description: "Maximum shake",
    params: {
      displacementScale: 0.7,
      audioReactStrength: 0.9,
      cameraShakeAmp: 1.0,
      rgbShiftAmount: 0.6,
    },
  },
};

// =============================================================================
// Export Configuration
// =============================================================================

export const EXPORT_DURATIONS = [5, 10, 15, 30] as const;

export const EXPORT_CONFIG = {
  fps: 30,
  format: "video/webm" as const,
  videoBitsPerSecond: 5000000, // 5 Mbps
};

// =============================================================================
// Theme / Design System Constants
// =============================================================================

export const PHONK_COLORS = {
  acid: "#39FF14",
  purple: "#B026FF",
  red: "#FF003C",
  background: "#0a0a0a",
  surface: "#111111",
  border: "#333333",
} as const;

// =============================================================================
// 3D Rendering Constants
// =============================================================================

export const THREE_CONFIG = {
  cameraFov: 50,
  cameraPosition: [0, 0, 5] as const,
  planeWidth: 4,
  planeHeight: 7,
  particleCount: {
    bass: 100,
    fire: 80,
    glow: 50,
    smoke: 40,
  },
};

// =============================================================================
// Placeholder Assets
// =============================================================================

export const PLACEHOLDER_COVER = "/placeholder-cover.svg";

