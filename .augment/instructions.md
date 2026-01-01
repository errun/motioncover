# MotionCover - Augment AI 项目指令

## 项目概述

MotionCover 是一个基于 Next.js 16 的音乐可视化和 Spotify Canvas 下载工具。

## 核心功能模块

1. **Visualizer** (`/visualizer`) - 音频反应式 3D 可视化器，使用 Three.js/R3F
2. **Canvas Downloader** (`/downloader`) - Spotify Canvas 循环视频下载
3. **Charts** (`/charts`) - 排行榜展示
4. **Parallax** - 2.5D 图片视差动画

## 技术栈

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Three.js + React Three Fiber
- Zustand 5

## 代码结构

```
src/
├── app/          # 页面路由和 API Routes
├── features/     # 功能模块 (visualizer, parallax, canvas, charts)
├── components/   # 全局通用组件
├── services/     # Spotify API 服务
├── lib/          # 基础工具库
├── hooks/        # 全局 Hooks
├── stores/       # 全局状态
├── constants/    # 常量配置
└── types/        # 全局类型
```

## 编码规范

### 导入约定

使用 `@/` 路径别名：
```typescript
import { useVisualizerStore } from "@/features/visualizer";
import { getAccessToken } from "@/services";
import { logger } from "@/lib/logger";
import { AUDIO_CONFIG } from "@/constants";
import type { VisualizerParams } from "@/types";
```

### 组件规范

- 客户端组件需要 `"use client"` 指令
- 使用默认导出用于页面组件
- 使用命名导出用于功能组件

### 状态管理

使用 Zustand，主要 Store：
- `useVisualizerStore` - 可视化器状态 (从 `@/features/visualizer`)
- `useParallaxStore` - 视差动画状态 (从 `@/features/parallax`)

### 设计系统

Phonk 主题色：
- `#39FF14` - Acid Green (主强调色)
- `#B026FF` - Purple
- `#FF003C` - Red
- `#050505` - Background

## API 服务

### Spotify 认证

```typescript
import { getAccessToken, getClientCredentialsToken } from "@/services";
```

### Canvas 获取

```typescript
import { getCanvasUrl, getTrackInfo } from "@/services";
```

## 常见任务

### 添加新的可视化效果

1. 在 `src/features/visualizer/components/effects/` 创建新组件
2. 在 `src/features/visualizer/components/effects/index.ts` 导出
3. 在 `VisualizerCanvas.tsx` 中使用

### 添加新页面

1. 在 `src/app/[page-name]/page.tsx` 创建
2. 如有需要，创建对应的 feature 模块

### 添加新的 API 端点

1. 在 `src/app/api/[endpoint]/route.ts` 创建
2. 使用 `logger` 记录日志
3. 返回统一的 `ApiResponse<T>` 格式

## 注意事项

- 不要修改 `src/stores/audioStore.ts`，它是兼容层
- 优先使用 `@/features/visualizer` 中的导出
- Three.js 组件必须在客户端渲染

## 参考文档

- `ARCHITECTURE.md` - 详细架构说明
- `CONVENTIONS.md` - 完整编码规范

