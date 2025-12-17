/**
 * Central type definitions for the MotionCover application
 * @module types
 */

// =============================================================================
// Audio Types
// =============================================================================

export interface AudioAnalysisState {
  bassEnergy: number;
  frequencyData: Uint8Array | null;
  isPlaying: boolean;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  audioSource: MediaElementAudioSourceNode | null;
}

export interface AudioAnalysisConfig {
  fftSize: number;
  bassMinFreq: number;
  bassMaxFreq: number;
  smoothingFactor: number;
}

// =============================================================================
// Visualizer Types
// =============================================================================

export interface VisualizerParams {
  displacementScale: number;  // 3D INTENSITY (0-1)
  audioReactStrength: number; // BASS KICK (0-1)
  cameraShakeAmp: number;     // EARTHQUAKE (0-1)
  rgbShiftAmount: number;     // GLITCH LEVEL (0-1)
  vhsEnabled: boolean;
  scanlineIntensity: number;
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
  name: string;
  description: string;
  params: Partial<VisualizerParams>;
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
// Canvas/Spotify Types (for downloader feature)
// =============================================================================

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  canvas_url?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
}

export interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

export interface CanvasData {
  trackId: string;
  trackName: string;
  artistName: string;
  canvasUrl: string;
  coverUrl: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DepthMapResponse {
  depthMapUrl: string;
  method: "replicate" | "fallback";
  error?: string;
}

