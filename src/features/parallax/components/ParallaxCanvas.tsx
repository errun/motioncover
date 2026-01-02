"use client";

/**
 * 2.5D 视差效果 Canvas
 * 使用深度图实现图片视差动画
 */

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useParallaxStore } from "../store";
import { useAudioStore } from "@/features/audio";

// ============================================
// 视差着色器 v5 - Anyma 幻觉版：
// + Snare 检测驱动的"变异/不稳定"效果
// 1. 呼吸感 Breathing
// 2. 边缘光 Rim Light
// 3. RGB 色差炸裂
// 4. 🆕 Snare 变异效果（噪点扭曲 + Glitch + 像素化）
// ============================================
const parallaxShader = {
  vertexShader: `
    uniform sampler2D uDepthMap;
    uniform float uStrength;
    uniform float uBass;
    uniform float uHighFreq;
    uniform float uBreathing;
    uniform float uMicroRotation;
    uniform float uSnare;         // 🆕 军鼓/Snare 强度
    uniform float uTime;          // 🆕 时间（用于噪点）
    varying vec2 vUv;
    varying float vDepth;

    // 伪随机噪点
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vUv = uv;
      float depth = texture2D(uDepthMap, uv).r;
      vDepth = depth;

      // === 基础 2.5D 位移 ===
      float baseDisplacement = (depth - 0.5) * 2.0 * 0.6 * uStrength;

      // === 背景：Bass 驱动后退 ===
      float backgroundFactor = 1.0 - depth;
      float bassDisplacement = uBass * 1.8 * backgroundFactor;
      float audioDisplacement = -bassDisplacement;

      float totalDisplacement = baseDisplacement + audioDisplacement;
      vec3 newPosition = position + normal * totalDisplacement;

      // === 呼吸感 ===
      float breathScale = 1.0 - uBreathing * 0.03;
      newPosition.xy *= breathScale;

      // === 微旋转 ===
      float angle = uMicroRotation * 0.02;
      float cosA = cos(angle);
      float sinA = sin(angle);
      vec2 rotated = vec2(
        newPosition.x * cosA - newPosition.y * sinA,
        newPosition.x * sinA + newPosition.y * cosA
      );
      newPosition.xy = rotated;

      // Snare 顶点扭曲已移除

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform sampler2D uDepthMap;
    uniform float uBass;
    uniform float uHighFreq;
    uniform float uBreathing;
    uniform float uSnare;         // 🆕 军鼓强度
    uniform float uTime;          // 🆕 时间
    varying vec2 vUv;
    varying float vDepth;

    // 伪随机
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    // 噪点函数
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    // 采样背景主色调
    vec3 sampleBackgroundColor(vec2 uv) {
      vec2 texel = vec2(1.0 / 256.0);
      vec3 totalColor = vec3(0.0);
      float count = 0.0;
      for (float x = -3.0; x <= 3.0; x += 1.0) {
        for (float y = -3.0; y <= 3.0; y += 1.0) {
          vec2 sampleUv = uv + texel * vec2(x, y) * 4.0;
          float sampleDepth = texture2D(uDepthMap, sampleUv).r;
          if (sampleDepth < 0.4) {
            vec3 bgColor = texture2D(uTexture, sampleUv).rgb;
            float luminance = dot(bgColor, vec3(0.299, 0.587, 0.114));
            vec3 saturated = mix(vec3(luminance), bgColor, 1.5);
            totalColor += saturated;
            count += 1.0;
          }
        }
      }
      return count > 0.0 ? totalColor / count : vec3(0.5);
    }

    void main() {
      float depth = texture2D(uDepthMap, vUv).r;
      float foregroundMask = smoothstep(0.4, 0.6, depth);
      float backgroundMask = 1.0 - foregroundMask;

      // UV 扭曲已移除，直接使用原始 UV
      vec2 distortedUv = vUv;

      // === 🆕 Glitch 水平扫描线 ===
      float glitchLine = 0.0;
      if (uSnare > 0.3) {
        float lineY = fract(uTime * 5.0);
        float lineMask = smoothstep(0.0, 0.02, abs(vUv.y - lineY));
        lineMask *= smoothstep(0.05, 0.02, abs(vUv.y - lineY));
        glitchLine = (1.0 - lineMask) * uSnare * 0.5;
        // 扫描线处 UV 水平偏移
        distortedUv.x += glitchLine * 0.03 * (random(vec2(floor(vUv.y * 50.0), uTime)) - 0.5);
      }

      // === RGB 色差（高频 + Snare 增强）===
      float chromaBase = 0.002;
      float chromaBoost = uHighFreq * 0.035 + uSnare * 0.02;
      float chromaAmount = (chromaBase + chromaBoost) * foregroundMask;

      vec2 chromaOffsetR = vec2(chromaAmount, chromaAmount * 0.6);
      vec2 chromaOffsetB = vec2(-chromaAmount, -chromaAmount * 0.6);

      float r = texture2D(uTexture, distortedUv + chromaOffsetR).r;
      float g = texture2D(uTexture, distortedUv).g;
      float b = texture2D(uTexture, distortedUv + chromaOffsetB).b;
      vec4 color = vec4(r, g, b, 1.0);

      // === 🆕 像素化效果（Snare 强时）===
      if (uSnare > 0.5) {
        float pixelSize = 80.0 - uSnare * 40.0;  // Snare 越强，像素越大
        vec2 pixelUv = floor(distortedUv * pixelSize) / pixelSize;
        vec4 pixelColor = texture2D(uTexture, pixelUv);
        color = mix(color, pixelColor, (uSnare - 0.5) * 0.6 * foregroundMask);
      }

      // === 背景脉冲 ===
      float bgPulse = 1.0 + uBass * 0.5 * backgroundMask;
      color.rgb *= bgPulse;

      // === RIM LIGHT 边缘光 ===
      float edgeMask = smoothstep(0.35, 0.5, depth) * smoothstep(0.7, 0.5, depth);
      edgeMask = pow(edgeMask, 0.6) * 2.5;
      vec3 bgColor = sampleBackgroundColor(vUv);
      vec3 rimLight = bgColor * (0.3 + uBass * 1.5);
      color.rgb += rimLight * edgeMask * foregroundMask;

      // === 呼吸闪光 ===
      color.rgb *= 1.0 + uBreathing * 0.15;

      // === 🆕 Snare 闪白（瞬间高亮）===
      color.rgb += vec3(uSnare * 0.2) * foregroundMask;

      // === 🆕 噪点叠加（Snare 时）===
      if (uSnare > 0.2) {
        float grainAmount = uSnare * 0.15;
        float grain = random(vUv * 500.0 + uTime * 100.0) * grainAmount;
        color.rgb += vec3(grain) * foregroundMask;
      }

      // === 🆕 色彩偏移/不稳定（Snare 强时）===
      if (uSnare > 0.6) {
        float hueShift = (uSnare - 0.6) * 0.3;
        // 简化的色相偏移
        color.r *= 1.0 + hueShift * 0.5;
        color.b *= 1.0 - hueShift * 0.3;
      }

      // === 景深虚化 ===
      vec2 texel = vec2(1.0 / 1024.0);
      float blurAmount = backgroundMask * 0.2;
      if (blurAmount > 0.08) {
        vec4 blurred = color * 0.6;
        blurred += texture2D(uTexture, distortedUv + texel * vec2(2.0, 0.0)) * 0.1;
        blurred += texture2D(uTexture, distortedUv - texel * vec2(2.0, 0.0)) * 0.1;
        blurred += texture2D(uTexture, distortedUv + texel * vec2(0.0, 2.0)) * 0.1;
        blurred += texture2D(uTexture, distortedUv - texel * vec2(0.0, 2.0)) * 0.1;
        color = mix(color, blurred, blurAmount);
      }

      gl_FragColor = color;
    }
  `,
};

