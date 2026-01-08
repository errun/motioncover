"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAudioStore } from "@/features/audio";
import { useParallaxStore } from "../store";

type AutoCameraRigProps = {
  enableDrift?: boolean;
  enableShake?: boolean;
  shakeThreshold?: number;
  debugThreshold?: boolean;
  debugThresholdValue?: number;
};

export function AutoCameraRig({
  enableDrift = true,
  enableShake = true,
  shakeThreshold = 0.7,
  debugThreshold = false,
  debugThresholdValue = 0.5,
}: AutoCameraRigProps) {
  const { camera } = useThree();
  const { bassEnergy, isPlaying } = useAudioStore();
  const { audioReactive, audioIntensity } = useParallaxStore();
  const basePosRef = useRef(
    new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)
  );
  const shakeRef = useRef(new THREE.Vector3());
  const smoothBassRef = useRef(0);

  useFrame(({ clock }) => {
    const active = audioReactive && isPlaying;
    const effectiveBass = active ? bassEnergy * audioIntensity : 0;
    smoothBassRef.current = THREE.MathUtils.lerp(
      smoothBassRef.current,
      effectiveBass,
      0.2
    );
    const smoothBass = Math.min(1, smoothBassRef.current);
    const threshold = debugThreshold ? debugThresholdValue : shakeThreshold;
    const gate = Math.max(0, smoothBass - threshold);
    const gateNorm = threshold < 1 ? gate / (1 - threshold) : 0;

    const t = clock.elapsedTime * 0.2;
    const driftScale = active && enableDrift ? 1 : 0;
    const baseX =
      basePosRef.current.x + Math.sin(t * 1.1) * 0.18 * driftScale;
    const baseY =
      basePosRef.current.y +
      Math.sin(t * 0.9 + Math.PI / 2) * 0.12 * driftScale;
    const baseZ = basePosRef.current.z;

    if (active && enableShake && gate > 0) {
      const shakeAmp = gateNorm * 0.25;
      shakeRef.current.x = (Math.random() - 0.5) * shakeAmp;
      shakeRef.current.y = (Math.random() - 0.5) * shakeAmp;
      shakeRef.current.z = (Math.random() - 0.5) * shakeAmp * 0.3;
    } else {
      shakeRef.current.x = THREE.MathUtils.lerp(shakeRef.current.x, 0, 0.2);
      shakeRef.current.y = THREE.MathUtils.lerp(shakeRef.current.y, 0, 0.2);
      shakeRef.current.z = THREE.MathUtils.lerp(shakeRef.current.z, 0, 0.2);
    }

    const targetX = baseX + shakeRef.current.x;
    const targetY = baseY + shakeRef.current.y;
    const targetZ = baseZ + shakeRef.current.z;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.2);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.2);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.2);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
