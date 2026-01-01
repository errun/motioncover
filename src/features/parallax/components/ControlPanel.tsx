"use client";

/**
 * 视差动画控制面板
 */

import { useParallaxStore } from "../store";
import { CAMERA_MOTION_PRESETS, type CameraMotionType } from "../types";

export function ControlPanel() {
  const {
    parallaxStrength,
    setParallaxStrength,
    cameraMotion,
    setCameraMotion,
    motionSpeed,
    setMotionSpeed,
    autoAnimate,
    setAutoAnimate,
    audioReactive,
    setAudioReactive,
    audioIntensity,
    setAudioIntensity,
    depthMethod,
    isGeneratingDepth,
  } = useParallaxStore();

  return (
    <div className="space-y-6">
      {/* 深度图状态 */}
      <div className="bg-zinc-800/50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">深度图状态</span>
          {isGeneratingDepth ? (
            <span className="text-yellow-500 text-sm animate-pulse">生成中...</span>
          ) : depthMethod ? (
            <span className="text-green-500 text-sm">
              ✓ {depthMethod === "replicate" ? "AI 生成" : "本地生成"}
            </span>
          ) : (
            <span className="text-zinc-500 text-sm">未生成</span>
          )}
        </div>
      </div>

      {/* 相机运动 */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          相机运动
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(CAMERA_MOTION_PRESETS) as [CameraMotionType, typeof CAMERA_MOTION_PRESETS[CameraMotionType]][]).map(
            ([key, preset]) => (
              <button
                key={key}
                onClick={() => setCameraMotion(key)}
                className={`p-2 rounded-lg border text-center transition ${
                  cameraMotion === key
                    ? "border-green-500 bg-green-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <div className="text-lg">{preset.icon}</div>
                <div className="text-xs mt-1">{preset.name}</div>
              </button>
            )
          )}
        </div>
      </div>

      {/* 视差强度 */}
      <div>
        <label className="flex justify-between text-sm font-medium text-zinc-300 mb-2">
          <span>视差强度</span>
          <span className="text-zinc-500">{(parallaxStrength * 100).toFixed(0)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={parallaxStrength}
          onChange={(e) => setParallaxStrength(parseFloat(e.target.value))}
          className="w-full accent-green-500"
        />
      </div>

      {/* 运动速度 */}
      <div>
        <label className="flex justify-between text-sm font-medium text-zinc-300 mb-2">
          <span>运动速度</span>
          <span className="text-zinc-500">{motionSpeed.toFixed(1)}x</span>
        </label>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={motionSpeed}
          onChange={(e) => setMotionSpeed(parseFloat(e.target.value))}
          className="w-full accent-green-500"
        />
      </div>

      {/* 自动动画 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">自动动画</span>
        <button
          onClick={() => setAutoAnimate(!autoAnimate)}
          className={`w-12 h-6 rounded-full transition ${
            autoAnimate ? "bg-green-500" : "bg-zinc-700"
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition transform ${
              autoAnimate ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* 音频响应 */}
      <div className="border-t border-zinc-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-zinc-300">🎵 音频响应</span>
          <button
            onClick={() => setAudioReactive(!audioReactive)}
            className={`w-12 h-6 rounded-full transition ${
              audioReactive ? "bg-purple-500" : "bg-zinc-700"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition transform ${
                audioReactive ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        
        {audioReactive && (
          <div>
            <label className="flex justify-between text-sm text-zinc-400 mb-2">
              <span>响应强度</span>
              <span>{(audioIntensity * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audioIntensity}
              onChange={(e) => setAudioIntensity(parseFloat(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}

