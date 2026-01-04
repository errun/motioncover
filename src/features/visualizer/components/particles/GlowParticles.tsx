"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAudioStore } from "@/features/audio";
import { useVisualizerStore, lerp } from "../../store";
import { THREE_CONFIG } from "@/constants";

/**
 * Glow particle effect - floating particles that pulse with mids
 */
export function GlowParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const { midEnergy: rawMid, isPlaying } = useAudioStore();
  const { audioReactStrength, midEnabled } = useVisualizerStore();
  const smoothMid = useRef(0);
  // Glow particles respond to mid frequencies
  const midEnergy = midEnabled ? rawMid : 0;

  const particleCount = THREE_CONFIG.particleCount.glow;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 3;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius * 1.75;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    return pos;
  }, [particleCount]);

  const originalPositions = useMemo(() => positions.slice(), [positions]);

  useFrame((state) => {
    if (!pointsRef.current || !isPlaying) return;

    smoothMid.current = lerp(smoothMid.current, midEnergy, 0.15);
    const mid = smoothMid.current;

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const time = state.clock.elapsedTime;
      
      // Floating motion with bass influence
      posArray[i3] = originalPositions[i3] + Math.sin(time + i) * 0.3 * mid * audioReactStrength;
      posArray[i3 + 1] = originalPositions[i3 + 1] + Math.cos(time * 0.7 + i) * 0.3 * mid * audioReactStrength;
      posArray[i3 + 2] = originalPositions[i3 + 2] + Math.sin(time * 1.3 + i) * 0.2;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Pulse size with mid frequencies
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.size = 0.1 + mid * audioReactStrength * 0.15;
    material.opacity = 0.4 + mid * 0.4;
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
        size={0.1}
        color="#B026FF"
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
