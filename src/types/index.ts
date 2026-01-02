/**
 * Central type definitions for the MotionCover application.
 * @module types
 */

// =============================================================================
// Re-export from Feature Modules (Single Source of Truth)
// =============================================================================

// Audio Types
export type {
  AudioAnalysisState,
  AudioAnalysisConfig,
  AudioStoreState,
  AudioActions,
} from "@/features/audio/types";

// Visualizer Types
export type {
  VisualizerParams,
  ImageState,
  RecordingState,
  PresetName,
  PresetConfig,
  ExportDuration,
  ExportConfig,
  VisualizerStoreState,
  DevToolState,
} from "@/features/visualizer/types";

// Parallax Types
export type {
  ParallaxState,
  ParallaxActions,
  ParallaxStore,
  CameraMotionType,
} from "@/features/parallax/types";

// =============================================================================
// Re-export from Services (Single Source of Truth)
// =============================================================================

export type {
  SpotifyTrack,
  TrackInfo,
  CanvasInfo,
  CanvasApiResponse,
  SearchResult,
} from "@/services/spotifyService";

export type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from "@/lib/apiResponse";
