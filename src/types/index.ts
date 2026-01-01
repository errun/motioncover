/**
 * Central type definitions for the MotionCover application
 * @module types
 */

// =============================================================================
// Re-export from Feature Modules (Single Source of Truth)
// =============================================================================

// Visualizer Types - 从 feature 模块导出
export type {
  AudioAnalysisState,
  AudioAnalysisConfig,
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

// Parallax Types - 从 feature 模块导出
export type {
  ParallaxState,
  ParallaxActions,
  ParallaxStore,
  CameraMotionType,
} from "@/features/parallax/types";

// =============================================================================
// Re-export from Services (Single Source of Truth)
// =============================================================================

// Spotify 业务类型 - 从 services 导出
export type {
  SpotifyTrack,
  TrackInfo,
  CanvasInfo,
  CanvasApiResponse,
  SearchResult,
} from "@/services/spotifyService";

// API 响应类型 - 从 lib 导出
export type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from "@/lib/apiResponse";

