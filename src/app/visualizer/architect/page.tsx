"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import {
  AutoCameraRig,
  LayeredAnimator,
  SpeedParticles,
  useParallaxStore,
} from "@/features/parallax";
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
  layers?: string[];
  method?: "rembg" | "qwen";
};

const DEFAULT_PROMPT =
  "A vertical street level view of a cyberpunk city. The ONLY foreground subject is a single futuristic sports car centered in the frame. Clean open roadway in front of the car. No street lamps, no poles, no wires, no traffic lights, no foreground signs. Neon signs glow only in the background, and towering skyscrapers fill the distance. The image is rendered in a distinct sharp flat composition style with extremely clear visual separation between the car (foreground) and the city (background). Crisp, hard outlines define the car's edges. Strong rim lighting highlights the silhouette of the vehicle. High contrast lighting with a synthwave color palette of neon pinks and blues. Graphic novel aesthetic, sharp focus, no volumetric fog. 4K resolution, highly detailed, intricate textures, ultra-sharp.";
const LAYER_TIMEOUT_MS = 240000;
const LAYER_TIMEOUT_SECONDS = Math.round(LAYER_TIMEOUT_MS / 1000);
const QWEN_LAYER_COUNT = 4;

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
  const [layerMethod, setLayerMethod] = useState<"rembg" | "qwen">("rembg");
  const [debugSolidBackground, setDebugSolidBackground] = useState(false);
  const [showForeground, setShowForeground] = useState(true);
  const [debugPlainMaterials, setDebugPlainMaterials] = useState(false);
  const [enableCameraDrift, setEnableCameraDrift] = useState(true);
  const [enableCameraShake, setEnableCameraShake] = useState(true);
  const [enableAutoCameraRig, setEnableAutoCameraRig] = useState(true);
  const [enableSpeedParticles, setEnableSpeedParticles] = useState(true);
  const [debugCameraThreshold, setDebugCameraThreshold] = useState(false);
  const [debugCameraThresholdValue, setDebugCameraThresholdValue] = useState(0.5);
  const { audioFileUrl, bassEnergy, isPlaying } = useAudioStore();
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

  const effectiveBass = audioReactive && isPlaying ? bassEnergy * audioIntensity : 0;
  const prodThreshold = 0.7;
  const debugThreshold = Math.min(0.95, Math.max(0.1, debugCameraThresholdValue));
  const activeThreshold = debugCameraThreshold ? debugThreshold : prodThreshold;
  const bassPercent = Math.round(Math.min(1, effectiveBass) * 100);
  const isAboveThreshold = effectiveBass >= activeThreshold;

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
      const timeoutId = setTimeout(() => controller.abort(), LAYER_TIMEOUT_MS);

      const res = await fetch("/api/layers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: architectResult.dataUrl,
          method: layerMethod,
          numLayers: layerMethod === "qwen" ? QWEN_LAYER_COUNT : undefined,
        }),
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
        layers: data.layers,
        method: data.method,
      });
      if (data.debug) setLayerDebug(data.debug);
    } catch (err) {
      const message = String(err).includes("AbortError")
        ? `分层请求超时（${LAYER_TIMEOUT_SECONDS}s）。模型队列可能拥堵，请稍后重试或检查 REPLICATE_API_TOKEN/网络。`
        : String(err);
      setError(message);
    } finally {
      setIsLayering(false);
    }
  };

  const handleLoadLatestLayers = async () => {
    setError(null);
    try {
      const res = await fetch(`/imgs/history.json?ts=${Date.now()}`);
      if (!res.ok) {
        throw new Error("Missing imgs/history.json. Generate layers first.");
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("history.json not reachable. Check middleware allowlist.");
      }
      const data = (await res.json()) as {
        layerRuns?: Array<{
          foreground?: string;
          background?: string;
          mask?: string;
          layers?: string[];
          method?: string;
        }>;
      };
      const runs = Array.isArray(data.layerRuns) ? data.layerRuns : [];
      const candidates = runs.filter((run) => run.foreground && run.background);
      if (candidates.length === 0) {
        throw new Error("history.json has no usable layer runs yet.");
      }
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      setLayers({
        foregroundUrl: pick.foreground!,
        backgroundUrl: pick.background!,
        maskUrl: pick.mask || undefined,
        layers: pick.layers,
        method: pick.method === "qwen" ? "qwen" : "rembg",
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

            <div className="mb-3 space-y-1 text-[11px] text-zinc-400">
              <div className="flex items-center justify-between gap-2">
                <span>Layering mode</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLayerMethod("rembg")}
                    disabled={isLayering}
                    className={`px-2 py-1 border rounded ${
                      layerMethod === "rembg"
                        ? "bg-zinc-800 text-zinc-100 border-zinc-600"
                        : "bg-transparent text-zinc-400 border-zinc-700"
                    }`}
                  >
                    rembg + LaMa
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayerMethod("qwen")}
                    disabled={isLayering}
                    className={`px-2 py-1 border rounded ${
                      layerMethod === "qwen"
                        ? "bg-zinc-800 text-zinc-100 border-zinc-600"
                        : "bg-transparent text-zinc-400 border-zinc-700"
                    }`}
                  >
                    qwen-image-layered
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500">
                Qwen returns {QWEN_LAYER_COUNT} layers (first = foreground, last = background).
              </p>
            </div>

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

            <div className="mt-3 text-xs text-zinc-400">
              <div className="text-[11px] text-zinc-500 mb-2">Camera effects</div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={enableAutoCameraRig}
                  onChange={(e) => setEnableAutoCameraRig(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-black"
                />
                <span>Auto camera rig</span>
              </label>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={enableCameraDrift}
                  onChange={(e) => setEnableCameraDrift(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-black"
                />
                <span>Base drift (Lissajous)</span>
              </label>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={enableCameraShake}
                  onChange={(e) => setEnableCameraShake(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-black"
                />
                <span>Bass shake (&gt;= 70%)</span>
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={debugCameraThreshold}
                  onChange={(e) => setDebugCameraThreshold(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-black"
                />
                <span>Debug threshold overlay</span>
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={enableSpeedParticles}
                  onChange={(e) => setEnableSpeedParticles(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-black"
                />
                <span>Speed particles</span>
              </label>
              {debugCameraThreshold && (
                <div className="mt-2 text-[11px] text-zinc-500">
                  <div className="flex items-center justify-between mb-2">
                    <span>Debug threshold</span>
                    <span>{Math.round(debugThreshold * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={0.9}
                    step={0.05}
                    value={debugThreshold}
                    onChange={(e) => setDebugCameraThresholdValue(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 mb-2"
                  />
                  <div className="flex items-center justify-between mb-1">
                    <span>Effective bass</span>
                    <span className={isAboveThreshold ? "text-green-400" : "text-zinc-400"}>
                      {bassPercent}%
                    </span>
                  </div>
                  <div className="relative h-2 bg-zinc-900 border border-zinc-700 rounded overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-500/80"
                      style={{ left: `${debugThreshold * 100}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-px bg-zinc-600"
                      style={{ left: `${prodThreshold * 100}%` }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${bassPercent}%`,
                        background: isAboveThreshold ? "#22c55e" : "#3b82f6",
                        transition: "width 80ms linear",
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-600">
                    Debug {Math.round(debugThreshold * 100)}% / Prod 70%
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLoadLatestLayers}
              className="mt-3 w-full phonk-btn text-sm py-2"
            >
              Load random layers from /public/imgs
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
            <div className="h-[60vh] min-h-[520px] bg-black">
              {canAnimate ? (
                <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
                  <color attach="background" args={["#000000"]} />
                  <ambientLight intensity={0.6} />
                  {enableAutoCameraRig && (
                    <AutoCameraRig
                      enableDrift={enableCameraDrift}
                      enableShake={enableCameraShake}
                      shakeThreshold={prodThreshold}
                      debugThreshold={debugCameraThreshold}
                      debugThresholdValue={debugThreshold}
                    />
                  )}
                  {enableSpeedParticles && <SpeedParticles />}
                  <Suspense fallback={null}>
                    <LayeredAnimator
                      foregroundUrl={layers!.foregroundUrl}
                      backgroundUrl={layers!.backgroundUrl}
                      debugSolidBackground={debugSolidBackground}
                      showForeground={showForeground}
                      debugPlainMaterials={debugPlainMaterials}
                      foregroundPivot="bottom-center"
                      foregroundScaleMultiplier={1.18}
                      foregroundZOffset={0.05}
                      foregroundRenderOrder={10}
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
