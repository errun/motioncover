"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type SpeedParticlesProps = {
  count?: number;
  radius?: number;
  height?: number;
  speed?: number;
  color?: string;
};

export function SpeedParticles({
  count = 180,
  radius = 1.2,
  height = 2.4,
  speed = 0.6,
  color = "#7dd3fc",
}: SpeedParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * radius * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * height;
      positions[i3 + 2] = (Math.random() - 0.5) * radius * 2;
      speeds[i] = speed * (0.4 + Math.random() * 0.6);
    }
    return { positions, speeds };
  }, [count, radius, height, speed]);

  useEffect(() => {
    const points = pointsRef.current;
    if (!points) return;
    const positionAttr = points.geometry.getAttribute("position");
    if (positionAttr instanceof THREE.BufferAttribute) {
      positionAttr.setUsage(THREE.DynamicDrawUsage);
    } else {
      positionAttr.data.setUsage(THREE.DynamicDrawUsage);
    }
  }, []);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const positionAttr = points.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const array = positionAttr.array as Float32Array;
    const halfHeight = height / 2;

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      array[i3 + 1] += speeds[i] * delta;
      if (array[i3 + 1] > halfHeight) {
        array[i3 + 1] = -halfHeight;
        array[i3] = (Math.random() - 0.5) * radius * 2;
        array[i3 + 2] = (Math.random() - 0.5) * radius * 2;
      }
    }

    positionAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color={color}
        opacity={0.45}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
