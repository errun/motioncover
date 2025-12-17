"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, ChromaticAberration, Noise, Scanline } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { useAudioStore, lerp } from "@/stores/audioStore";

/**
 * Post-processing effects component
 * Provides VHS-style effects: chromatic aberration, noise, and scanlines
 */
export function PostEffects() {
  const { bassEnergy, rgbShiftAmount, vhsEnabled, isPlaying } = useAudioStore();
  const smoothBass = useRef(0);

  useFrame(() => {
    smoothBass.current = lerp(smoothBass.current, bassEnergy, 0.15);
  });

  // RGB shift - more intense on bass hits
  const bass = smoothBass.current;
  const baseOffset = isPlaying ? 0.001 : 0;
  const bassBoost = bass > 0.3 ? (bass - 0.3) * rgbShiftAmount * 0.015 : 0;
  const rgbOffset = baseOffset + bassBoost;

  // Dynamic noise opacity based on bass
  const noiseOpacity = vhsEnabled ? 0.1 + bass * 0.15 : 0;
  const scanlineOpacity = 0.08 + bass * 0.05;

  // Always render all effects but control their intensity via opacity/amount
  return (
    <EffectComposer>
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(rgbOffset, rgbOffset * 0.7)}
      />
      <Noise
        blendFunction={BlendFunction.OVERLAY}
        opacity={vhsEnabled ? noiseOpacity : 0}
      />
      <Scanline
        blendFunction={BlendFunction.OVERLAY}
        density={1.5}
        opacity={vhsEnabled ? scanlineOpacity : 0}
      />
    </EffectComposer>
  );
}

