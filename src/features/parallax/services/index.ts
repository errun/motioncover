/**
 * Depth 服务入口
 * @module features/parallax/services
 */

import type { DepthEstimationResult, DepthDebugInfo } from "./types";
import { safeGenerateFallbackDepthMap } from "./fallback";
import { callZoeDepthWithTimeout, ZOEDEPTH_MODELS } from "./replicate";

export type { DepthEstimationResult, DepthDebugInfo };
export { safeGenerateFallbackDepthMap, createRadialGradientDataUrl } from "./fallback";
export { callZoeDepthWithTimeout, ZOEDEPTH_MODELS } from "./replicate";
export { generateLocalDepthMap } from "./localDepthGenerator";

const MAX_WAIT_MS = 60_000;

/**
 * 构建 debug 信息
 */
export function buildDebugInfo(
  phase: string,
  startTime: number,
  steps: string[]
): DepthDebugInfo {
  return {
    phase,
    elapsedMs: Date.now() - startTime,
    steps,
  };
}

/**
 * 估算深度图
 * 优先使用 Replicate ZoeDepth，失败时回退到本地生成
 */
export async function estimateDepth(
  imageBase64: string
): Promise<DepthEstimationResult> {
  const startTime = Date.now();
  const debugSteps: string[] = [];
  const push = (msg: string) => debugSteps.push(msg);

  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    push("未配置 REPLICATE_API_TOKEN，使用 fallback");
    const fallbackUrl = await safeGenerateFallbackDepthMap(imageBase64);
    return {
      depthMapUrl: fallbackUrl,
      method: "fallback",
      error: "REPLICATE_API_TOKEN not configured",
      debug: buildDebugInfo("fallback", startTime, debugSteps),
    };
  }

  // 尝试所有模型
  for (const model of ZOEDEPTH_MODELS) {
    try {
      push(`尝试模型: ${model.name}`);
      const url = await callZoeDepthWithTimeout(
        imageBase64,
        token,
        MAX_WAIT_MS,
        debugSteps,
        model.version,
        model.extraInput
      );
      return {
        depthMapUrl: url,
        method: "replicate",
        model: model.name,
        debug: buildDebugInfo("replicate", startTime, debugSteps),
      };
    } catch (err) {
      push(`模型 ${model.name} 失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 所有模型都失败，使用 fallback
  push("所有 Replicate 模型失败，使用 fallback");
  const fallbackUrl = await safeGenerateFallbackDepthMap(imageBase64);
  return {
    depthMapUrl: fallbackUrl,
    method: "fallback",
    error: "All Replicate models failed",
    debug: buildDebugInfo("fallback", startTime, debugSteps),
  };
}

