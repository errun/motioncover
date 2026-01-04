"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, ChromaticAberration, Noise, Scanline, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { useAudioStore } from "@/features/audio";
import { useVisualizerStore, lerp } from "../../store";

/**
 * Post-processing effects component
 * Provides VHS-style effects: chromatic aberration, noise, and scanlines
 */
export function PostEffects() {
  const { highEnergy: rawHigh, isPlaying } = useAudioStore();
  const {
    rgbShiftAmount,
    vhsEnabled,
    bloomStrength,
    zoomBlurStrength,
    highEnabled
  } = useVisualizerStore();
  const smoothHigh = useRef(0);
  const highEnergy = highEnabled ? rawHigh : 0;

  useFrame(() => {
    smoothHigh.current = lerp(smoothHigh.current, highEnergy, 0.15);
  });

  // RGB shift - more intense on high frequency hits
  const high = smoothHigh.current;
  const baseOffset = isPlaying ? 0.0005 : 0;
  const highBoost = high > 0.2 ? (high - 0.2) * rgbShiftAmount * 0.02 : 0;
  const rgbOffset = baseOffset + highBoost;

  // Dynamic noise opacity based on highs
  const noiseOpacity = vhsEnabled ? 0.06 + high * 0.2 : 0;
  const scanlineOpacity = 0.06 + high * 0.08;

  // Vignette Impact - darkening edges on high frequency spikes
  // zoomBlurStrength controls the base intensity of this impact
  // We use the name "ZoomBlur" in store for compatibility/user-facing name "IMPACT"
  const impactStrength = high > 0.4 ? (high - 0.4) * 2.2 : 0;
  const vignetteDarkness = 0.4 + (impactStrength * zoomBlurStrength * 0.8);
  const vignetteOffset = 0.1 + (impactStrength * 0.1);

  // Always render all effects but control their intensity via opacity/amount
  return (
    <EffectComposer>
      {/* Bloom - Neon Glow */}
      <Bloom
        luminanceThreshold={0.2}
        mipmapBlur
        intensity={bloomStrength * (0.6 + high * 1.4)}
        radius={0.4}
      />

      {/* Vignette - Bass Impact Aura */}
      <Vignette
        eskil={false}
        offset={vignetteOffset}
        darkness={vignetteDarkness}
        blendFunction={BlendFunction.NORMAL}
      />

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
