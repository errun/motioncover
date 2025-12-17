/**
 * Visualizer 业务域导出
 * 
 * @module features/visualizer
 */

// Store
export {
  useVisualizerStore,
  useAudioStore, // backward compatibility
  PRESETS,
  defaultParams,
  lerp,
  clamp,
} from './store';

// Types
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
} from './types';

