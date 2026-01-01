"use client";

/**
 * 图片上传组件 - 支持拖拽和点击上传
 */

import { useCallback, useState } from "react";
import { useParallaxStore } from "../store";

interface DepthDebugInfo {
  method?: "replicate" | "fallback" | "local" | null;
  phase?: string;
  elapsedMs?: number;
  steps?: string[];
  error?: string | null;
}

async function generateDepthMap(
  imageBase64: string
): Promise<{ url: string; method: string; debug?: DepthDebugInfo; error?: string }>
{
  const response = await fetch("/api/depth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to generate depth map: ${response.status} ${text}`);
  }
  
  const data = await response.json();
  return {
    url: data.depthMapUrl,
    method: data.method,
    debug: data.debug,
    error: data.error,
  };
}

export function ImageUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DepthDebugInfo | null>(null);
  const {
    originalImage,
    setOriginalImage,
    setDepthMap,
    setIsGeneratingDepth,
    setDepthMethod,
    isGeneratingDepth,
  } = useParallaxStore();

  const processImage = useCallback(async (file: File) => {
    // 读取文件为 base64
    const reader = new FileReader();
	    reader.onload = async (e) => {
	      const base64 = e.target?.result as string;
	      setOriginalImage(base64);
	      setDebugInfo(null);
	      
	      // 生成深度图
	      setIsGeneratingDepth(true);
	      try {
	        const { url, method, debug, error } = await generateDepthMap(base64);
	        setDepthMap(url);
	        setDepthMethod(method as "replicate" | "fallback" | "local");

	        setDebugInfo({
	          ...(debug ?? {}),
	          method: method as DepthDebugInfo["method"],
	          error: (error as string | undefined) ?? null,
	        });
	      } catch (error) {
	        console.error("Depth map generation failed:", error);
	        // 使用本地生成
	        const { generateLocalDepthMap } = await import("../services/localDepthGenerator");
	        const localDepth = await generateLocalDepthMap(base64);
	        setDepthMap(localDepth);
	        setDepthMethod("local");

	        setDebugInfo({
	          method: "local",
	          phase: "local-fallback",
	          error: String(error),
	          steps: [
	            "调用 /api/depth 失败，已退回到前端本地伪深度图",
	            String(error),
	          ],
	        });
	      } finally {
	        setIsGeneratingDepth(false);
	      }
	    };
    reader.readAsDataURL(file);
  }, [setOriginalImage, setDepthMap, setIsGeneratingDepth, setDepthMethod]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processImage(file);
    }
  }, [processImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  if (originalImage) {
    return (
      <div className="relative">
        <img
          src={originalImage}
          alt="Uploaded"
          className="w-full h-48 object-cover rounded-lg"
        />
        <button
          onClick={() => {
            setOriginalImage(null);
            setDepthMap(null);
            setDepthMethod(null);
            setDebugInfo(null);
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white"
        >
          ✕
        </button>
        {isGeneratingDepth && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
            <div className="text-center px-4">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <div className="text-sm text-white">正在生成深度图...</div>
              <div className="text-[11px] text-zinc-400 mt-1">
                首次调用可能需要 30~90 秒（模型冷启动）
              </div>
            </div>
          </div>
        )}

        {/* 调试日志 */}
        {debugInfo && (
          <div className="mt-3 rounded-lg bg-zinc-900/80 border border-zinc-700 p-3 text-xs text-zinc-200 max-h-40 overflow-auto">
            <div className="flex items-center justify-between mb-1">
              <div className="font-medium text-zinc-100">调试日志</div>
              {typeof debugInfo.elapsedMs === "number" && (
                <div className="text-[10px] text-zinc-500">
                  耗时：{Math.round(debugInfo.elapsedMs)} ms
                </div>
              )}
            </div>
            {debugInfo.method && (
              <div className="mb-1 text-[11px] text-zinc-400">
                使用通路：
                {debugInfo.method === "replicate"
                  ? "ZoeDepth (Replicate)"
                  : debugInfo.method === "fallback"
                  ? "服务器占位渐变 (fallback)"
                  : "本地伪深度图"}
              </div>
            )}
            {debugInfo.error && (
              <div className="mb-1 text-[11px] text-red-400 break-all">
                错误：{debugInfo.error}
              </div>
            )}
            {(debugInfo.steps ?? []).map((line, idx) => (
              <div
                key={idx}
                className="text-[11px] text-zinc-400 whitespace-pre-wrap break-words"
              >
                {idx + 1}. {line}
              </div>
            ))}
            {!debugInfo.steps?.length && !debugInfo.error && (
              <div className="text-[11px] text-zinc-500">暂无详细步骤</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
        isDragging
          ? "border-green-500 bg-green-500/10"
          : "border-zinc-700 hover:border-zinc-600"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
      />
      <label htmlFor="image-upload" className="cursor-pointer">
        <div className="text-4xl mb-3">📷</div>
        <div className="text-zinc-300 font-medium">
          拖拽图片到这里
        </div>
        <div className="text-zinc-500 text-sm mt-1">
          或点击选择文件 (JPG, PNG)
        </div>
      </label>
    </div>
  );
}

