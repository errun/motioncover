"use client";

import { create } from "zustand";

type ParallaxStoreState = {
  audioReactive: boolean;
  audioIntensity: number;
  setAudioReactive: (value: boolean) => void;
  setAudioIntensity: (value: number) => void;
};

export const useParallaxStore = create<ParallaxStoreState>((set) => ({
  audioReactive: true,
  audioIntensity: 1,
  setAudioReactive: (value) => set({ audioReactive: value }),
  setAudioIntensity: (value) => set({ audioIntensity: value }),
}));
