"use client";

import { useAudioStore } from "@/stores/audioStore";
import PhonkFader from "./PhonkFader";
import ImageUploader from "./ImageUploader";
import ExportButton from "./ExportButton";
import PresetSelector from "./PresetSelector";
import WaveformVisualizer from "./WaveformVisualizer";

interface ControlDeckProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function ControlDeck({ canvasRef }: ControlDeckProps) {
  const {
    displacementScale,
    audioReactStrength,
    cameraShakeAmp,
    rgbShiftAmount,
    vhsEnabled,
    isPlaying,
    setDisplacementScale,
    setAudioReactStrength,
    setCameraShakeAmp,
    setRgbShiftAmount,
    setVhsEnabled,
    resetParameters,
  } = useAudioStore();

  return (
    <div
      className="flex-1 overflow-y-auto p-4"
      style={{ background: "#0a0a0a" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="phonk-heading text-sm" style={{ color: "#39FF14" }}>
          CONTROL DECK
        </h3>
        <button
          onClick={resetParameters}
          className="phonk-mono text-xs text-gray-500 hover:text-white transition-colors"
        >
          [RESET]
        </button>
      </div>

      {/* Faders Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <PhonkFader
          label="3D INTENSITY"
          value={displacementScale}
          onChange={setDisplacementScale}
          min={0}
          max={1}
          color="#39FF14"
        />
        <PhonkFader
          label="BASS KICK"
          value={audioReactStrength}
          onChange={setAudioReactStrength}
          min={0}
          max={1}
          color="#B026FF"
          glowOnBeat
        />
        <PhonkFader
          label="EARTHQUAKE"
          value={cameraShakeAmp}
          onChange={setCameraShakeAmp}
          min={0}
          max={1}
          color="#FF003C"
          overdrive
        />
        <PhonkFader
          label="GLITCH LVL"
          value={rgbShiftAmount}
          onChange={setRgbShiftAmount}
          min={0}
          max={1}
          color="#B026FF"
        />
      </div>

      {/* Preset Selector */}
      <PresetSelector />

      {/* Waveform Visualizer */}
      <div
        className="p-3 mb-4 mt-4"
        style={{ background: "#111", border: "1px solid #333" }}
      >
        <h3 className="phonk-heading text-xs text-[var(--phonk-acid)] mb-2">
          AUDIO WAVEFORM
        </h3>
        <WaveformVisualizer
          width={280}
          height={50}
          barCount={32}
        />
        {!isPlaying && (
          <p className="phonk-mono text-xs text-gray-600 mt-2">
            // PLAY AUDIO TO SEE WAVEFORM
          </p>
        )}
      </div>

      {/* Image Upload Section */}
      <div
        className="p-3 mb-4"
        style={{ background: "#111", border: "1px solid #333" }}
      >
        <ImageUploader />
      </div>

      {/* VHS Toggle */}
      <div
        className="p-3 mb-4"
        style={{ background: "#111", border: "1px solid #333" }}
      >
        <div className="flex items-center justify-between">
          <span className="phonk-heading text-xs text-gray-400">
            VHS EFFECT
          </span>
          <button
            onClick={() => setVhsEnabled(!vhsEnabled)}
            className="phonk-mono text-xs px-3 py-1"
            style={{
              border: `1px solid ${vhsEnabled ? "#39FF14" : "#333"}`,
              color: vhsEnabled ? "#39FF14" : "#666",
              background: vhsEnabled ? "rgba(57,255,20,0.1)" : "transparent",
            }}
          >
            {vhsEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Export Button */}
      <ExportButton canvasRef={canvasRef} />

      {/* Instructions */}
      <div className="mt-6 phonk-mono text-xs text-gray-600 leading-relaxed">
        <p className="mb-2">// INSTRUCTIONS</p>
        <p>1. UPLOAD COVER IMAGE</p>
        <p>2. UPLOAD OR PLAY AUDIO</p>
        <p>3. ADJUST PARAMETERS</p>
        <p>4. EXPORT YOUR CANVAS</p>
      </div>
    </div>
  );
}

