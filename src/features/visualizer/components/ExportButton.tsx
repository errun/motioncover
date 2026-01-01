"use client";

import { useState, useCallback, useRef } from "react";
import { useVisualizerStore } from "../store";

interface ExportButtonProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

// Available export durations
const DURATION_OPTIONS = [
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
  { label: "15s", value: 15000 },
  { label: "30s", value: 30000 },
];

export default function ExportButton({ canvasRef }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(10000);
  const [showWatermark, setShowWatermark] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { isPlaying, setIsRecording } = useVisualizerStore();

  const startExport = useCallback(async () => {
    if (!canvasRef.current) {
      alert("Canvas not available");
      return;
    }

    if (!isPlaying) {
      alert("Please play audio first before exporting");
      return;
    }

    const canvas = canvasRef.current;
    setIsExporting(true);
    setIsRecording(true);
    setExportProgress(0);
    chunksRef.current = [];

    try {
      // Get canvas stream at 30 FPS
      const stream = canvas.captureStream(30);
      
      // Check for WebM support
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement("a");
        a.href = url;
        a.download = `motioncover-${Date.now()}.${mimeType.includes("webm") ? "webm" : "mp4"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsExporting(false);
        setIsRecording(false);
        setExportProgress(0);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      // Record for selected duration
      const duration = selectedDuration;
      const startTime = Date.now();

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        setExportProgress(progress);

        if (elapsed < duration && mediaRecorderRef.current?.state === "recording") {
          requestAnimationFrame(updateProgress);
        }
      };

      updateProgress();

      // Stop after duration
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, duration);

    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
      setIsExporting(false);
      setIsRecording(false);
    }
  }, [canvasRef, isPlaying, setIsRecording, selectedDuration]);

  const stopExport = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const getDurationLabel = () => {
    const option = DURATION_OPTIONS.find((o) => o.value === selectedDuration);
    return option?.label || "10s";
  };

  return (
    <div className="space-y-3">
      {/* Duration Selector */}
      {!isExporting && (
        <div className="flex items-center justify-between">
          <span className="phonk-mono text-xs text-gray-500">DURATION</span>
          <div className="flex gap-1">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedDuration(option.value)}
                className="phonk-mono text-xs px-2 py-1 border transition-all"
                style={{
                  borderColor: selectedDuration === option.value ? "#B026FF" : "#333",
                  color: selectedDuration === option.value ? "#B026FF" : "#666",
                  background: selectedDuration === option.value ? "rgba(176,38,255,0.1)" : "transparent",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Watermark Toggle */}
      {!isExporting && (
        <div className="flex items-center justify-between">
          <span className="phonk-mono text-xs text-gray-500">WATERMARK</span>
          <button
            onClick={() => setShowWatermark(!showWatermark)}
            className="phonk-mono text-xs px-3 py-1 border transition-all"
            style={{
              borderColor: showWatermark ? "#39FF14" : "#333",
              color: showWatermark ? "#39FF14" : "#666",
              background: showWatermark ? "rgba(57,255,20,0.1)" : "transparent",
            }}
          >
            {showWatermark ? "ON" : "OFF"}
          </button>
        </div>
      )}

      {/* Export Button / Progress */}
      <div className="p-3" style={{ background: "#111", border: "1px solid #333" }}>
        {!isExporting ? (
          <button
            onClick={startExport}
            disabled={!isPlaying}
            className="w-full phonk-btn disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: isPlaying ? "#39FF14" : "#333",
              color: isPlaying ? "#39FF14" : "#666",
            }}
          >
            [ EXPORT {getDurationLabel()} ]
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="phonk-mono text-xs" style={{ color: "#FF003C" }}>
                ● REC {Math.round(exportProgress)}%
              </span>
              <button
                onClick={stopExport}
                className="phonk-mono text-xs text-gray-500 hover:text-white"
              >
                [STOP]
              </button>
            </div>
            <div className="h-1" style={{ background: "#222" }}>
              <div
                className="h-full transition-all"
                style={{
                  width: `${exportProgress}%`,
                  background: "#FF003C",
                }}
              />
            </div>
            <div className="phonk-mono text-xs text-gray-600 text-center">
              {Math.ceil((selectedDuration / 1000) * (1 - exportProgress / 100))}s remaining
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

