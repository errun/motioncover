"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useParallaxStore } from "../store";
import { useAudioStore } from "@/features/audio";
import { useVisualizerStore } from "@/features/visualizer";

// 双层 WebGL Animator：前景 + 背景两个平面，基于音频驱动的 Shader 光影

type Vec3 = [number, number, number];
type ForegroundPivot = "center" | "bottom-center";

type ForegroundMeshTransform = {
  position: Vec3;
  scale: Vec3;
  renderOrder: number;
};

type ForegroundMeshTransformInput = {
  baseScale: Vec3;
  pivot: ForegroundPivot;
  scaleMultiplier: number;
  zOffset: number;
  yOffset: number;
  renderOrder: number;
  anchorHeight?: number;
};

function getForegroundMeshTransform({
  baseScale,
  pivot,
  scaleMultiplier,
  zOffset,
  yOffset,
  renderOrder,
  anchorHeight,
}: ForegroundMeshTransformInput): ForegroundMeshTransform {
  const anchorY =
    pivot === "bottom-center" ? -((anchorHeight ?? baseScale[1]) / 2) : 0;

  return {
    position: [0, anchorY + yOffset, zOffset],
    scale: [baseScale[0] * scaleMultiplier, baseScale[1] * scaleMultiplier, 1],
    renderOrder,
  };
}

