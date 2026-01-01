"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualizerStore, lerp } from "../../store";
import { THREE_CONFIG } from "@/constants";

/**
 * Smoke particle effect - slow rising particles with subtle bass response
 */
export function SmokeParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const { bassEnergy, isPlaying } = useVisualizerStore();
  const smoothBass = useRef(0);

  const particleCount = THREE_CONFIG.particleCount.smoke;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = -5 + Math.random() * 3;
      pos[i * 3 + 2] = -2 + Math.random() * 4;
    }
    return pos;
  }, [particleCount]);

  const velocities = useMemo(() => {
    const vel = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      vel[i] = 0.005 + Math.random() * 0.01;
    }
    return vel;
  }, [particleCount]);

  useFrame(() => {
    if (!pointsRef.current || !isPlaying) return;

    smoothBass.current = lerp(smoothBass.current, bassEnergy, 0.1);
    const bass = smoothBass.current;

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      posArray[i3 + 1] += velocities[i] * (1 + bass * 0.5);
      posArray[i3] += (Math.random() - 0.5) * 0.01;

      // Reset particle when it goes above viewport
      if (posArray[i3 + 1] > 6) {
        posArray[i3 + 1] = -5;
        posArray[i3] = (Math.random() - 0.5) * 6;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!isPlaying) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        color="#444444"
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

