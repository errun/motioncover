"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import {
	  useParallaxStore,
	  ParallaxMesh,
	  ImageUploader,
	  LayeredAnimator,
	} from "@/features/parallax";
import { AudioPlayer } from "@/features/visualizer/components";
import { useVisualizerStore } from "@/features/visualizer";

function Cover25DScene() {
	  const {
	    originalImage,
	    depthMap,
	    foregroundLayer,
	    backgroundLayer,
	    layersReady,
	  } = useParallaxStore();
	  const { audioFileUrl } = useVisualizerStore();

	  const canUseAnimator =
	    !!audioFileUrl &&
	    layersReady &&
	    !!foregroundLayer &&
	    !!backgroundLayer;

	  if (!originalImage || !depthMap) {
	    return (
	      <mesh>
	        <planeGeometry args={[4, 4]} />
	        <meshBasicMaterial color="#111827" />
	      </mesh>
	    );
	  }

	  if (canUseAnimator) {
	    return (
	      <LayeredAnimator
	        foregroundUrl={foregroundLayer!}
	        backgroundUrl={backgroundLayer!}
	      />
	    );
	  }

	  return <ParallaxMesh imageUrl={originalImage} depthMapUrl={depthMap} />;
	}

function CoverDepthPreview() {
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

// 计算高频能量
function calculateHighFreq(freqData: Uint8Array | null): number {
  if (!freqData || freqData.length === 0) return 0;
  const highStart = Math.floor(freqData.length * 0.5);
  let sum = 0;
  for (let i = highStart; i < freqData.length; i++) {
    sum += freqData[i];
  }
  return sum / ((freqData.length - highStart) * 255);
}

// 计算 Snare 能量（2-5kHz 范围）
function calculateSnareEnergy(freqData: Uint8Array | null): number {
  if (!freqData || freqData.length === 0) return 0;
  const snareStart = Math.floor(freqData.length * 0.25);
  const snareEnd = Math.floor(freqData.length * 0.5);
  let sum = 0;
  for (let i = snareStart; i < snareEnd; i++) {
    sum += freqData[i];
  }
  return sum / ((snareEnd - snareStart) * 255);
}

// 实时音频能量显示组件 - Anyma 幻觉版
function BassEnergyMeter() {
  const { bassEnergy, isPlaying, frequencyData } = useVisualizerStore();
  const { audioReactive, audioIntensity } = useParallaxStore();

  const scaledBass = audioReactive && isPlaying ? bassEnergy * audioIntensity : 0;
  const highFreq = audioReactive && isPlaying ? calculateHighFreq(frequencyData) * audioIntensity : 0;
  const snareEnergy = audioReactive && isPlaying ? calculateSnareEnergy(frequencyData) * audioIntensity : 0;

  // 阈值门限: 30%
  const THRESHOLD = 0.3;
  const gatedBass = scaledBass > THRESHOLD
    ? (scaledBass - THRESHOLD) / (1 - THRESHOLD)
    : 0;

  // 判断当前状态
  const isIdle = gatedBass < 0.1;
  const isBuildUp = gatedBass >= 0.1 && gatedBass < 0.7;
  const isDrop = gatedBass >= 0.7;
  const isSnareHit = snareEnergy > 0.4;

  return (
    <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
      <div className="text-xs text-zinc-400 mb-2">🎬 Anyma 幻觉版调试面板</div>

      {/* 状态指示器 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
          isDrop ? 'bg-red-500 text-white animate-pulse' :
          isBuildUp ? 'bg-yellow-500 text-black' :
          'bg-zinc-700 text-zinc-400'
        }`}>
          {isDrop ? '💥 DROP' : isBuildUp ? '📈 BUILD-UP' : '🌙 IDLE'}
        </div>
        {isSnareHit && (
          <div className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500 text-white animate-pulse">
            🥁 SNARE
          </div>
        )}
        <span className="text-xs text-zinc-500">
          {isPlaying ? '播放中' : '已停止'}
        </span>
      </div>

      {/* Kick → Camera Zoom */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-zinc-500">🎯 Kick → Camera Zoom</span>
          <span className="text-zinc-400 font-mono">{(gatedBass * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-zinc-900 rounded overflow-hidden relative">
          <div className="absolute left-[70%] top-0 bottom-0 w-px bg-red-500/50" title="DROP 阈值" />
          <div
            className="h-full"
            style={{
              width: `${Math.min(gatedBass * 100, 100)}%`,
              background: isDrop ? '#ef4444' : isBuildUp ? '#f59e0b' : '#22c55e',
              boxShadow: isDrop ? '0 0 10px #ef4444' : 'none',
              transition: 'width 30ms'
            }}
          />
        </div>
      </div>

      {/* 🆕 Snare → 变异效果 */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-zinc-500">🥁 Snare → 变异/Glitch</span>
          <span className="text-zinc-400 font-mono">{(snareEnergy * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-zinc-900 rounded overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${Math.min(snareEnergy * 100, 100)}%`,
              background: snareEnergy > 0.5 ? '#a855f7' : '#8b5cf6',
              boxShadow: snareEnergy > 0.5 ? '0 0 8px #a855f7' : 'none',
              transition: 'width 30ms'
            }}
          />
        </div>
      </div>

      {/* 高频 → RGB 色差 */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-zinc-500">🌈 高频 → RGB 色差</span>
          <span className="text-zinc-400 font-mono">{(highFreq * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-zinc-900 rounded overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${Math.min(highFreq * 100, 100)}%`,
              background: 'linear-gradient(90deg, #ef4444, #22c55e, #3b82f6)',
              transition: 'width 30ms'
            }}
          />
        </div>
      </div>

      {/* 效果说明 */}
      <div className="text-xs text-zinc-600 mt-3 space-y-1 border-t border-zinc-700 pt-2">
        <div>💓 呼吸感：低音时画面向内收缩</div>
        <div>🌟 边缘光：背景颜色"种"到人物边缘</div>
        <div>📷 震动：DROP 时相机剧烈抖动</div>
        <div className="text-purple-400">🆕 变异：Snare 时人物扭曲 + 噪点 + 像素化</div>
      </div>

      {!isPlaying && (
        <p className="text-xs text-yellow-500/70 mt-2">
          ⚠️ 请上传音乐并点击 PLAY
        </p>
      )}
    </div>
  );
}

export default function Cover25DPage() {
  const {
    originalImage,
    depthMap,
    parallaxStrength,
    setParallaxStrength,
    audioReactive,
    setAudioReactive,
    audioIntensity,
    setAudioIntensity,
    setCameraMotion,
    setAutoAnimate,
    // 图层分离
    isGeneratingLayers,
    setIsGeneratingLayers,
    setForegroundLayer,
    setBackgroundLayer,
    setLayersReady,
    foregroundLayer,
    backgroundLayer,
    layersReady,
  } = useParallaxStore();
  // 来自 Visualizer 的全局音频状态：用于判断“音乐是否已上传”
  const { audioFileUrl } = useVisualizerStore();

  const [layerError, setLayerError] = useState<string | null>(null);
  const [layerDebug, setLayerDebug] = useState<string[]>([]);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);

  const hasCover = !!originalImage;
  const hasAudio = !!audioFileUrl;
  const canRunLayersAI = hasCover && hasAudio && !isGeneratingLayers;

  // 默认使用 Cinematic / Ken Burns 风格
  useEffect(() => {
    setCameraMotion("breathe");
    setAutoAnimate(true);
  }, [setCameraMotion, setAutoAnimate]);

  // 图层分离 API 调用：仅当封面 + 音乐都就绪时才允许触发
  const handleGenerateLayers = async () => {
    if (!originalImage || !audioFileUrl) {
      setLayerError("请先上传封面和音乐，再生成 AI 图层");
      return;
    }

    setIsGeneratingLayers(true);
    setLayerError(null);
    setLayerDebug([]);

    try {
      // 转换图片为 base64
      const response = await fetch(originalImage);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const res = await fetch("/api/layers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const data = await res.json();

      if (data.debug) {
        setLayerDebug(data.debug);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || "图层分离失败");
      }

      setForegroundLayer(data.foregroundUrl);
      setBackgroundLayer(data.backgroundUrl);
      setMaskUrl(data.maskUrl);
      setLayersReady(true);

    } catch (err) {
      setLayerError(String(err));
    } finally {
      setIsGeneratingLayers(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-green-500">🎬</span> 封面 2.5D 动画
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            上传一张封面图片，自动生成 iOS / TikTok 风格的 3D 照片动画
          </p>
        </div>
        <Link
          href="/visualizer/cover-25d"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
        >
          ← 返回
        </Link>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* 左侧：上传 + 极简控制 */}
        <aside className="w-80 border-r border-zinc-800 p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">📷 上传封面</h3>
            <ImageUploader />
            <CoverDepthPreview />
          </div>

          {/* 音频播放器：始终可见，不依赖图片上传 */}
          <div className="mb-6 border-t border-zinc-700 pt-4">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">🎵 上传音乐</h3>
            <AudioPlayer />
          </div>

          {originalImage && depthMap && (
            <>
              {/* 🆕 图层分离 */}
              <div className="border-t border-zinc-700 pt-4 mt-2">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  ✨ 图层分离（Pro）
                </h3>
                <p className="text-xs text-zinc-500 mb-3">
                  AI 提取人物 + 补全背景，获得更好的视差效果
                </p>

                {!layersReady ? (
                  <button
                    onClick={handleGenerateLayers}
                    disabled={!canRunLayersAI}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition ${
                      isGeneratingLayers
                        ? "bg-zinc-700 text-zinc-400 cursor-wait"
                        : "bg-purple-600 hover:bg-purple-500 text-white"
                    }`}
                  >
                    {isGeneratingLayers ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        处理中（约2-3分钟）...
                      </span>
                    ) : (
                      "🎨 开始图层分离"
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <span>✅</span> 图层分离完成
                    </div>

                    {/* 步骤 1: 抠图结果 */}
                    <div className="bg-zinc-900 p-2 rounded">
                      <div className="text-xs text-purple-400 mb-1">步骤 1: rembg 抠图</div>
                      {foregroundLayer && (
                        <div className="bg-zinc-800 p-1 rounded" style={{ backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px' }}>
                          <img src={foregroundLayer} alt="抠图结果" className="w-full rounded" />
                        </div>
                      )}
                      <span className="text-xs text-zinc-500">透明背景人物</span>
                    </div>

                    {/* 步骤 2: Mask */}
                    <div className="bg-zinc-900 p-2 rounded">
                      <div className="text-xs text-purple-400 mb-1">步骤 2: 生成 Mask</div>
                      {maskUrl && (
                        <img src={maskUrl} alt="Mask" className="w-full rounded border border-zinc-700" />
                      )}
                      <span className="text-xs text-zinc-500">黑白遮罩（白=人物区域）</span>
                    </div>

                    {/* 步骤 3: LaMa 擦除 */}
                    <div className="bg-zinc-900 p-2 rounded">
                      <div className="text-xs text-purple-400 mb-1">步骤 3: LaMa 擦除人物</div>
                      {backgroundLayer && (
                        <img src={backgroundLayer} alt="背景" className="w-full rounded border border-zinc-700" />
                      )}
                      <span className="text-xs text-zinc-500">用周围像素填充，纯背景</span>
                    </div>
                  </div>
                )}

                {layerError && (
                  <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                    {layerError}
                  </div>
                )}

                {layerDebug.length > 0 && isGeneratingLayers && (
                  <div className="mt-2 text-xs text-zinc-500 bg-zinc-900 p-2 rounded max-h-32 overflow-y-auto">
                    {layerDebug.map((msg, i) => (
                      <div key={i}>• {msg}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-700 pt-4 mt-2">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  🎛 视差 & 音频
                </h3>

                {/* 视差强度 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400">视差强度</span>
                    <span className="text-zinc-500">
                      {Math.round(parallaxStrength * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={parallaxStrength}
                    onChange={(e) =>
                      setParallaxStrength(parseFloat(e.target.value))
                    }
                    className="w-full accent-green-500"
                  />
                </div>

                {/* 音频响应开关 */}
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={audioReactive}
                      onChange={(e) => setAudioReactive(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 bg-black"
                    />
                    <span>启用音乐律动</span>
                  </label>
                </div>

                {/* 音频强度 */}
                {audioReactive && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">律动强度</span>
                      <span className="text-zinc-500">
                        {Math.round(audioIntensity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={audioIntensity}
                      onChange={(e) =>
                        setAudioIntensity(parseFloat(e.target.value))
                      }
                      className="w-full accent-green-500"
                    />
                  </div>
                )}

                {/* 实时 Bass 能量显示 - 调试用 */}
                <BassEnergyMeter />

              </div>

              <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
                提示：该模式默认使用 Cinematic / Ken Burns 相机运动，
                适合生成类似 iOS 3D 照片、TikTok 3D Photo 的封面动画。
              </p>
            </>
          )}
        </aside>

        {/* 右侧：预览区域 */}
        <main className="flex-1 bg-zinc-900 relative">
          {!originalImage ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <div className="text-6xl mb-4">🖼️</div>
                <div>上传一张封面图片开始</div>
              </div>
            </div>
          ) : (
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <Suspense fallback={null}>
                <color attach="background" args={["#020617"]} />
                <ambientLight intensity={0.8} />
                <directionalLight position={[2, 4, 5]} intensity={1.2} />
                <Cover25DScene />
              </Suspense>
            </Canvas>
          )}

          {originalImage && depthMap && (
            <div className="absolute bottom-4 left-4 text-xs text-zinc-500 bg-black/50 px-3 py-1 rounded">
              已启用深度图 2.5D 视差 + Cinematic 相机运动
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
