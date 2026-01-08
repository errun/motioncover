"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useAudioStore } from "@/features/audio";
import { useVisualizerStore, lerp } from "../../store";

/**
 * Camera shake effect component
 * Provides bass-reactive camera movement for immersive experience
 */
export function CameraShake() {
  const { camera } = useThree();
  const { bassEnergy: rawBass, isPlaying } = useAudioStore();
  const { cameraShakeAmp, audioReactStrength, bassEnabled } = useVisualizerStore();
  const baseZRef = useRef(camera.position.z);
  const baseFovRef = useRef(camera.fov);
  const targetPos = useRef({ x: 0, y: 0, z: baseZRef.current });
  const shakeOffsetRef = useRef({ x: 0, y: 0, z: 0 });
  const shakeStrengthRef = useRef(0);
  const smoothBass = useRef(0);
  const bassEnergy = bassEnabled ? rawBass : 0;

  useFrame((state) => {
    // Smooth the bass for camera motion
    smoothBass.current = lerp(smoothBass.current, bassEnergy, 0.2);
    const bass = smoothBass.current;
    const gatedBass = Math.max(0, bass - 0.8);

    // Base Lissajous drift (slow)
    const baseTime = state.clock.elapsedTime * 0.2;
    const driftFactor = isPlaying ? 1 : 0;
    const basePosition = {
      x: Math.sin(baseTime * 1.1) * 0.18 * driftFactor,
      y: Math.sin(baseTime * 0.9 + Math.PI / 2) * 0.12 * driftFactor,
      z: baseZRef.current,
    };

    // Shake offset: only on heavy bass, fast decay between hits
    if (isPlaying && gatedBass > 0) {
      const shakeTarget = gatedBass * cameraShakeAmp * audioReactStrength * 0.8;
      shakeStrengthRef.current = lerp(shakeStrengthRef.current, shakeTarget, 0.2);
      shakeOffsetRef.current.x = (Math.random() - 0.5) * shakeStrengthRef.current;
      shakeOffsetRef.current.y = (Math.random() - 0.5) * shakeStrengthRef.current;
    } else {
      shakeStrengthRef.current = lerp(shakeStrengthRef.current, 0, 0.1);
      shakeOffsetRef.current.x = lerp(shakeOffsetRef.current.x, 0, 0.1);
      shakeOffsetRef.current.y = lerp(shakeOffsetRef.current.y, 0, 0.1);
    }

    // Superposition: base + shake
    targetPos.current.x = basePosition.x + shakeOffsetRef.current.x;
    targetPos.current.y = basePosition.y + shakeOffsetRef.current.y;
    targetPos.current.z = basePosition.z + shakeOffsetRef.current.z;

    camera.position.x = lerp(camera.position.x, targetPos.current.x, 0.2);
    camera.position.y = lerp(camera.position.y, targetPos.current.y, 0.2);
    camera.position.z = lerp(camera.position.z, targetPos.current.z, 0.2);

    // Subtle zoom via FOV (clamped 45-50)
    const maxFov = 50;
    const minFov = 45;
    const fovBass = isPlaying ? bass : 0;
    const reactiveFov = Math.min(
      maxFov,
      Math.max(minFov, lerp(maxFov, minFov, Math.min(1, fovBass)))
    );
    const targetFov = isPlaying ? reactiveFov : baseFovRef.current;
    camera.fov = lerp(camera.fov, targetFov, 0.08);
    camera.updateProjectionMatrix();
  });

  return null;
}
