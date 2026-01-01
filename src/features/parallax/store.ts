"use client";

import { create } from "zustand";
import type { ParallaxStore, CameraMotionType } from "./types";

const initialState = {
  // 图片状态
  originalImage: null as string | null,
  depthMap: null as string | null,
  isGeneratingDepth: false,
  depthMethod: null as "replicate" | "fallback" | "local" | null,

  // 图层分离
  foregroundLayer: null as string | null,
  backgroundLayer: null as string | null,
  isGeneratingLayers: false,
  layersReady: false,

  // 动画参数
  parallaxStrength: 0.5,
  cameraMotion: "breathe" as CameraMotionType,
  motionSpeed: 1,
  autoAnimate: true,

  // 音频响应
  audioReactive: true,
  audioIntensity: 1,

  // 导出
  isExporting: false,
  exportProgress: 0,
};

export const useParallaxStore = create<ParallaxStore>((set) => ({
  ...initialState,

  // 图片操作
  setOriginalImage: (url) => set({ originalImage: url }),
  setDepthMap: (url) => set({ depthMap: url }),
  setIsGeneratingDepth: (loading) => set({ isGeneratingDepth: loading }),
  setDepthMethod: (method) => set({ depthMethod: method }),

  // 图层分离
  setForegroundLayer: (url) => set({ foregroundLayer: url }),
  setBackgroundLayer: (url) => set({ backgroundLayer: url }),
  setIsGeneratingLayers: (loading) => set({ isGeneratingLayers: loading }),
  setLayersReady: (ready) => set({ layersReady: ready }),

  // 动画控制
  setParallaxStrength: (strength) => set({ parallaxStrength: strength }),
  setCameraMotion: (motion) => set({ cameraMotion: motion }),
  setMotionSpeed: (speed) => set({ motionSpeed: speed }),
  setAutoAnimate: (auto) => set({ autoAnimate: auto }),

  // 音频响应
  setAudioReactive: (value) => set({ audioReactive: value }),
  setAudioIntensity: (value) => set({ audioIntensity: value }),

  // 导出
  setIsExporting: (exporting) => set({ isExporting: exporting }),
  setExportProgress: (progress) => set({ exportProgress: progress }),

  // 重置
  reset: () => set(initialState),
}));
