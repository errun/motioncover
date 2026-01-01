# MotionCover 编码规范

> **目的**：确保 AI 编程助手生成的代码与项目风格一致。

## 文件命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| React 组件 | PascalCase | `AudioPlayer.tsx` |
| Hook | camelCase + use 前缀 | `useAudioAnalyser.ts` |
| Store | camelCase + Store 后缀 | `audioStore.ts` |
| 工具函数 | camelCase | `utils.ts`, `httpClient.ts` |
| 类型文件 | camelCase 或 index | `types.ts`, `index.ts` |
| API Route | 小写 + 连字符 | `parse-canvas/route.ts` |
| 常量 | UPPER_SNAKE_CASE | `AUDIO_CONFIG` |

## 目录规范

### 功能模块 (features/)

每个功能模块应包含：
```
features/[module]/
├── components/         # 模块专属组件
│   ├── ComponentA.tsx
│   ├── ComponentB.tsx
│   └── index.ts        # 统一导出
├── store.ts            # Zustand Store (可选)
├── types.ts            # 模块类型定义
└── index.ts            # 模块入口，统一导出
```

### 导入顺序

```typescript
// 1. React/Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. 第三方库
import { Canvas } from "@react-three/fiber";
import { create } from "zustand";

// 3. 内部模块 (按层级)
import { useVisualizerStore } from "@/features/visualizer";
import { getAccessToken } from "@/services";
import { logger } from "@/lib/logger";
import { AUDIO_CONFIG } from "@/constants";
import type { VisualizerParams } from "@/types";

// 4. 相对路径
import { LocalComponent } from "./LocalComponent";
```

## TypeScript 规范

### 类型定义

```typescript
// ✅ 使用 interface 定义对象类型
interface UserConfig {
  name: string;
  settings: Settings;
}

// ✅ 使用 type 定义联合类型
type PresetName = "default" | "aggressive" | "chill";

// ✅ 导出类型时使用 export type
export type { UserConfig, PresetName };

// ❌ 避免 any
const data: any = fetchData(); // 不推荐

// ✅ 使用 unknown + 类型守卫
const data: unknown = fetchData();
if (isUserConfig(data)) { /* ... */ }
```

### 函数签名

```typescript
// ✅ 明确的返回类型
export function calculateBass(frequency: number): number {
  return frequency * 0.5;
}

// ✅ 异步函数
export async function fetchTrack(id: string): Promise<TrackInfo | null> {
  // ...
}
```

## React 组件规范

### 组件结构

```typescript
"use client"; // 仅客户端组件需要

import { useState } from "react";
import type { ComponentProps } from "./types";

interface Props {
  title: string;
  onAction?: () => void;
}

export default function MyComponent({ title, onAction }: Props) {
  // 1. Hooks
  const [state, setState] = useState(false);
  
  // 2. 事件处理
  const handleClick = () => {
    setState(true);
    onAction?.();
  };
  
  // 3. 渲染
  return (
    <div className="...">
      <h1>{title}</h1>
      <button onClick={handleClick}>Action</button>
    </div>
  );
}
```

### 命名导出 vs 默认导出

```typescript
// ✅ 页面组件：默认导出
export default function HomePage() { }

// ✅ 功能组件：命名导出 (在 index.ts 中统一)
export { AudioPlayer } from "./AudioPlayer";

// ✅ Hooks/工具函数：命名导出
export function useAudioAnalyser() { }
export const logger = { };
```

## Zustand Store 规范

```typescript
import { create } from "zustand";

interface StoreState {
  // 状态
  count: number;
  // 操作
  increment: () => void;
  reset: () => void;
}

export const useMyStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set({ count: 0 }),
}));
```

## CSS / Tailwind 规范

### 类名顺序

```tsx
<div className={`
  // 1. 布局
  flex items-center justify-between
  // 2. 尺寸
  w-full h-12 p-4
  // 3. 外观
  bg-black border border-gray-700 rounded-lg
  // 4. 字体
  font-mono text-sm text-white
  // 5. 交互/动画
  hover:bg-gray-900 transition-colors
`}>
```

### 设计系统变量

使用预定义的 Phonk 主题色：
```css
--phonk-acid: #39FF14    /* 主强调色 */
--phonk-purple: #B026FF  /* 次要色 */
--phonk-red: #FF003C     /* 警告色 */
--phonk-black: #050505   /* 背景色 */
--phonk-surface: #111111 /* 卡片背景 */
--phonk-border: #333333  /* 边框色 */
```

## API Route 规范

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
```

## 注释规范

```typescript
/**
 * 计算音频低频能量
 * @param analyser - Web Audio AnalyserNode
 * @returns 0-1 范围的能量值
 */
export function calculateBassEnergy(analyser: AnalyserNode): number {
  // 获取频率数据
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  
  // 只取前 10 个频段 (低频)
  const bassRange = data.slice(0, 10);
  
  return bassRange.reduce((a, b) => a + b, 0) / (10 * 255);
}
```

