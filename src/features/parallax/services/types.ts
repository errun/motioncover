/**
 * Depth 服务类型定义
 * @module features/parallax/services/types
 */

export interface DepthDebugInfo {
  phase: string;
  elapsedMs: number;
  steps: string[];
}

export interface DepthEstimationResult {
  depthMapUrl: string;
  method: "replicate" | "fallback";
  model?: string;
  error?: string;
  debug: DepthDebugInfo;
}

export interface ZoeDepthModel {
  name: string;
  version: string;
  extraInput: Record<string, unknown>;
}

export interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  urls?: {
    get?: string;
  };
}

