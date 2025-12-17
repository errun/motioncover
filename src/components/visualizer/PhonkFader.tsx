"use client";

import { useAudioStore } from "@/stores/audioStore";

interface PhonkFaderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  color?: string;
  glowOnBeat?: boolean;
  overdrive?: boolean;
}

export default function PhonkFader({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  color = "#39FF14",
  glowOnBeat = false,
  overdrive = false,
}: PhonkFaderProps) {
  const { bassEnergy, isPlaying } = useAudioStore();

  // Check if overdrive mode (value > 80%)
  const isOverdrive = overdrive && value > 0.8;
  const displayColor = isOverdrive ? "#FF003C" : color;

  // Glow when bass hits
  const shouldGlow = glowOnBeat && isPlaying && bassEnergy > 0.5;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue =
      (parseFloat(e.target.value) - min) / (max - min);
    onChange(Math.max(0, Math.min(1, newValue)));
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div
      className={`p-3 ${isOverdrive ? "glitch-effect" : ""}`}
      style={{
        background: isOverdrive ? "rgba(255,0,60,0.1)" : "#111",
        border: `1px solid ${isOverdrive ? "#FF003C" : "#333"}`,
        transition: "all 0.15s",
      }}
    >
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="phonk-heading text-xs"
          style={{ color: displayColor }}
        >
          {label}
        </span>
        <span className="phonk-mono text-xs text-gray-500">
          {(value * 100).toFixed(0)}%
        </span>
      </div>

      {/* Fader Track */}
      <div
        className="relative h-24 flex items-end justify-center"
        style={{ background: "#080808" }}
      >
        {/* Track Background */}
        <div
          className="absolute inset-x-0 bottom-0 mx-auto w-4"
          style={{
            height: "100%",
            background: "#1a1a1a",
            border: "1px solid #333",
          }}
        />

        {/* Filled Track */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4"
          style={{
            height: `${percentage}%`,
            background: displayColor,
            boxShadow: shouldGlow
              ? `0 0 20px ${displayColor}`
              : isOverdrive
              ? `0 0 15px ${displayColor}`
              : "none",
            transition: shouldGlow ? "none" : "box-shadow 0.15s",
          }}
        />

        {/* Fader Thumb (Rectangular) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-8 h-3 cursor-pointer"
          style={{
            bottom: `calc(${percentage}% - 6px)`,
            background: displayColor,
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: `0 0 10px ${displayColor}`,
          }}
        />

        {/* Hidden Input for Interaction */}
        <input
          type="range"
          min={min}
          max={max}
          step={0.01}
          value={value * (max - min) + min}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{
            writingMode: "vertical-lr",
            direction: "rtl",
          }}
        />
      </div>

      {/* Overdrive Warning */}
      {isOverdrive && (
        <div className="mt-2 text-center">
          <span
            className="phonk-mono text-xs rec-blink"
            style={{ color: "#FF003C" }}
          >
            ⚠ OVERDRIVE
          </span>
        </div>
      )}
    </div>
  );
}

