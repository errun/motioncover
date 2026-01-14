# MotionCover

Inspired by / Alternative: https://motioncover.app/

Deployed with Vercel: https://motioncover-499jvx6h4-erruns-projects.vercel.app | Original tool: https://www.motioncover.app

MotionCover 是一个基于 **Next.js + Three.js** 的音乐视觉工具站，覆盖「Spotify Canvas 下载/预览」与「赛博朋克风格音乐可视化」等能力。

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Three.js](https://img.shields.io/badge/Three.js-r182-black?style=flat-square&logo=three.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)

## 网站功能（What it does）

### Spotify Canvas 工具链

- 粘贴 Spotify 链接/URI/ID，获取歌曲/艺术家/专辑基础信息
- 在线预览 Canvas 循环视频（如有）
- 一键下载 Canvas 视频到本地
- 相关页面：`/downloader`、`/canvas`、`/artist/[id]`、`/search`、`/charts`、`/spotify-canvas`

### Visualizer（Three.js）

- 2.5D Cover（Ken Burns / 视差）：上传图片 → 深度图 → 视差动画 + 音频驱动
- Layered Animator：前景/背景双平面分层渲染 + Shader 光效（霓虹、闪烁、扫线等）
- AI Architect / Surgeon：生成赛博朋克构图图像，并自动切分前景/背景层用于 WebGL 动画预览
- 相关页面：`/visualizer/cover-25d`、`/visualizer/parallax`、`/visualizer/architect`、`/visualizer/cockpit`

### 多语言与 SEO

- 中英文路由（`/zh/*`、`/en/*`）
- 页面级 `Metadata` + OpenGraph + `canonical`

## 快速开始（开发）

### 环境要求

- Node.js 18+
- npm（或 yarn / pnpm）

### 安装 & 运行

```bash
npm install
npm run dev
```

打开：`http://localhost:3000`

## 环境变量（可选但推荐）

复制 `.env.example` 为 `.env.local`，并按需填写：

- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`：用于更完整的元数据
- `SPOTIFY_SP_DC`：用于更稳定地获取 Canvas 视频（从浏览器 Cookie 获取）
- `REPLICATE_API_TOKEN`：启用 AI 能力（Architect、分层、深度图等）
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`：可选缓存（Vercel KV）
- `NEXT_PUBLIC_SITE_URL`：生产环境建议配置，用于 `canonical`/OG 链接

> 说明：未配置 `REPLICATE_API_TOKEN` 时，AI 相关功能会提示缺少配置或自动降级（视具体页面/功能而定）。

## 常用脚本

- `npm run dev`：开发模式
- `npm run build`：构建
- `npm run start`：运行生产构建
- `npm run lint`：ESLint

## 项目结构（简要）

```
src/
  app/                  # Next.js App Router 路由/页面/API
  components/           # Header/Footer 等通用组件
  features/             # 业务模块（canvas-downloader / parallax / visualizer 等）
public/
  imgs/                 # 生成/缓存的图片与分层结果（本地开发）
```

## 免责声明

- 本项目为第三方工具站，不隶属于 Spotify；相关商标与内容归其权利方所有。
- AI/第三方服务可能产生费用与速率限制，请自行评估并遵循对应服务条款。

## 许可证

MIT License

## 贡献

欢迎提交 Issue / PR。
