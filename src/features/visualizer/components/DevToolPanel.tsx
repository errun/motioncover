"use client";

/**
 * DevTool 调试面板
 * 仅在开发环境显示，提供实时状态监控
 * 
 * @module features/visualizer/components/DevToolPanel
 */

import { useState, useEffect, useRef } from "react";
import { useAudioStore } from "@/features/audio";
import { useVisualizerStore, PRESETS } from "../store";

// 仅在开发环境渲染
const isDev = process.env.NODE_ENV === "development";

export default function DevToolPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  
  // 从 store 获取状态
  const { bassEnergy, isPlaying } = useAudioStore();
  const {
    imageUrl,
    depthMapUrl,
    isGeneratingDepth,
    isRecording,
    recordingProgress,
    currentPreset,
    displacementScale,
    audioReactStrength,
    cameraShakeAmp,
    rgbShiftAmount,
    vhsEnabled,
  } = useVisualizerStore();

  // FPS 计算
  useEffect(() => {
    if (!isDev || !isOpen) return;
    
    let animationId: number;
    
    const calculateFps = () => {
      frameCount.current++;
      const now = performance.now();
      const elapsed = now - lastTime.current;
      
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / elapsed));
        frameCount.current = 0;
        lastTime.current = now;
      }
      
      animationId = requestAnimationFrame(calculateFps);
    };
    
    animationId = requestAnimationFrame(calculateFps);
    return () => cancelAnimationFrame(animationId);
  }, [isOpen]);

  // 非开发环境不渲染
  if (!isDev) return null;

  return (
    <>
      {/* 切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-[9999] px-2 py-1 bg-black/80 border border-[#39FF14] text-[#39FF14] font-mono text-xs hover:bg-[#39FF14]/20 transition-colors"
        title="Toggle DevTool"
      >
        {isOpen ? "✕ DEV" : "⚙ DEV"}
      </button>

      {/* 面板 */}
      {isOpen && (
        <div className="fixed top-12 right-4 z-[9998] w-64 bg-black/95 border border-[#39FF14]/50 font-mono text-xs text-white p-3 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* 标题 */}
          <div className="text-[#39FF14] font-bold border-b border-[#39FF14]/30 pb-1">
            VISUALIZER DEVTOOL
          </div>

          {/* FPS */}
          <div className="flex justify-between">
            <span className="text-gray-400">FPS:</span>
            <span className={fps < 30 ? "text-red-500" : fps < 50 ? "text-yellow-500" : "text-[#39FF14]"}>
              {fps}
            </span>
          </div>

          {/* Bass 能量条 */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">BASS:</span>
              <span className="text-[#B026FF]">{(bassEnergy * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#39FF14] via-[#B026FF] to-[#FF003C] transition-all duration-75"
                style={{ width: `${bassEnergy * 100}%` }}
              />
            </div>
          </div>

          {/* 状态标记 */}
          <div className="flex flex-wrap gap-1">
            <StatusBadge label="PLAYING" active={isPlaying} />
            <StatusBadge label="RECORDING" active={isRecording} color="red" />
            <StatusBadge label="VHS" active={vhsEnabled} color="purple" />
            <StatusBadge label="DEPTH" active={!!depthMapUrl} color="cyan" />
            {isGeneratingDepth && <StatusBadge label="GEN..." active={true} color="yellow" />}
          </div>

          {/* 参数值 */}
          <div className="space-y-1 border-t border-gray-700 pt-2">
            <div className="text-gray-400 mb-1">PARAMETERS:</div>
            <ParamRow label="3D Intensity" value={displacementScale} />
            <ParamRow label="Bass Kick" value={audioReactStrength} />
            <ParamRow label="Earthquake" value={cameraShakeAmp} />
            <ParamRow label="Glitch" value={rgbShiftAmount} />
          </div>

          {/* 当前预设 */}
          <div className="flex justify-between border-t border-gray-700 pt-2">
            <span className="text-gray-400">PRESET:</span>
            <span className="text-[#FF003C]">{PRESETS[currentPreset]?.label || currentPreset}</span>
          </div>

          {/* 录制进度 */}
          {isRecording && (
            <div>
              <div className="text-gray-400 mb-1">RECORDING: {(recordingProgress * 100).toFixed(0)}%</div>
              <div className="h-1 bg-gray-800 rounded overflow-hidden">
                <div className="h-full bg-[#FF003C]" style={{ width: `${recordingProgress * 100}%` }} />
              </div>
            </div>
          )}

          {/* 图片状态 */}
          <div className="text-gray-500 text-[10px] border-t border-gray-700 pt-2 break-all">
            IMG: {imageUrl ? "✓ Loaded" : "✗ None"}
            <br />
            DEPTH: {depthMapUrl ? "✓ Ready" : isGeneratingDepth ? "⟳ Generating..." : "✗ None"}
          </div>
        </div>
      )}
    </>
  );
}

// 状态标记组件
function StatusBadge({ label, active, color = "green" }: { label: string; active: boolean; color?: string }) {
  const colors: Record<string, string> = {
    green: active ? "bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]" : "bg-gray-800 text-gray-600 border-gray-700",
    red: active ? "bg-[#FF003C]/20 text-[#FF003C] border-[#FF003C]" : "bg-gray-800 text-gray-600 border-gray-700",
    purple: active ? "bg-[#B026FF]/20 text-[#B026FF] border-[#B026FF]" : "bg-gray-800 text-gray-600 border-gray-700",
    cyan: active ? "bg-cyan-500/20 text-cyan-400 border-cyan-500" : "bg-gray-800 text-gray-600 border-gray-700",
    yellow: active ? "bg-yellow-500/20 text-yellow-400 border-yellow-500" : "bg-gray-800 text-gray-600 border-gray-700",
  };
  
  return (
    <span className={`px-1.5 py-0.5 border text-[10px] ${colors[color]}`}>
      {label}
    </span>
  );
}

// 参数行组件
function ParamRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}:</span>
      <span className="text-white">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}
