/*
Audio feature types.
*/

export interface AudioAnalysisState {
  bassEnergy: number;
  frequencyData: Uint8Array | null;
  isPlaying: boolean;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  audioSource: MediaElementAudioSourceNode | null;
  audioFileUrl: string | null;
}

export interface AudioAnalysisConfig {
  fftSize: number;
  bassMinFreq: number;
  bassMaxFreq: number;
  smoothingFactor: number;
}

export interface AudioActions {
  setBassEnergy: (value: number) => void;
  setFrequencyData: (data: Uint8Array | null) => void;
  setIsPlaying: (value: boolean) => void;
  setAudioContext: (ctx: AudioContext | null) => void;
  setAnalyser: (analyser: AnalyserNode | null) => void;
  setAudioSource: (source: MediaElementAudioSourceNode | null) => void;
  setAudioFileUrl: (url: string | null) => void;
}

export type AudioStoreState = AudioAnalysisState & AudioActions;
