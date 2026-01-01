"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualizerStore, lerp } from "../../store";
import { THREE_CONFIG } from "@/constants";

/**
 * Fire particle effect - particles rise from bottom with bass-reactive speed
 */
export function FireParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const { bassEnergy, isPlaying, audioReactStrength } = useVisualizerStore();
  const smoothBass = useRef(0);

  const particleCount = THREE_CONFIG.particleCount.fire;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 1] = -4 + Math.random() * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return pos;
  }, [particleCount]);

  const velocities = useMemo(() => {
    const vel = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      vel[i] = 0.02 + Math.random() * 0.03;
    }
    return vel;
  }, [particleCount]);

  useFrame(() => {
    if (!pointsRef.current || !isPlaying) return;

    smoothBass.current = lerp(smoothBass.current, bassEnergy, 0.2);
    const bass = smoothBass.current;

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      posArray[i3 + 1] += velocities[i] * (1 + bass * audioReactStrength * 2);
      posArray[i3] += (Math.random() - 0.5) * 0.02 * bass;

      // Reset particle when it goes above viewport
      if (posArray[i3 + 1] > 5) {
        posArray[i3 + 1] = -4;
        posArray[i3] = (Math.random() - 0.5) * 4;
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
        size={0.08}
        color="#FF6B00"
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