interface ParallaxMeshProps {
  imageUrl: string;
  depthMapUrl: string;
}

export function ParallaxMesh({ imageUrl, depthMapUrl }: ParallaxMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const timeRef = useRef(0);

  const { 
    parallaxStrength, 
    cameraMotion, 
    motionSpeed, 
    autoAnimate,
    audioReactive,
    audioIntensity,
  } = useParallaxStore();
  
  const { bassEnergy, isPlaying, frequencyData } = useAudioStore();

  // 加载纹理
  const [texture, depthMap] = useTexture([imageUrl, depthMapUrl]);
  
  // 保持图片比例，拿到相机用于 Ken Burns 推拉
  const { viewport, camera } = useThree();
  const textureImage = texture.image as { width: number; height: number } | undefined;
  const imageAspect = textureImage ? textureImage.width / textureImage.height : 1;
  const viewportAspect = viewport.width / viewport.height;
  
  const scale = useMemo(() => {
    if (imageAspect > viewportAspect) {
      return [viewport.width, viewport.width / imageAspect, 1] as [number, number, number];
    }
    return [viewport.height * imageAspect, viewport.height, 1] as [number, number, number];
  }, [viewport, imageAspect, viewportAspect]);

  // 创建 shader uniforms
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uDepthMap: { value: depthMap },
      uStrength: { value: parallaxStrength },
      uBass: { value: 0 },
      uHighFreq: { value: 0 },
      uBreathing: { value: 0 },
      uMicroRotation: { value: 0 },
      uSnare: { value: 0 },           // 🆕 军鼓/Snare 强度
      uTime: { value: 0 },            // 🆕 时间（用于噪点动画）
    }),
    [texture, depthMap, parallaxStrength]
  );

  // 计算高频能量（用于色差）
  const calculateHighFreqEnergy = (freqData: Uint8Array | null): number => {
    if (!freqData || freqData.length === 0) return 0;
    const highStart = Math.floor(freqData.length * 0.5);
    let sum = 0;
    for (let i = highStart; i < freqData.length; i++) {
      sum += freqData[i];
    }
    return sum / ((freqData.length - highStart) * 255);
  };

  // 🆕 检测 Snare（军鼓）- 中高频瞬态
  // Snare 主要在 2-5kHz 范围，检测突然的能量增加
  const prevHighFreqRef = useRef(0);
  const snareRef = useRef(0);

  const detectSnare = (freqData: Uint8Array | null): number => {
    if (!freqData || freqData.length === 0) return 0;

    // Snare 频率范围：约 2-5kHz（FFT bin 的 25%-50%）
    const snareStart = Math.floor(freqData.length * 0.25);
    const snareEnd = Math.floor(freqData.length * 0.5);

    let sum = 0;
    for (let i = snareStart; i < snareEnd; i++) {
      sum += freqData[i];
    }
    const currentEnergy = sum / ((snareEnd - snareStart) * 255);

    // 检测瞬态：当前能量比上一帧高出多少
    const delta = currentEnergy - prevHighFreqRef.current;
    prevHighFreqRef.current = currentEnergy;

    // 只有正向增量（突然增加）才算 Snare hit
    return delta > 0.05 ? Math.min(delta * 3, 1.0) : 0;
  };

  // 状态 refs
  const breathingRef = useRef(0);
  const microRotRef = useRef(0);
  const cameraShakeRef = useRef({ x: 0, y: 0 });

	  // 记录基础相机 Z，用于 Ken Burns 式缓慢推拉
	  const baseCameraZRef = useRef(camera.position.z);

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return;
    
    timeRef.current += delta * motionSpeed;
    const t = timeRef.current;

    // 自动相机运动（生成一个目标“视线方向”向量，稍后映射到旋转）
    if (autoAnimate) {
      switch (cameraMotion) {
        case "circular":
          mouseRef.current.x = Math.sin(t) * 0.8;
          mouseRef.current.y = Math.cos(t) * 0.8;
          break;
        case "horizontal":
          mouseRef.current.x = Math.sin(t) * 1.2;
          mouseRef.current.y = 0;
          break;
        case "vertical":
          mouseRef.current.x = 0;
          mouseRef.current.y = Math.sin(t) * 1.2;
          break;
        case "zoom":
          const zoomFactor = Math.sin(t * 0.5) * 0.3 + 1;
          mouseRef.current.x = Math.sin(t * 2) * 0.2 * zoomFactor;
          mouseRef.current.y = Math.cos(t * 2) * 0.2 * zoomFactor;
          break;
        case "random":
          mouseRef.current.x += (Math.random() - 0.5) * 0.05;
          mouseRef.current.y += (Math.random() - 0.5) * 0.05;
          mouseRef.current.x *= 0.98;
          mouseRef.current.y *= 0.98;
          break;
        case "breathe":
	          // Cinematic / Ken Burns 
	          const kbT = t * 0.15;
	          mouseRef.current.x = Math.sin(kbT) * 0.4;
	          mouseRef.current.y = Math.sin(kbT * 0.7) * 0.25;
	          break;
      }
    }

    // ===== 音频分析 =====
    const rawBass = audioReactive && isPlaying ? bassEnergy * audioIntensity : 0;
    const highFreq = audioReactive && isPlaying ? calculateHighFreqEnergy(frequencyData) * audioIntensity : 0;

    // 🆕 Snare 检测（瞬态检测）
    const snareHit = audioReactive && isPlaying ? detectSnare(frequencyData) * audioIntensity : 0;

    // 阈值门限：Bass > 30% 才触发效果
    const THRESHOLD = 0.3;
    const gatedBass = rawBass > THRESHOLD
      ? (rawBass - THRESHOLD) / (1 - THRESHOLD)
      : 0;

    // 🆕 Snare 平滑（快速攻击，中速衰减）
    if (snareHit > snareRef.current) {
      snareRef.current = snareHit;  // 瞬时攻击
    } else {
      snareRef.current *= 0.85;     // 衰减
    }

    // ===== 1. 呼吸感 BREATHING =====
    const breathTarget = gatedBass;
    if (breathTarget > breathingRef.current) {
      breathingRef.current += (breathTarget - breathingRef.current) * 0.6;
    } else {
      breathingRef.current += (breathTarget - breathingRef.current) * 0.08;
    }

    // ===== 2. 微旋转 MICRO-ROTATION =====
    const rotTarget = (gatedBass - 0.5) * 2 * (Math.sin(t * 3) > 0 ? 1 : -1);
    microRotRef.current += (rotTarget - microRotRef.current) * 0.1;

    // ===== 3. CAMERA ZOOM PUNCH =====
    const baseCamZ = baseCameraZRef.current;
    const zoomPunch = gatedBass * 0.8;
    const targetCamZ = baseCamZ - zoomPunch;

    if (targetCamZ < camera.position.z) {
      camera.position.z += (targetCamZ - camera.position.z) * 0.5;
    } else {
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
    }

    // ===== 4. DROP 时相机震动 =====
    if (gatedBass > 0.7) {
      const shakeIntensity = (gatedBass - 0.7) * 0.15;
      cameraShakeRef.current.x = (Math.random() - 0.5) * shakeIntensity;
      cameraShakeRef.current.y = (Math.random() - 0.5) * shakeIntensity;
    } else {
      cameraShakeRef.current.x *= 0.85;
      cameraShakeRef.current.y *= 0.85;
    }

    // 🆕 Snare 时额外震动
    if (snareRef.current > 0.3) {
      const snareShake = snareRef.current * 0.05;
      cameraShakeRef.current.x += (Math.random() - 0.5) * snareShake;
      cameraShakeRef.current.y += (Math.random() - 0.5) * snareShake;
    }

    // 相机位置
    if (cameraMotion === "breathe" && !audioReactive) {
      const kbT2 = t * 0.12;
      camera.position.x += (Math.sin(kbT2) * 0.3 - camera.position.x) * 0.03;
      camera.position.y += (Math.cos(kbT2 * 0.8) * 0.2 - camera.position.y) * 0.03;
    } else {
      camera.position.x += (cameraShakeRef.current.x - camera.position.x) * 0.3;
      camera.position.y += (cameraShakeRef.current.y - camera.position.y) * 0.3;
    }
    camera.lookAt(0, 0, 0);

    // ===== MESH 稳定 =====
    const currentScale = meshRef.current.scale;
    currentScale.x += (scale[0] - currentScale.x) * 0.1;
    currentScale.y += (scale[1] - currentScale.y) * 0.1;
    meshRef.current.position.z += (0 - meshRef.current.position.z) * 0.1;

    const targetRotX = -mouseRef.current.y * 0.15;
    const targetRotY = mouseRef.current.x * 0.15;
    meshRef.current.rotation.x += (targetRotX - meshRef.current.rotation.x) * 0.1;
    meshRef.current.rotation.y += (targetRotY - meshRef.current.rotation.y) * 0.1;

    // ===== 更新 SHADER UNIFORMS =====
    materialRef.current.uniforms.uStrength.value = parallaxStrength;
    materialRef.current.uniforms.uBass.value = gatedBass;
    materialRef.current.uniforms.uHighFreq.value = highFreq;
    materialRef.current.uniforms.uBreathing.value = breathingRef.current;
    materialRef.current.uniforms.uMicroRotation.value = microRotRef.current;
    materialRef.current.uniforms.uSnare.value = snareRef.current;  // 🆕
    materialRef.current.uniforms.uTime.value = t;                   // 🆕
  });

  return (
    <mesh ref={meshRef} scale={scale}>
      {/* 提高细分度，让深度起伏更细腻 */}
      <planeGeometry args={[1, 1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={parallaxShader.vertexShader}
        fragmentShader={parallaxShader.fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
