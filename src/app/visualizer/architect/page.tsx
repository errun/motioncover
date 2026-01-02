"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { LayeredAnimator, useParallaxStore } from "@/features/parallax";
import { AudioPlayer } from "@/features/visualizer/components";
import { useAudioStore } from "@/features/audio";

type ArchitectResult = {
  imageUrl: string;
  dataUrl: string;
  prompt: string;
  debug?: {
    steps: string[];
    elapsedMs: number;
  };
};

type LayerResult = {
  foregroundUrl: string;
  backgroundUrl: string;
  maskUrl?: string;
  debug?: string[];
};

const DEFAULT_PROMPT =
  "A vertical street level view of a cyberpunk city. In the immediate center foreground, a single futuristic sports car is positioned clearly. Neon signs glow in the background, and towering skyscrapers fill the distance. The image is rendered in a distinct sharp flat composition style with extremely clear visual separation between the car and the background layers. Crisp, hard outlines define the car's edges. Strong rim lighting highlights the silhouette of the vehicle. High contrast lighting with a synthwave color palette of neon pinks, purples, and blues. Graphic novel aesthetic, sharp focus, no volumetric fog. 4K resolution, highly detailed, intricate textures, masterpiece, best quality, ultra-sharp.";

export default function ArchitectPage() {
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  const [architectResult, setArchitectResult] = useState<ArchitectResult | null>(
    null
  );
  const [layers, setLayers] = useState<LayerResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLayering, setIsLayering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layerDebug, setLayerDebug] = useState<string[]>([]);
  const [layerElapsed, setLayerElapsed] = useState(0);
  const [debugSolidBackground, setDebugSolidBackground] = useState(false);
  const [showForeground, setShowForeground] = useState(true);
  const [debugPlainMaterials, setDebugPlainMaterials] = useState(false);
  const { audioFileUrl } = useAudioStore();
  const {
    audioReactive,
    audioIntensity,
    setAudioReactive,
    setAudioIntensity,
  } = useParallaxStore();

  useEffect(() => {
    setAudioReactive(true);
    setAudioIntensity(1);
  }, [setAudioReactive, setAudioIntensity]);

  useEffect(() => {
    if (!isLayering) {
      setLayerElapsed(0);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setLayerElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isLayering]);

  const canAnimate =
    !!layers?.foregroundUrl && !!layers?.backgroundUrl && !!audioFileUrl;

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setLayers(null);

      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = (await res.json()) as ArchitectResult;

      if (!res.ok) {
        if (data?.debug?.steps) setLayerDebug(data.debug.steps);
        const detail = (data as unknown as { error?: string })?.error || "Unknown error";
        throw new Error(`Surgeon request failed: ${res.status} ${detail}`);
      }
      setArchitectResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLayer = async () => {
    if (!architectResult?.dataUrl) return;

    try {
      setIsLayering(true);
      setError(null);
      setLayerDebug([]);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 150000);

      const res = await fetch("/api/layers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: architectResult.dataUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.debug) setLayerDebug(data.debug);
        const detail = data?.error || "Unknown error";
        throw new Error(`Surgeon request failed: ${res.status} ${detail}`);
      }

      if (!data) {
        throw new Error("Surgeon response is empty");
      }
      setLayers({
        foregroundUrl: data.foregroundUrl,
        backgroundUrl: data.backgroundUrl,
        maskUrl: data.maskUrl,
        debug: data.debug,
      });
      if (data.debug) setLayerDebug(data.debug);
    } catch (err) {
      const message = String(err).includes("AbortError")
        ? "Surgeon request timed out. Check REPLICATE_API_TOKEN and network access."
        : String(err);
      setError(message);
    } finally {
      setIsLayering(false);
    }
  };

  const handleLoadLatestLayers = async () => {
    setError(null);
    try {
      const res = await fetch(`/imgs/latest.json?ts=${Date.now()}`);
      if (!res.ok) {
        throw new Error("Missing imgs/latest.json. Generate layers first.");
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("latest.json not reachable. Check middleware allowlist.");
      }
      const data = (await res.json()) as {
        layerForeground?: string;
        layerBackground?: string;
        layerMask?: string;
      };
      if (!data.layerForeground || !data.layerBackground) {
        throw new Error("latest.json missing layerForeground/layerBackground.");
      }
      setLayers({
        foregroundUrl: data.layerForeground,
        backgroundUrl: data.layerBackground,
        maskUrl: data.layerMask,
      });
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            MOTIONCOVER LAB
          </p>
          <h1 className="text-2xl font-bold mt-1">
            功能 3 · AI Architect / Surgeon
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            第一步用 FLUX 1.1 Pro 生成高质量赛博朋克底图，第二步用 AI 自动分离前景人物与背景，为后续多层视差动效做准备。
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm text-zinc-300 border border-zinc-700 transition-colors"
        >
          ← 返回首页
        </Link>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Controls */}
        <aside className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 space-y-6 overflow-y-auto">
          {/* Step 1: Architect */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-200 mb-2">
              🧠 第一步：The Architect · 生成高质量底图
            </h2>
            <p className="text-xs text-zinc-500 mb-3">
              使用 FLUX 1.1 Pro 生成构图清晰、层次分明的赛博朋克城市图像。提示词强调 flat composition 和 distinct layers，方便后续 AI 分层。
            </p>

            <label className="block text-xs text-zinc-400 mb-1">
              提示词（可按需微调）
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-28 text-xs bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-200 resize-none focus:outline-none focus:border-purple-500/70"
            />

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-3 w-full phonk-btn text-sm py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? "[ 生成中... ]" : "[ 用 FLUX 生成赛博朋克底图 ]"}
            </button>

            {architectResult?.debug && (
              <p className="mt-2 text-[10px] text-zinc-600">
                耗时约 {Math.round(architectResult.debug.elapsedMs / 1000)}s
              </p>
            )}
          </section>

          {/* Step 2: Surgeon */}
          <section className="border-t border-zinc-800 pt-4">
            <h2 className="text-sm font-semibold text-zinc-200 mb-2">
              💡 第二步：The Surgeon · AI 智能分层
            </h2>
            <p className="text-xs text-zinc-500 mb-3">
              使用服务端的 rembg + LaMa 管线，将前景人物抠出并补全背景。当前版本先实现「前景人物层」+「纯背景层」两张图。
            </p>

            <button
              onClick={handleLayer}
              disabled={!architectResult || isLayering}
              className="w-full phonk-btn text-sm py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLayering ? "[ 分层中... ]" : "[ 对当前底图执行智能分层 ]"}
            </button>

            {!architectResult && (
              <p className="mt-2 text-[11px] text-zinc-600">
                提示：请先完成第 1 步生成一张底图，再执行智能分层。
              </p>
            )}
            {isLayering && (
              <p className="mt-2 text-[11px] text-zinc-500">
                ??????? {layerElapsed}s????? 1-3 ??
              </p>
            )}
            {layerDebug.length > 0 && (
              <div className="mt-2 text-[11px] text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded p-2 max-h-36 overflow-y-auto">
                {layerDebug.map((msg, i) => (
                  <div key={i}>- {msg}</div>
                ))}
              </div>
            )}
          </section>

          {/* Step 3: Animator */}
          <section className="border-t border-zinc-800 pt-4">
            <h2 className="text-sm font-semibold text-zinc-200 mb-2">
              Step 3: The Animator · WebGL + Shader Magic
            </h2>
            <p className="text-xs text-zinc-500 mb-3">
              Load two layers onto parallel planes and drive shader uniforms
              from audio (uBass/uMid/uHigh).
            </p>

            <AudioPlayer />

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={audioReactive}
                  onChange={(e) => setAudioReactive(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-black"
                />
                <span>Enable audio reactivity</span>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={debugSolidBackground}
                  onChange={(e) => setDebugSolidBackground(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-black"
                />
                <span>Debug green background</span>
              </label>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showForeground}
                  onChange={(e) => setShowForeground(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-black"
                />
                <span>Show foreground layer</span>
              </label>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={debugPlainMaterials}
                  onChange={(e) => setDebugPlainMaterials(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-black"
                />
                <span>Debug basic materials</span>
              </label>
            </div>

            <button
              onClick={handleLoadLatestLayers}
              className="mt-3 w-full phonk-btn text-sm py-2"
            >
              Load latest layers from /public/imgs
            </button>

            {audioReactive && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Intensity</span>
                  <span>{Math.round(audioIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={audioIntensity}
                  onChange={(e) => setAudioIntensity(parseFloat(e.target.value))}
                  className="w-full accent-green-500"
                />
              </div>
            )}

            {!layers && (
              <p className="mt-2 text-[11px] text-zinc-600">
                Finish Step 2 to get foreground/background layers for WebGL.
              </p>
            )}
            {!audioFileUrl && (
              <p className="mt-1 text-[11px] text-zinc-600">
                Upload music to activate the shader-driven lighting.
              </p>
            )}

            <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
              Smart threshold glow highlights bright neon areas with bass hits.
              Mid frequencies add flowing highlights, and highs trigger glitch
              flicker on the foreground layer.
            </p>
          </section>

          {error && (
            <div className="border border-red-500/50 bg-red-500/10 text-xs text-red-400 rounded-md px-3 py-2 mt-2 whitespace-pre-wrap">
              {error}
            </div>
          )}
        </aside>

        {/* Right: Preview */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Original / Architect output */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
              <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Architect · 原图预览</span>
                {architectResult && (
                  <span className="text-[10px] text-zinc-600">FLUX 1.1 Pro</span>
                )}
              </div>
              <div className="aspect-[2/3] flex items-center justify-center bg-zinc-900">
                {architectResult ? (
                  // 使用 dataUrl 避免跨域问题
                  <img
                    src={architectResult.dataUrl}
                    alt="Architect output"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-zinc-600 text-center px-4">
                    还没有生成图片。
                    <br />
                    在左侧填写或使用默认提示词，点击「用 FLUX 生成赛博朋克底图」。
                  </div>
                )}
              </div>
            </div>

            {/* Foreground layer */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
              <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Surgeon · 前景人物层</span>
              </div>
              <div className="aspect-[2/3] flex items-center justify-center bg-zinc-900">
                {layers?.foregroundUrl ? (
                  <img
                    src={layers.foregroundUrl}
                    alt="Foreground layer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-zinc-600 text-center px-4">
                    分层完成后，这里会显示带透明背景的前景人物层。
                  </div>
                )}
              </div>
            </div>

            {/* Background layer */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
              <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Surgeon · 纯背景层</span>
              </div>
              <div className="aspect-[2/3] flex items-center justify-center bg-zinc-900">
                {layers?.backgroundUrl ? (
                  <img
                    src={layers.backgroundUrl}
                    alt="Background layer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-zinc-600 text-center px-4">
                    分层完成后，这里会显示自动补全后的纯背景图层。
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
            <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
              <span>The Animator · WebGL Preview</span>
              <span className="text-[10px] text-zinc-600">
                {canAnimate ? "Audio linked" : "Waiting for layers/audio"}
              </span>
            </div>
            <div className="h-[420px] bg-black">
              {canAnimate ? (
                <Canvas camera={{ position: [0, 0, 2], fov: 45 }}>
                  <color attach="background" args={["#000000"]} />
                  <ambientLight intensity={0.6} />
                  <Suspense fallback={null}>
                    <LayeredAnimator
                      foregroundUrl={layers!.foregroundUrl}
                      backgroundUrl={layers!.backgroundUrl}
                      debugSolidBackground={debugSolidBackground}
                      showForeground={showForeground}
                      debugPlainMaterials={debugPlainMaterials}
                    />
                  </Suspense>
                </Canvas>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-sm px-6 text-center">
                  Complete Step 2 and upload music to start the WebGL animator.
                </div>
              )}
            </div>
            <div className="px-3 py-2 text-[11px] text-zinc-500 border-t border-zinc-800">
              uBass drives global glow, uMid adds flowing highlights, uHigh
              triggers glitch flicker.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
