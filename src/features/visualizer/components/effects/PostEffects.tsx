"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, ChromaticAberration, Noise, Scanline, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { useVisualizerStore, lerp } from "../../store";

/**
 * Post-processing effects component
 * Provides VHS-style effects: chromatic aberration, noise, and scanlines
 */
export function PostEffects() {
  const {
    bassEnergy,
    rgbShiftAmount,
    vhsEnabled,
    isPlaying,
    bloomStrength,
    zoomBlurStrength
  } = useVisualizerStore();
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

  // Vignette Impact - darkening edges on heavy hits
  // zoomBlurStrength controls the base intensity of this impact
  // We use the name "ZoomBlur" in store for compatibility/user-facing name "IMPACT"
  const impactStrength = bass > 0.4 ? (bass - 0.4) * 2.5 : 0;
  const vignetteDarkness = 0.4 + (impactStrength * zoomBlurStrength * 0.8);
  const vignetteOffset = 0.1 + (impactStrength * 0.1);

  // Always render all effects but control their intensity via opacity/amount
  return (
    <EffectComposer>
      {/* Bloom - Neon Glow */}
      <Bloom
        luminanceThreshold={0.2}
        mipmapBlur
        intensity={bloomStrength * 1.5}
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
