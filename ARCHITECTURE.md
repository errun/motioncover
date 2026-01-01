# MotionCover 项目架构文档

> **目的**：帮助 AI 编程助手（Augment、Codex、Cursor 等）快速理解项目结构和模块关系。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16 | App Router, React Server Components |
| React | 19 | UI 框架 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 4 | 样式系统 |
| Three.js + R3F | 0.182 | 3D 渲染引擎 |
| Zustand | 5 | 状态管理 |

## 目录结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/                # API Route Handlers
│   │   ├── canvas/         # Canvas 数据接口
│   │   ├── depth/          # 深度图生成接口
│   │   ├── search/         # 搜索接口
│   │   └── health/         # 健康检查
│   ├── visualizer/         # 可视化器页面
│   ├── downloader/         # Canvas 下载器页面
│   ├── canvas/             # Canvas 结果展示页面
│   ├── charts/             # 排行榜页面
│   └── ...
│
├── features/               # 功能模块 (Feature-based Architecture)
│   ├── visualizer/         # 音乐可视化模块
│   │   ├── components/     # 模块专属组件
│   │   │   ├── effects/    # 3D 特效组件
│   │   │   └── particles/  # 粒子系统组件
│   │   ├── store.ts        # Zustand Store
│   │   ├── types.ts        # 模块类型
│   │   └── index.ts        # 统一导出
│   └── parallax/           # 2.5D 视差动画模块
│       ├── components/     # 视差组件
│       ├── store.ts        # Zustand Store
│       └── index.ts        # 统一导出
│
├── components/             # 全局通用 UI 组件
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── SearchBox.tsx
│   └── Skeleton.tsx
│
├── services/               # 业务服务层 (调用外部 API)
│   ├── spotifyAuth.ts      # Spotify 认证
│   ├── spotifyService.ts   # Spotify 业务逻辑
│   └── index.ts            # 统一导出
│
├── lib/                    # 基础工具库 (无业务逻辑)
│   ├── env.ts              # 环境变量
│   ├── redis.ts            # 缓存客户端
│   ├── httpClient.ts       # HTTP 请求封装
│   ├── logger.ts           # 日志工具
│   ├── linkResolver.ts     # Spotify 链接解析
│   └── utils.ts            # 通用工具函数
│
├── hooks/                  # 全局自定义 Hooks
│   └── useAudioAnalyser.ts # 音频分析 Hook
│
├── constants/              # 全局常量配置
│   └── index.ts            # 预设、配色、3D参数等
│
└── types/                  # 全局类型定义 (重导出 features 类型)
    └── index.ts
```

## 模块关系图

```
┌─────────────────────────────────────────────────────────────┐
│                        app/ (页面路由)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │visualizer│ │downloader│ │  charts  │ │  canvas  │ ...    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                    features/ (功能模块)                       │
│        ┌──────────────┐         ┌──────────────┐            │
│        │  visualizer  │         │   parallax   │            │
│        │ store, types │         │ store, types │            │
│        │  components  │         │  components  │            │
│        └──────┬───────┘         └──────┬───────┘            │
└───────────────┼────────────────────────┼────────────────────┘
                │                        │
                ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│              共享层 (components, services, lib)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │components│ │ services │ │   lib    │ │  hooks   │        │
│  │  Header  │ │ spotify  │ │  redis   │ │ audio    │        │
│  │  Footer  │ │  Auth    │ │  logger  │ │ Analyser │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 constants/ + types/ (配置与类型)              │
└─────────────────────────────────────────────────────────────┘
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/canvas` | GET | 获取 Spotify Canvas 视频 URL |
| `/api/search` | GET | 搜索 Spotify 曲目 |
| `/api/depth` | POST | 生成深度图 |
| `/api/layers` | POST | 分层图片处理 |
| `/api/artist/[id]` | GET | 获取艺术家信息 |
| `/api/health` | GET | 健康检查 |

## 关键数据流

### 1. Visualizer 数据流
```
用户上传图片 → ImageUploader → store.setImage()
                                    ↓
API /depth 生成深度图 → store.setDepthMap()
                                    ↓
用户播放音频 → AudioPlayer → useAudioAnalyser → store.bassEnergy
                                    ↓
VisualizerCanvas 读取 store → Three.js 渲染 → 实时效果
```

### 2. Canvas Downloader 数据流
```
用户输入 Spotify URL → SearchBox
                          ↓
API /api/canvas → spotifyService.getCanvasUrl()
                          ↓
返回视频 URL → 前端播放/下载
```

## 环境变量

| 变量名 | 用途 | 必需 |
|--------|------|------|
| `SPOTIFY_CLIENT_ID` | Spotify API 客户端 ID | ✅ |
| `SPOTIFY_CLIENT_SECRET` | Spotify API 密钥 | ✅ |
| `SPOTIFY_SP_DC` | Spotify Cookie (Canvas 访问) | ⚠️ |
| `KV_REST_API_URL` | Vercel KV 缓存 URL | ❌ |
| `KV_REST_API_TOKEN` | Vercel KV Token | ❌ |
| `NEXT_PUBLIC_SITE_URL` | 站点公开 URL | ❌ |

