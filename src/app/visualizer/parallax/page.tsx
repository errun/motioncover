"use client";

/**
 * 2.5D 视差动画页面
 * 上传图片 → AI 深度分析 → 视差动态效果 → 音乐律动
 */

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import {
  useParallaxStore,
  ParallaxMesh,
  ControlPanel,
  ImageUploader,
} from "@/features/parallax";
import { AudioPlayer } from "@/features/visualizer/components";

function ParallaxScene() {
  const { originalImage, depthMap } = useParallaxStore();

  if (!originalImage || !depthMap) {
    return (
      <mesh>
        <planeGeometry args={[4, 6]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
    );
  }

  return <ParallaxMesh imageUrl={originalImage} depthMapUrl={depthMap} />;
}

function DepthMapPreview() {
  const { depthMap, originalImage, depthMethod } = useParallaxStore();

  if (!depthMap || !originalImage) return null;

  const methodLabel =
    depthMethod === "replicate"
      ? "ZoeDepth (Replicate)"
      : depthMethod === "local"
      ? "本地伪深度图"
      : depthMethod === "fallback"
      ? "服务器占位渐变 (fallback)"
      : "未知来源";

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-zinc-400">深度图预览</div>
        <div className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-2 py-0.5">
          来源：{methodLabel}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <img src={originalImage} alt="Original" className="w-full rounded" />
          <div className="text-xs text-zinc-500 mt-1 text-center">原图</div>
        </div>
        <div>
          <img src={depthMap} alt="Depth" className="w-full rounded" />
          <div className="text-xs text-zinc-500 mt-1 text-center">深度图</div>
        </div>
      </div>
    </div>
  );
}

export default function ParallaxPage() {
  const { originalImage, depthMap, audioReactive } = useParallaxStore();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-green-500">🎬</span> 2.5D 视差动画
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            上传图片，AI 自动生成深度图，创建动态视差效果
          </p>
        </div>
        <Link
          href="/visualizer"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
        >
          ← 返回
        </Link>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* 左侧控制面板 */}
        <aside className="w-80 border-r border-zinc-800 p-4 overflow-y-auto">
          {/* 图片上传 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">📷 上传图片</h3>
            <ImageUploader />
            <DepthMapPreview />
          </div>

          {/* 控制选项 */}
          {originalImage && depthMap && (
            <>
              <div className="border-t border-zinc-700 pt-4 mb-4">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">⚙️ 动画控制</h3>
                <ControlPanel />
              </div>

              {/* 音频播放器 (当启用音频响应时) */}
              {audioReactive && (
                <div className="border-t border-zinc-700 pt-4">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-3">🎵 音频</h3>
                  <AudioPlayer />
                </div>
              )}
            </>
          )}
        </aside>

        {/* 右侧预览区 */}
        <main className="flex-1 bg-zinc-900 relative">
          {!originalImage ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <div className="text-6xl mb-4">🖼️</div>
                <div>上传一张图片开始</div>
              </div>
            </div>
          ) : (
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <Suspense fallback={null}>
                <color attach="background" args={["#0a0a0a"]} />
                <ParallaxScene />
              </Suspense>
            </Canvas>
          )}

          {/* 提示 */}
          {originalImage && depthMap && (
            <div className="absolute bottom-4 left-4 text-xs text-zinc-500 bg-black/50 px-3 py-1 rounded">
              深度图会使画面产生 2.5D 视差效果
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

