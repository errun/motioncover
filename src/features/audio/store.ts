"use client";

import { create } from "zustand";
import type { AudioStoreState } from "./types";

const initialState = {
  bassEnergy: 0,
  frequencyData: null,
  isPlaying: false,
  audioContext: null,
  analyser: null,
  audioSource: null,
  audioFileUrl: null,
};

export const useAudioStore = create<AudioStoreState>((set) => ({
  ...initialState,
  setBassEnergy: (value) => set({ bassEnergy: value }),
  setFrequencyData: (data) => set({ frequencyData: data }),
  setIsPlaying: (value) => set({ isPlaying: value }),
  setAudioContext: (ctx) => set({ audioContext: ctx }),
  setAnalyser: (analyser) => set({ analyser }),
  setAudioSource: (source) => set({ audioSource: source }),
  setAudioFileUrl: (url) => set({ audioFileUrl: url }),
}));
