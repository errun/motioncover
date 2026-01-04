"use client";

/**
 * 效果预览页 - 网格布局多效果独立预览
 */

import { Suspense, useEffect, useRef, ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  BassParticles,
  FireParticles,
  GlowParticles,
  SmokeParticles,
  PostEffects,
} from "@/features/visualizer/components";
import { AudioVisualizer } from "@/features/visualizer/components/AudioVisualizer";
import { useAudioStore } from "@/features/audio";
import { useVisualizerStore } from "@/features/visualizer";

// 效果配置
interface EffectConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  component: ReactNode;
  category: "particle" | "post";
}

const EFFECTS: EffectConfig[] = [
  { id: "bass", name: "Bass Particles", description: "低音脉冲粒子环，随节拍向外扩散", color: "#22c55e", category: "particle", component: <BassParticles /> },
  { id: "fire", name: "Fire Particles", description: "底部火焰粒子，向上飘动", color: "#f97316", category: "particle", component: <FireParticles /> },
  { id: "glow", name: "Glow Particles", description: "发光漂浮粒子，随机运动", color: "#a855f7", category: "particle", component: <GlowParticles /> },
  { id: "smoke", name: "Smoke Particles", description: "烟雾粒子效果，缓慢扩散", color: "#64748b", category: "particle", component: <SmokeParticles /> },
  { id: "vhs", name: "VHS Effects", description: "色差 + 噪点 + 扫描线", color: "#ec4899", category: "post", component: <PostEffects /> },
];

// 自动模拟 Bass 的 Hook
function useAutoSimulateBass() {
  const frameRef = useRef(0);
  const { setBassEnergy, setMidEnergy, setHighEnergy, setSnareHit, setIsPlaying } = useAudioStore();

  useEffect(() => {
    setIsPlaying(true);
    const interval = setInterval(() => {
      frameRef.current++;
      const bass = Math.sin(frameRef.current * 0.08) * 0.35 + 0.5 + Math.random() * 0.15;
      const mid = Math.sin(frameRef.current * 0.12 + 1.2) * 0.3 + 0.45 + Math.random() * 0.1;
      const high = Math.sin(frameRef.current * 0.2 + 2.4) * 0.25 + 0.35 + Math.random() * 0.08;
      const snare = Math.random() > 0.86 ? 0.9 : 0;
      setBassEnergy(Math.max(0, Math.min(1, bass)));
      setMidEnergy(Math.max(0, Math.min(1, mid)));
      setHighEnergy(Math.max(0, Math.min(1, high)));
      setSnareHit(snare);
    }, 50);
    return () => {
      clearInterval(interval);
      setIsPlaying(false);
      setBassEnergy(0);
      setMidEnergy(0);
      setHighEnergy(0);
      setSnareHit(0);
    };
  }, [setBassEnergy, setIsPlaying]);
}

// 旋转的参考立方体
function ReferenceCube() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.8, 1.4, 0.1]} />
      <meshStandardMaterial color="#1a1a2e" />
    </mesh>
  );
}

// 单个效果预览卡片
function EffectCard({ effect }: { effect: EffectConfig }) {
  return (
    <div className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all hover:scale-[1.02]">
      {/* 3D 预览区 */}
      <div className="aspect-[9/16] max-h-[320px] bg-black">
        <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <pointLight position={[5, 5, 5]} intensity={0.6} />
            <ReferenceCube />
            {effect.component}
            {effect.category === "post" && <PostEffects />}
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
          </Suspense>
        </Canvas>
      </div>

      {/* 信息区 */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: effect.color }} />
          <h3 className="font-bold text-white">{effect.name}</h3>
        </div>
        <p className="text-sm text-zinc-400">{effect.description}</p>
        <div className="mt-2">
          <span className={`text-xs px-2 py-0.5 rounded ${
            effect.category === "particle" ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"
          }`}>
            {effect.category === "particle" ? "粒子效果" : "后处理"}
          </span>
        </div>
      </div>
    </div>
  );
}

// Bass 模拟器组件
function BassSimulator() {
  useAutoSimulateBass();
  const { bassEnergy } = useAudioStore();

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-lg px-4 py-2 flex items-center gap-3">
      <div className="text-sm text-zinc-400">Bass:</div>
      <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-100"
          style={{ width: `${bassEnergy * 100}%` }}
        />
      </div>
      <div className="text-xs text-zinc-500 w-8">{(bassEnergy * 100).toFixed(0)}%</div>
    </div>
  );
}

export default function EffectsPreviewPage() {
  // 启用 VHS 效果以便预览
  const { setVhsEnabled } = useVisualizerStore();
  useEffect(() => {
    setVhsEnabled(true);
    return () => setVhsEnabled(false);
  }, [setVhsEnabled]);

	  return (
	    <div className="min-h-screen bg-black text-white">
	      {/* Header */}
	      <header className="border-b border-zinc-800 p-6">
	        <h1 className="text-3xl font-bold">
	          <span className="text-green-500">🎨</span> 效果库
	        </h1>
	        <p className="text-zinc-400 mt-1">
	          所有可用的视觉效果预览 · 拖拽旋转查看 · 自动模拟音频响应
	        </p>
	      </header>
	
	      <main className="p-6 space-y-8">
	        {/* 主示例：音频 Shader 化封面 */}
	        <section>
	          <div className="group relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-purple-500/70 transition-colors">
	            <div className="aspect-[16/9] w-full bg-black">
	              <AudioVisualizer
	                audioSrc=""
	                coverSrc="/placeholder-cover.svg"
	                className="w-full h-full"
	              />
	            </div>
	            <div className="p-4 border-t border-zinc-800 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
	              <div>
	                <div className="text-xs text-purple-300 mb-1">
	                  功能 1 · 音频 Shader 化专辑封面
	                </div>
	                <p className="text-sm text-zinc-300">
	                  使用 Web Audio + ShaderMaterial，让静态封面随低频“呼吸”、高频闪亮，是所有效果的基础视觉语言示例。
	                </p>
	              </div>
	              <span className="text-[11px] text-zinc-500">
	                当前示例使用内置 placeholder-cover.svg，后续可替换为你自己的封面与音频路径。
	              </span>
	            </div>
	          </div>
	        </section>

	        {/* 效果网格 */}
	        <section>
	          <h2 className="text-sm font-semibold text-zinc-200 mb-2">效果库</h2>
	          <p className="text-xs text-zinc-500 mb-4">
	            下方为可单独预览的粒子 / 后期效果模块，可与上方主示例组合使用。
	          </p>
	          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
	            {EFFECTS.map(effect => (
	              <EffectCard key={effect.id} effect={effect} />
	            ))}
	          </div>
	        </section>
	      </main>

	      {/* Bass 模拟器 */}
	      <BassSimulator />
	    </div>
	  );
}
