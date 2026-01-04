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
  const targetPos = useRef({ x: 0, y: 0, z: 5 });
  const smoothBass = useRef(0);
  const bassEnergy = bassEnabled ? rawBass : 0;

  useFrame((state) => {
    // Smooth the bass for camera motion
    smoothBass.current = lerp(smoothBass.current, bassEnergy, 0.2);
    const bass = smoothBass.current;
    const gatedBass = Math.max(0, bass - 0.7);

    if (!isPlaying) {
      camera.position.z = lerp(camera.position.z, 5, 0.1);
      camera.position.x = lerp(camera.position.x, 0, 0.1);
      camera.position.y = lerp(camera.position.y, 0, 0.1);
      return;
    }

    // Z-axis pump on bass (zoom in effect)
    const zPump = gatedBass * cameraShakeAmp * audioReactStrength * 1.5;
    targetPos.current.z = 5 - zPump;

    // Add smooth breathing motion
    const breathe = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

    // X/Y shake on high bass
    if (gatedBass > 0.02) {
      const shakeIntensity = gatedBass * cameraShakeAmp * 0.8;
      targetPos.current.x = (Math.random() - 0.5) * shakeIntensity;
      targetPos.current.y = (Math.random() - 0.5) * shakeIntensity;
    } else {
      targetPos.current.x = 0;
      targetPos.current.y = breathe * 0.05;
    }

    // Smooth camera movement
    camera.position.z = lerp(camera.position.z, targetPos.current.z, 0.15);
    camera.position.x = lerp(camera.position.x, targetPos.current.x, 0.25);
    camera.position.y = lerp(camera.position.y, targetPos.current.y, 0.25);
  });

  return null;
}
