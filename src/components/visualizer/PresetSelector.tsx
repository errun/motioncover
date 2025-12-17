"use client";

import { useAudioStore, PRESETS, PresetName } from "@/stores/audioStore";

const presetOrder: PresetName[] = ["default", "aggressive", "chill", "glitch", "minimal", "earthquake"];

export default function PresetSelector() {
  const { currentPreset, applyPreset } = useAudioStore();

  return (
    <div className="p-4 border-b border-[#333333]" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <h3 className="phonk-heading text-sm mb-3" style={{ color: "#B026FF" }}>
        PRESETS
      </h3>

      {/* Preset Grid */}
      <div className="grid grid-cols-3 gap-2">
        {presetOrder.map((name) => {
          const preset = PRESETS[name];
          const isActive = currentPreset === name;
          
          return (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className="phonk-mono text-xs py-2 px-1 border transition-all duration-150"
              style={{
                background: isActive ? "#1a1a1a" : "#0a0a0a",
                borderColor: isActive ? "#B026FF" : "#333",
                color: isActive ? "#B026FF" : "#666",
                boxShadow: isActive ? "0 0 10px rgba(176, 38, 255, 0.3)" : "none",
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Quick Info */}
      <div className="mt-3 phonk-mono text-xs text-gray-600">
        {currentPreset === "aggressive" && "// MAX INTENSITY"}
        {currentPreset === "chill" && "// SMOOTH VIBES"}
        {currentPreset === "glitch" && "// RGB OVERLOAD"}
        {currentPreset === "minimal" && "// CLEAN OUTPUT"}
        {currentPreset === "earthquake" && "// HEAVY SHAKE"}
        {currentPreset === "default" && "// BALANCED"}
      </div>
    </div>
  );
}

