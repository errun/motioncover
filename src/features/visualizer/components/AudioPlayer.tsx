"use client";

import { useRef, useState, useCallback } from "react";
import { useAudioStore, useAudioAnalyser } from "@/features/audio";
import { useVisualizerStore } from "../store";

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioFile, setAudioFile] = useState<string>("");
  const [fileName, setFileName] = useState<string>("Upload audio file");
  const [isInitialized, setIsInitialized] = useState(false);

  const { isPlaying, bassEnergy, midEnergy, highEnergy, setAudioFileUrl } =
    useAudioStore();
  const { initAudio, startAnalysis, stopAnalysis } = useAudioAnalyser();
  const {
    bassEnabled, midEnabled, highEnabled,
    setBassEnabled, setMidEnabled, setHighEnabled
  } = useVisualizerStore();
  const displayMidEnergy = isPlaying ? midEnergy : 0;
  const displayHighEnergy = isPlaying ? highEnergy : 0;

  // Handle file upload
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setAudioFile(url);
        setFileName(file.name);
        // 记录到全局 store，方便其它组件判断“音乐是否已上传”
        setAudioFileUrl(url);
        setIsInitialized(false);
      }
    },
    []
  );

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Check if audio file is loaded
    if (!audioFile) {
      alert("Please upload an audio file first");
      return;
    }

    if (audio.paused) {
      // 初始化并播放
      if (!isInitialized) {
        const { analyserNode } = initAudio(audio);
        setIsInitialized(true);
        audio.play();
        // 直接传入 analyserNode，避免 React 状态更新时序问题
        startAnalysis(analyserNode);
      } else {
        audio.play();
        startAnalysis();
      }
    } else {
      audio.pause();
      stopAnalysis();
    }
  }, [audioFile, isInitialized, initAudio, startAnalysis, stopAnalysis]);

  return (
    <div className="p-4 border-b border-[#333333]" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="phonk-heading text-sm" style={{ color: "#39FF14" }}>
          AUDIO SOURCE
        </h3>
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: isPlaying ? "#39FF14" : "#333",
            boxShadow: isPlaying ? "0 0 10px #39FF14" : "none",
          }}
        />
      </div>

      {/* File Name */}
      <div className="phonk-mono text-xs text-gray-500 mb-3 truncate">
        {fileName}
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioFile || undefined} loop />

      {/* Controls */}
      <div className="flex gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className="flex-1 phonk-btn text-sm py-3"
          style={{
            borderColor: isPlaying ? "#FF003C" : "#39FF14",
            color: isPlaying ? "#FF003C" : "#39FF14",
          }}
        >
          {isPlaying ? "[ PAUSE ]" : "[ PLAY ]"}
        </button>

        {/* Upload Button */}
        <label className="phonk-btn text-sm py-3 px-4 cursor-pointer">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          +
        </label>
      </div>

      {/* Bass Energy Display */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setBassEnabled(!bassEnabled)}
            className="phonk-mono text-xs flex items-center gap-1.5 hover:opacity-80"
            style={{ color: bassEnabled ? "#39FF14" : "#666" }}
          >
            <span className="w-3 h-3 border flex items-center justify-center text-[8px]"
              style={{ borderColor: bassEnabled ? "#39FF14" : "#666" }}>
              {bassEnabled ? "✓" : ""}
            </span>
            BASS ENERGY
          </button>
          <span className="phonk-mono text-xs" style={{ color: bassEnabled ? "#39FF14" : "#666" }}>
            {(bassEnergy * 100).toFixed(0)}%
          </span>
        </div>
        <div
          className="h-2"
          style={{
            background: "#111",
            border: "1px solid #333",
            opacity: bassEnabled ? 1 : 0.3,
          }}
        >
          <div
            className="h-full transition-all duration-75"
            style={{
              width: `${bassEnergy * 100}%`,
              background:
                bassEnergy > 0.7
                  ? "#FF003C"
                  : bassEnergy > 0.4
                  ? "#B026FF"
                  : "#39FF14",
              boxShadow:
                bassEnergy > 0.5
                  ? `0 0 10px ${bassEnergy > 0.7 ? "#FF003C" : "#B026FF"}`
                  : "none",
            }}
          />
        </div>
      </div>

      {/* Mid Energy Display */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setMidEnabled(!midEnabled)}
            className="phonk-mono text-xs flex items-center gap-1.5 hover:opacity-80"
            style={{ color: midEnabled ? "#00B3FF" : "#666" }}
          >
            <span className="w-3 h-3 border flex items-center justify-center text-[8px]"
              style={{ borderColor: midEnabled ? "#00B3FF" : "#666" }}>
              {midEnabled ? "✓" : ""}
            </span>
            MID ENERGY
          </button>
          <span className="phonk-mono text-xs" style={{ color: midEnabled ? "#00B3FF" : "#666" }}>
            {(displayMidEnergy * 100).toFixed(0)}%
          </span>
        </div>
        <div
          className="h-2"
          style={{
            background: "#111",
            border: "1px solid #333",
            opacity: midEnabled ? 1 : 0.3,
          }}
        >
          <div
            className="h-full transition-all duration-75"
            style={{
              width: `${displayMidEnergy * 100}%`,
              background: "#00B3FF",
              boxShadow: displayMidEnergy > 0.5 ? "0 0 10px #00B3FF" : "none",
            }}
          />
        </div>
      </div>

      {/* High Energy Display */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setHighEnabled(!highEnabled)}
            className="phonk-mono text-xs flex items-center gap-1.5 hover:opacity-80"
            style={{ color: highEnabled ? "#FFB020" : "#666" }}
          >
            <span className="w-3 h-3 border flex items-center justify-center text-[8px]"
              style={{ borderColor: highEnabled ? "#FFB020" : "#666" }}>
              {highEnabled ? "✓" : ""}
            </span>
            HIGH ENERGY
          </button>
          <span className="phonk-mono text-xs" style={{ color: highEnabled ? "#FFB020" : "#666" }}>
            {(displayHighEnergy * 100).toFixed(0)}%
          </span>
        </div>
        <div
          className="h-2"
          style={{
            background: "#111",
            border: "1px solid #333",
            opacity: highEnabled ? 1 : 0.3,
          }}
        >
          <div
            className="h-full transition-all duration-75"
            style={{
              width: `${displayHighEnergy * 100}%`,
              background: "#FFB020",
              boxShadow: displayHighEnergy > 0.5 ? "0 0 10px #FFB020" : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
