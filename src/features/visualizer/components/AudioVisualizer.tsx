"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Canvas, extend, useFrame, type ThreeElements } from "@react-three/fiber";
import { shaderMaterial, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Props for high-level visualizer component
export type AudioVisualizerProps = {
  audioSrc: string;
  coverSrc: string;
  className?: string;
};

type Levels = { bass: number; treble: number };

// Hook: Web Audio analyser with smoothed bass / treble levels
export function useAudioAnalyzer(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const smoothedRef = useRef<Levels>({ bass: 0, treble: 0 });

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || typeof window === "undefined") return;

    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512; // spectrum resolution

    const source = ctx.createMediaElementSource(audioEl);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    const onPlay = () => {
      if (ctx.state === "suspended") ctx.resume();
    };
    audioEl.addEventListener("play", onPlay);

    return () => {
      audioEl.removeEventListener("play", onPlay);
      analyser.disconnect();
      source.disconnect();
      ctx.close();
      analyserRef.current = null;
      dataRef.current = null;
    };
  }, [audioRef]);

  const getLevels = useCallback((): Levels => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return smoothedRef.current;

    analyser.getByteFrequencyData(data);
    const len = data.length;
    const bassEnd = Math.floor(len * 0.25); // 0-25%: low frequencies
    const trebleStart = Math.floor(len * 0.75); // 75-100%: high frequencies

    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += data[i];

    let trebleSum = 0;
    for (let i = trebleStart; i < len; i++) trebleSum += data[i];

    const bassAvg = bassEnd > 0 ? bassSum / bassEnd : 0;
    const trebleAvg = len - trebleStart > 0 ? trebleSum / (len - trebleStart) : 0;

    const bassTarget = bassAvg / 255;
    const trebleTarget = trebleAvg / 255;

    const lerp = (current: number, target: number, smoothing: number) =>
      current + (target - current) * smoothing;

    const smoothing = 0.12;
    const current = smoothedRef.current;
    current.bass = lerp(current.bass, bassTarget, smoothing);
    current.treble = lerp(current.treble, trebleTarget, smoothing);

    return current;
  }, []);

  return getLevels;
}

// Shader material: album cover that reacts to bass / treble
const AlbumCoverMaterial = shaderMaterial(
  { uTexture: null, uBass: 0, uTreble: 0, uTime: 0 },
  // Vertex shader: pass through position + uv
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader: simple UV zoom (bass) + brightness (treble)
  `
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uBass;
    uniform float uTreble;
    uniform float uTime;

    void main() {
      // Centered UV for zoom from image center
      vec2 centeredUv = vUv - 0.5;
      float bassStrength = 0.08; // max zoom factor contributed by bass
      float zoom = 1.0 - uBass * bassStrength;
      vec2 zoomedUv = centeredUv * zoom + 0.5;

      vec4 color = texture2D(uTexture, zoomedUv);

      // Treble drives a white flash / brightness boost
      float trebleStrength = 0.8;
      vec3 flashed = mix(color.rgb, vec3(1.0), uTreble * trebleStrength);

      gl_FragColor = vec4(flashed, color.a);
    }
  `
);

extend({ AlbumCoverMaterial });

type AlbumCoverMaterialImpl = THREE.ShaderMaterial & {
  uTexture: THREE.Texture | null;
  uBass: number;
  uTreble: number;
  uTime: number;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    albumCoverMaterial: ThreeElements["shaderMaterial"] & {
      uTexture?: THREE.Texture | null;
      uBass?: number;
      uTreble?: number;
      uTime?: number;
    };
  }
}

type PlaneProps = { coverSrc: string; audioRef: React.RefObject<HTMLAudioElement | null> };

const AlbumCoverPlane: React.FC<PlaneProps> = ({ coverSrc, audioRef }) => {
  const materialRef = useRef<AlbumCoverMaterialImpl | null>(null);
  const texture = useTexture(coverSrc);
  const getLevels = useAudioAnalyzer(audioRef);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    const { bass, treble } = getLevels();
    mat.uBass = bass;
    mat.uTreble = treble;
    mat.uTime += delta;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <albumCoverMaterial ref={materialRef} uTexture={texture} />
    </mesh>
  );
};

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioSrc,
  coverSrc,
  className,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas camera={{ position: [0, 0, 2], fov: 45 }} style={{ width: "100%", height: "100%" }}>
        <color attach="background" args={["#000000"]} />
        <AlbumCoverPlane coverSrc={coverSrc} audioRef={audioRef} />
      </Canvas>
      <audio
        ref={audioRef}
        src={audioSrc}
        controls
        style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}
      />
    </div>
  );
};

