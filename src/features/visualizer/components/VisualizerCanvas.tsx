"use client";

/**
 * Main 3D Visualizer Canvas Component
 *
 * Composes all visual elements:
 * - ImagePlane: Main cover image with depth-based parallax
 * - Particles: Bass, Fire, Glow, Smoke effects
 * - CameraShake: Bass-reactive camera movement
 * - PostEffects: VHS-style post-processing
 *
 * @module components/visualizer/VisualizerCanvas
 */

import { Canvas } from "@react-three/fiber";
import { useVisualizerStore } from "../store";
import { THREE_CONFIG } from "@/constants";

// Effects
import { ImagePlane, CameraShake, PostEffects } from "./effects";

// Particles
import { BassParticles, FireParticles, GlowParticles, SmokeParticles } from "./particles";

interface VisualizerCanvasProps {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

/**
 * Main visualizer canvas that renders all 3D effects
 */
export default function VisualizerCanvas({ onCanvasReady }: VisualizerCanvasProps) {
  const { imageUrl, depthMapUrl } = useVisualizerStore();

  return (
    <Canvas
      gl={{
        antialias: false,
        preserveDrawingBuffer: true,
      }}
      dpr={1}
      camera={{
        position: THREE_CONFIG.cameraPosition,
        fov: THREE_CONFIG.cameraFov
      }}
      style={{ background: "#000" }}
      onCreated={({ gl }) => {
        if (onCanvasReady) {
          onCanvasReady(gl.domElement);
        }
      }}
    >
      {/* Main image with depth parallax */}
      <ImagePlane customImageUrl={imageUrl} depthMapUrl={depthMapUrl} />

      {/* Particle effects */}
      <BassParticles />
      <FireParticles />
      <GlowParticles />
      <SmokeParticles />

      {/* Camera and post-processing */}
      <CameraShake />
      <PostEffects />
    </Canvas>
  );
}

