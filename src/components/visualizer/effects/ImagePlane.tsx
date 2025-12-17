"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useAudioStore, lerp } from "@/stores/audioStore";
import { PLACEHOLDER_COVER, THREE_CONFIG } from "@/constants";

// GLSL Shaders for depth-based parallax
const depthVertexShader = `
  varying vec2 vUv;
  uniform sampler2D depthMap;
  uniform float displacement;
  uniform float time;
  uniform float bassEnergy;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    
    float depth = texture2D(depthMap, uv).r;
    float displaceAmount = displacement * (1.0 - depth) * (1.0 + bassEnergy * 0.5);
    pos.z += displaceAmount * 0.3;
    pos.z += sin(time * 2.0 + uv.x * 3.14159) * 0.02 * bassEnergy;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const depthFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D colorMap;
  
  void main() {
    gl_FragColor = texture2D(colorMap, vUv);
  }
`;

interface ImagePlaneProps {
  customImageUrl: string | null;
  depthMapUrl: string | null;
}

/**
 * Main image plane component with depth-based parallax effect
 */
export function ImagePlane({ customImageUrl, depthMapUrl }: ImagePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { bassEnergy, displacementScale, audioReactStrength, isPlaying } = useAudioStore();

  const imageSrc = customImageUrl || PLACEHOLDER_COVER;
  const colorTexture = useTexture(imageSrc);
  const depthTexture = useTexture(depthMapUrl || PLACEHOLDER_COVER);

  const smoothBass = useRef(0);
  const rotationOffset = useRef(0);

  const uniforms = useMemo(() => ({
    colorMap: { value: colorTexture },
    depthMap: { value: depthTexture },
    displacement: { value: 0.5 },
    time: { value: 0 },
    bassEnergy: { value: 0 },
  }), [colorTexture, depthTexture]);

  useFrame((state) => {
    if (!meshRef.current) return;

    smoothBass.current = lerp(smoothBass.current, bassEnergy, 0.15);
    const bass = smoothBass.current;

    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.bassEnergy.value = bass;
      materialRef.current.uniforms.displacement.value = displacementScale * audioReactStrength;
    }

    const intensity = displacementScale * audioReactStrength;

    // Rotation wobble
    const wobbleAmount = isPlaying ? bass * intensity * 0.05 : 0;
    rotationOffset.current = lerp(rotationOffset.current, wobbleAmount, 0.1);
    meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * rotationOffset.current;

    // Scale pulse
    const targetScale = 1 + (bass > 0.5 ? bass * intensity * 0.15 : bass * intensity * 0.05);
    const currentScale = meshRef.current.scale.x;
    const scaleSpeed = bass > currentScale - 1 ? 0.3 : 0.08;
    meshRef.current.scale.setScalar(lerp(currentScale, targetScale, scaleSpeed));

    // Position jitter on high bass
    if (isPlaying && bass > 0.6) {
      const jitter = (bass - 0.6) * displacementScale * 0.1;
      meshRef.current.position.x = (Math.random() - 0.5) * jitter;
      meshRef.current.position.y = (Math.random() - 0.5) * jitter;
    } else {
      meshRef.current.position.x = lerp(meshRef.current.position.x, 0, 0.1);
      meshRef.current.position.y = lerp(meshRef.current.position.y, 0, 0.1);
    }
  });

  // Use shader material if depth map is available
  if (depthMapUrl) {
    return (
      <mesh ref={meshRef}>
        <planeGeometry args={[THREE_CONFIG.planeWidth, THREE_CONFIG.planeHeight, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={depthVertexShader}
          fragmentShader={depthFragmentShader}
          uniforms={uniforms}
        />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[THREE_CONFIG.planeWidth, THREE_CONFIG.planeHeight, 32, 32]} />
      <meshBasicMaterial map={colorTexture} />
    </mesh>
  );
}

