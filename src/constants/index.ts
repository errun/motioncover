/**
 * Central constants and configuration for the MotionCover application
 * @module constants
 */

import type { AudioAnalysisConfig } from "@/types";

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
// Visualizer - Re-export from Feature Module (Single Source of Truth)
// =============================================================================

export { PRESETS, defaultParams } from "@/features/visualizer/store";

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

