/**
 * Parallax 视差动画模块类型定义
 */

export interface ParallaxState {
  // 图片状态
  originalImage: string | null;
  depthMap: string | null;
  isGeneratingDepth: boolean;
  depthMethod: "replicate" | "fallback" | "local" | null;

  // 🆕 图层分离
  foregroundLayer: string | null;    // 透明背景人物
  backgroundLayer: string | null;    // 补全后的纯背景
  isGeneratingLayers: boolean;
  layersReady: boolean;

  // 动画参数
  parallaxStrength: number;      // 视差强度 0-1
  cameraMotion: CameraMotionType;
  motionSpeed: number;           // 运动速度 0.1-2
  autoAnimate: boolean;          // 自动动画

  // 音频响应
  audioReactive: boolean;        // 是否响应音频
  audioIntensity: number;        // 音频影响强度 0-1

  // 导出
  isExporting: boolean;
  exportProgress: number;
}

export type CameraMotionType = 
  | "circular"      // 圆形轨道
  | "horizontal"    // 水平移动
  | "vertical"      // 垂直移动
  | "zoom"          // 推拉
  | "random"        // 随机漂移
  | "breathe";      // 呼吸效果

export interface ParallaxActions {
  // 图片操作
  setOriginalImage: (url: string | null) => void;
  setDepthMap: (url: string | null) => void;
  setIsGeneratingDepth: (loading: boolean) => void;
  setDepthMethod: (method: ParallaxState["depthMethod"]) => void;

  // 🆕 图层分离
  setForegroundLayer: (url: string | null) => void;
  setBackgroundLayer: (url: string | null) => void;
  setIsGeneratingLayers: (loading: boolean) => void;
  setLayersReady: (ready: boolean) => void;

  // 动画控制
  setParallaxStrength: (strength: number) => void;
  setCameraMotion: (motion: CameraMotionType) => void;
  setMotionSpeed: (speed: number) => void;
  setAutoAnimate: (auto: boolean) => void;

  // 音频响应
  setAudioReactive: (reactive: boolean) => void;
  setAudioIntensity: (intensity: number) => void;

  // 导出
  setIsExporting: (exporting: boolean) => void;
  setExportProgress: (progress: number) => void;

  // 重置
  reset: () => void;
}

export type ParallaxStore = ParallaxState & ParallaxActions;

// 相机运动预设
export const CAMERA_MOTION_PRESETS: Record<CameraMotionType, {
  name: string;
  description: string;
  icon: string;
}> = {
  circular: {
    name: "环绕",
    description: "相机沿圆形轨道移动",
    icon: "🔄",
  },
  horizontal: {
    name: "水平",
    description: "相机左右平移",
    icon: "↔️",
  },
  vertical: {
    name: "垂直",
    description: "相机上下移动",
    icon: "↕️",
  },
  zoom: {
    name: "推拉",
    description: "相机前后推拉",
    icon: "🔍",
  },
  random: {
    name: "随机",
    description: "相机随机漂移",
    icon: "🎲",
  },
  breathe: {
	    name: "Cinematic",
	    description: "iOS 3D / TikTok 风格 Ken Burns 推拉",
	    icon: "🎬",
  },
};

