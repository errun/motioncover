"use client";

import { useState, useEffect } from "react";
import { useVisualizerStore } from "../store";

interface ViewportFrameProps {
  children: React.ReactNode;
}

// VCR Timestamp Component
function VcrTimestamp() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="vcr-flicker phonk-mono text-xs" style={{ color: "#39FF14" }}>
      {time}
    </span>
  );
}

export default function ViewportFrame({ children }: ViewportFrameProps) {
  const { bassEnergy, isPlaying, isRecording } = useVisualizerStore();

  // Calculate frame glow based on bass
  const glowIntensity = Math.min(bassEnergy * 30, 20);

  return (
    <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl">
      {/* Aspect Ratio Container (9:16) */}
      <div className="relative" style={{ paddingTop: "177.78%" }}>
        {/* Industrial Metal Frame */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            border: "4px solid #222",
            boxShadow: isPlaying
              ? `0 0 ${glowIntensity}px rgba(57, 255, 20, 0.5), inset 0 0 20px rgba(0,0,0,0.8)`
              : "inset 0 0 20px rgba(0,0,0,0.8)",
            background: "#000",
          }}
        >
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#39FF14]" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#39FF14]" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#39FF14]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#39FF14]" />

          {/* Content */}
          <div className="absolute inset-0">{children}</div>

          {/* HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* REC Indicator */}
            {isPlaying && (
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span
                  className="rec-blink inline-block w-2 h-2 rounded-full"
                  style={{ background: "#FF003C" }}
                />
                <span className="phonk-mono text-xs" style={{ color: "#FF003C" }}>
                  REC
                </span>
              </div>
            )}

            {/* FPS Counter */}
            <div className="absolute top-3 right-3 phonk-mono text-xs text-gray-500">
              60 FPS
            </div>

            {/* Bass Meter */}
            {isPlaying && (
              <div className="absolute bottom-3 left-3 flex items-end gap-1">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1"
                    style={{
                      height: `${Math.max(4, bassEnergy * 100 * (1 - i * 0.1))}px`,
                      background:
                        bassEnergy > 0.7
                          ? "#FF003C"
                          : bassEnergy > 0.4
                          ? "#B026FF"
                          : "#39FF14",
                      opacity: i < bassEnergy * 10 ? 1 : 0.3,
                      transition: "all 0.05s",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Resolution */}
            <div className="absolute bottom-3 right-3 phonk-mono text-xs text-gray-500">
              1080×1920
            </div>

            {/* VCR Timestamp Watermark */}
            <div className="absolute top-12 left-3 flex items-center gap-2">
              <VcrTimestamp />
              {isRecording && (
                <span className="rec-blink text-xs text-[var(--phonk-red)] phonk-mono">
                  ● RECORDING
                </span>
              )}
            </div>

            {/* MOTIONCOVER.APP Watermark */}
            <div className="absolute top-12 right-3 phonk-mono text-xs text-gray-600">
              MOTIONCOVER.APP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

