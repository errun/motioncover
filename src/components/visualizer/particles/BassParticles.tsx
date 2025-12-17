"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAudioStore, lerp } from "@/stores/audioStore";
import { THREE_CONFIG } from "@/constants";

/**
 * Bass-reactive particle system that pulses outward with bass hits
 * Creates a ring of particles around the main image
 */
export function BassParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const { bassEnergy, isPlaying, audioReactStrength } = useAudioStore();
  const smoothBass = useRef(0);

  const particleCount = THREE_CONFIG.particleCount.bass;
  
  // Create particle positions in a ring pattern
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 3 + Math.random() * 2;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius * 1.75; // Match 9:16 aspect
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return pos;
  }, [particleCount]);

  const originalPositions = useMemo(() => positions.slice(), [positions]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    smoothBass.current = lerp(smoothBass.current, bassEnergy, 0.2);
    const bass = smoothBass.current;

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const origX = originalPositions[i3];
      const origY = originalPositions[i3 + 1];
      const origZ = originalPositions[i3 + 2];

      // Pulse outward on bass hits
      const pulseAmount = isPlaying ? bass * audioReactStrength * 0.5 : 0;
      const angle = Math.atan2(origY, origX);

      posArray[i3] = origX + Math.cos(angle) * pulseAmount;
      posArray[i3 + 1] = origY + Math.sin(angle) * pulseAmount;
      posArray[i3 + 2] = origZ + Math.sin(state.clock.elapsedTime + i) * 0.1;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.z += 0.001;

    const scale = 1 + bass * audioReactStrength * 0.2;
    pointsRef.current.scale.setScalar(scale);
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
        size={0.05}
        color="#39FF14"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

