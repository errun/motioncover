/**
 * Parallax 视差动画模块
 *
 * 功能：
 * - 上传普通图片
 * - AI 自动分析深度
 * - 生成 2.5D 视差动画
 * - 支持音乐律动响应
 */

// Store
export { useParallaxStore } from "./store";

// Types
export * from "./types";

// Services
export {
  estimateDepth,
  buildDebugInfo,
  safeGenerateFallbackDepthMap,
  createRadialGradientDataUrl,
  generateLocalDepthMap,
  ZOEDEPTH_MODELS,
} from "./services";
export type { DepthEstimationResult, DepthDebugInfo } from "./services";

// Components
export * from "./components";