function getPlaneScale(texture: THREE.Texture, viewport: { width: number; height: number }): Vec3 {
  const image = texture.image as { width: number; height: number } | undefined;
  if (!image) return [1, 1, 1];
  const imageAspect = image.width / image.height;
  const viewportAspect = viewport.width / viewport.height;
  if (imageAspect > viewportAspect) {
    return [viewport.width, viewport.width / imageAspect, 1];
  }
  return [viewport.height * imageAspect, viewport.height, 1];
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 背景层：智能阈值发光 + Bass 呼吸
const backgroundFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uTime;

  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    float brightness = luma(texColor.rgb);

    float neonMask = smoothstep(0.6, 0.9, brightness);

    float bassAmp = 0.3 + uBass * 1.7;
    vec3 glow = texColor.rgb + texColor.rgb * neonMask * bassAmp;

    float wave = sin(uTime * 1.2 + vUv.y * 6.2831) * 0.15 * uMid;
    glow.rb += wave;

    float flicker = 1.0 + uHigh * 0.3 * (sin(uTime * 40.0) * 0.5 + 0.5);
    vec3 finalColor = glow * flicker;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// 前景层：Alpha 闪烁 + 轻微位移
const foregroundFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uTime;

  void main() {
    vec2 uv = vUv;

    float shift = (uMid * 0.02);
    uv.x += sin(uTime * 2.0) * shift;

    vec4 texColor = texture2D(uTexture, uv);

    float flickerMask = step(0.8, uHigh);
    float scan = step(0.5, fract(vUv.y * 40.0 + uTime * 10.0));
    float alphaFlicker = mix(1.0, 0.35, flickerMask * scan);

    float exposure = 1.0 + uBass * 0.8;
    vec3 color = texColor.rgb * exposure;

    gl_FragColor = vec4(color, texColor.a * alphaFlicker);
  }
`;

export interface LayeredAnimatorProps {
  foregroundUrl: string;
  backgroundUrl: string;
  debugSolidBackground?: boolean;
  showForeground?: boolean;
  debugPlainMaterials?: boolean;
  foregroundScaleMultiplier?: number;
  foregroundZOffset?: number;
  foregroundPixelYOffset?: number;
  foregroundPivot?: ForegroundPivot;
  foregroundRenderOrder?: number;
}

export function LayeredAnimator({
  foregroundUrl,
  backgroundUrl,
  debugSolidBackground = false,
  showForeground = true,
  debugPlainMaterials = false,
  foregroundScaleMultiplier,
  foregroundZOffset,
  foregroundPixelYOffset,
  foregroundPivot = "center",
  foregroundRenderOrder,
}: LayeredAnimatorProps) {
  const bgTex = useTexture(backgroundUrl);
  const fgTex = useTexture(foregroundUrl);
  const bgMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const fgMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const { viewport, size, gl } = useThree();
  const { audioReactive, audioIntensity } = useParallaxStore();
  const { bassEnergy: rawBass, midEnergy: rawMid, highEnergy: rawHigh, isPlaying } = useAudioStore();
  const { bassEnabled, midEnabled, highEnabled } = useVisualizerStore();

  // Apply toggle switches to energy values
  const bassEnergy = bassEnabled ? rawBass : 0;
  const midEnergy = midEnabled ? rawMid : 0;
  const highEnergy = highEnabled ? rawHigh : 0;

  useEffect(() => {
    const debug = gl.debug;
    const prev = debug.onShaderError;
    debug.onShaderError = (renderer, program, vertexShader, fragmentShader) => {
      const vertexLog = renderer.getShaderInfoLog(vertexShader);
      const fragmentLog = renderer.getShaderInfoLog(fragmentShader);
      const vertexSource = renderer.getShaderSource(vertexShader);
      const fragmentSource = renderer.getShaderSource(fragmentShader);
      console.group("[LayeredAnimator] shader compile error");
      console.log("vertexLog", vertexLog);
      console.log("fragmentLog", fragmentLog);
      console.log("vertexSource", vertexSource);
      console.log("fragmentSource", fragmentSource);
      console.groupEnd();
      if (prev) prev(renderer, program, vertexShader, fragmentShader);
    };
    debug.checkShaderErrors = true;
    return () => {
      debug.onShaderError = prev;
    };
  }, [gl]);

  const bgUniforms = useMemo(
    () => ({
      uTexture: { value: bgTex },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uTime: { value: 0 },
    }),
    [bgTex]
  );

  const fgUniforms = useMemo(
    () => ({
      uTexture: { value: fgTex },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uTime: { value: 0 },
    }),
    [fgTex]
  );

  const bgBaseScale = useMemo(
    () => getPlaneScale(bgTex, viewport),
    [bgTex, viewport.width, viewport.height]
  );

  const fgBaseScale = useMemo(
    () => getPlaneScale(fgTex, viewport),
    [fgTex, viewport.width, viewport.height]
  );

  const bgScale: [number, number, number] = [
    bgBaseScale[0] * 1.02,
    bgBaseScale[1] * 1.02,
    1,
  ];

  const fgScaleMultiplierRaw =
    foregroundScaleMultiplier ?? (foregroundPivot === "bottom-center" ? 1.18 : 1);
  const fgScaleMultiplier =
    foregroundPivot === "bottom-center"
      ? THREE.MathUtils.clamp(fgScaleMultiplierRaw, 1.15, 1.2)
      : fgScaleMultiplierRaw;

  const fgZOffset =
    foregroundZOffset ?? (foregroundPivot === "bottom-center" ? 0.05 : 0);

  const fgOrder = foregroundRenderOrder ?? 1;

  const fgTransform = useMemo(
    () => {
      const pixelsToWorldY = size.height > 0 ? viewport.height / size.height : 0;
      const yOffset = (foregroundPixelYOffset ?? 0) * pixelsToWorldY;

      return getForegroundMeshTransform({
        baseScale: fgBaseScale,
        anchorHeight: bgBaseScale[1],
        pivot: foregroundPivot,
        scaleMultiplier: fgScaleMultiplier,
        zOffset: fgZOffset,
        yOffset,
        renderOrder: fgOrder,
      });
    },
    [
      fgBaseScale,
      bgBaseScale,
      foregroundPivot,
      fgScaleMultiplier,
      fgZOffset,
      fgOrder,
      foregroundPixelYOffset,
      viewport.height,
      size.height,
    ]
  );

  const fgBottomCenterGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.translate(0, 0.5, 0);
    return geometry;
  }, []);

  useFrame((state) => {
    const bgMat = bgMatRef.current;
    const fgMat = fgMatRef.current;
    if (!bgMat || !fgMat) return;

    const t = state.clock.elapsedTime;
    const enabled = audioReactive && isPlaying;

    let uBass = 0;
    let uMid = 0;
    let uHigh = 0;

    const bassForShader = enabled ? bassEnergy * audioIntensity : 0;
    const midForShader = enabled ? midEnergy * audioIntensity : 0;
    const highForShader = enabled ? highEnergy * audioIntensity : 0;
    const THRESHOLD = 0.3;
    uBass = bassForShader > THRESHOLD ? (bassForShader - THRESHOLD) / (1 - THRESHOLD) : 0;
    uMid = midForShader;   // Snare / mid
    uHigh = highForShader;   // highs

    bgMat.uniforms.uBass.value = uBass;
    bgMat.uniforms.uMid.value = uMid;
    bgMat.uniforms.uHigh.value = uHigh;
    bgMat.uniforms.uTime.value = t;

    fgMat.uniforms.uBass.value = uBass;
    fgMat.uniforms.uMid.value = uMid;
    fgMat.uniforms.uHigh.value = uHigh;
    fgMat.uniforms.uTime.value = t;

  });

  return (
    <group>
      {/* 背景层：稍远、稍大 */}
      {debugSolidBackground ? (
        <mesh position={[0, 0, -0.15]} scale={bgScale} renderOrder={0}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      ) : debugPlainMaterials ? (
        <mesh position={[0, 0, -0.15]} scale={bgScale} renderOrder={0}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={bgTex} />
        </mesh>
      ) : (
        <mesh position={[0, 0, -0.15]} scale={bgScale} renderOrder={0}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            ref={bgMatRef}
            vertexShader={vertexShader}
            fragmentShader={backgroundFragmentShader}
            uniforms={bgUniforms}
            transparent
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 前景层：稍近、可缩放 */}
      {showForeground && (
        debugPlainMaterials ? (
          <mesh
            position={fgTransform.position}
            scale={fgTransform.scale}
            renderOrder={fgTransform.renderOrder}
          >
            {foregroundPivot === "bottom-center" ? (
              <primitive object={fgBottomCenterGeometry} attach="geometry" />
            ) : (
              <planeGeometry args={[1, 1]} />
            )}
            <meshBasicMaterial map={fgTex} transparent />
          </mesh>
        ) : (
          <mesh
            position={fgTransform.position}
            scale={fgTransform.scale}
            renderOrder={fgTransform.renderOrder}
          >
            {foregroundPivot === "bottom-center" ? (
              <primitive object={fgBottomCenterGeometry} attach="geometry" />
            ) : (
              <planeGeometry args={[1, 1]} />
            )}
            <shaderMaterial
              ref={fgMatRef}
              vertexShader={vertexShader}
              fragmentShader={foregroundFragmentShader}
              uniforms={fgUniforms}
              transparent
              depthWrite={false}
            />
          </mesh>
        )
      )}
    </group>
  );
}
