"use client";

import { useRef, useState, useCallback } from "react";
import { useAudioStore } from "@/stores/audioStore";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioFile, setAudioFile] = useState<string>("");
  const [fileName, setFileName] = useState<string>("Upload audio file");
  const [isInitialized, setIsInitialized] = useState(false);

  const { isPlaying, bassEnergy } = useAudioStore();
  const { initAudio, startAnalysis, stopAnalysis } = useAudioAnalyser();

  // Handle file upload
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setAudioFile(url);
        setFileName(file.name);
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

    if (!isInitialized) {
      initAudio(audio);
      setIsInitialized(true);
    }

    if (audio.paused) {
      audio.play();
      startAnalysis();
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
          <span className="phonk-mono text-xs text-gray-500">BASS ENERGY</span>
          <span className="phonk-mono text-xs" style={{ color: "#39FF14" }}>
            {(bassEnergy * 100).toFixed(0)}%
          </span>
        </div>
        <div
          className="h-2"
          style={{
            background: "#111",
            border: "1px solid #333",
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
    </div>
  );
}

