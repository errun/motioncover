/**
 * Audio Store
 * @deprecated 请使用 '@/features/visualizer' 中的 useVisualizerStore
 * 此文件仅用于向后兼容
 */

// Re-export everything from the new location
export {
  useVisualizerStore as useAudioStore,
  useVisualizerStore,
  PRESETS,
  defaultParams,
  lerp,
  clamp,
} from '@/features/visualizer/store';

export type { PresetName } from '@/features/visualizer/types';

// Legacy type alias
export type Preset = {
  name: string;
  label: string;
  params: {
    displacementScale: number;
    audioReactStrength: number;
    cameraShakeAmp: number;
    rgbShiftAmount: number;
    vhsEnabled: boolean;
    scanlineIntensity: number;
  };
};

