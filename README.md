# Canvas Downloader

一个用于下载和预览 Spotify Canvas 循环视频的 Web 应用。

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ 功能特性

- 🎵 **Canvas 视频下载**：输入 Spotify 歌曲链接，一键下载对应的 Canvas 循环视频
- 🎬 **在线预览**：在网页上直接预览 Canvas 视频，支持完整播放控制
- 🎨 **艺术家信息**：展示艺术家头像和信息，点击可跳转到 Spotify 艺术家主页
- 🎧 **内嵌播放器**：集成 Spotify 官方播放器，可在线试听歌曲
- 📱 **响应式设计**：完美适配桌面端和移动端
- 🌐 **局域网访问**：支持局域网内多设备访问

## 🚀 快速开始

### 环境要求

- **Node.js** 18.x 或更高版本
- **npm** / **yarn** / **pnpm** 包管理器

### 安装步骤

1. **克隆或解压项目**

```bash
cd CanvasDownloader
```

2. **安装依赖**

```bash
npm install
```

或使用 yarn / pnpm：

```bash
yarn install
# 或
pnpm install
```

3. **（可选）配置 Spotify API**

如果你想获取更完整的歌曲元数据，可以配置 Spotify API：

在项目根目录创建 `.env.local` 文件：

```env
SPOTIFY_CLIENT_ID=你的_Client_ID
SPOTIFY_CLIENT_SECRET=你的_Client_Secret
```

> 💡 **如何获取 Spotify API 凭证：**
> 1. 访问 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
> 2. 登录并创建一个新应用
> 3. 复制 Client ID 和 Client Secret

**注意：** 即使不配置 Spotify API，应用仍然可以正常工作，只是部分元数据会通过其他方式获取。

4. **启动开发服务器**

```bash
npm run dev
```

5. **打开浏览器访问**

```
http://localhost:3000
```

## 📖 使用说明

### 基本使用

1. 在首页搜索框中粘贴 Spotify 歌曲链接，例如：
   - `https://open.spotify.com/track/xxxxx`
   - `spotify:track:xxxxx`
   - 或直接输入 Track ID

2. 点击搜索按钮，跳转到 Canvas 详情页

3. 在详情页可以：
   - 查看艺术家信息（点击头像可跳转到艺术家主页）
   - 在线预览 Canvas 视频
   - 使用内嵌播放器试听歌曲
   - 点击 "Download Canvas" 下载视频到本地
   - 点击 "Open in Spotify" 在 Spotify 中打开歌曲

### 下载的文件命名规则

下载的 Canvas 视频文件名格式为：

```
艺术家名 - 歌曲名 canvas.mp4
```

例如：`Tùng TeA - Đừng Làm Trái Tim Anh Đau canvas.mp4`

## 🌐 局域网访问

如果你想让局域网内的其他设备（手机、平板等）也能访问：

1. **启动时指定监听地址**

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

2. **查看你的内网 IP**

Windows 系统：

```bash
ipconfig
```

查找 `IPv4 地址`，例如：`192.168.1.23`

macOS / Linux 系统：

```bash
ifconfig
# 或
ip addr
```

3. **在其他设备上访问**

在同一局域网内的设备浏览器中打开：

```
http://192.168.1.23:3000
```

（将 IP 地址替换为你的实际内网 IP）

4. **防火墙设置（Windows）**

如果其他设备无法访问，可能需要在 Windows 防火墙中允许 Node.js：

- 打开"Windows Defender 防火墙"
- 点击"允许应用通过防火墙"
- 找到 Node.js，勾选"专用网络"

## 🚢 部署到生产环境

### 部署到 Vercel（推荐）

Vercel 是 Next.js 官方推荐的部署平台，免费且简单：

1. **将项目推送到 GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/CanvasDownloader.git
git push -u origin main
```

2. **在 Vercel 上部署**

- 访问 [Vercel](https://vercel.com)，使用 GitHub 账号登录
- 点击 "Import Project"，选择你的仓库
- 配置环境变量（如果需要）：
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
- 点击 "Deploy"，等待部署完成

3. **获得公开访问网址**

部署完成后，你会得到一个类似 `https://your-project.vercel.app` 的网址，可以分享给任何人使用。

### 本地构建生产版本

```bash
npm run build
npm run start
```

## 🛠️ 技术栈

- **框架**：[Next.js 16](https://nextjs.org/) (App Router)
- **语言**：[TypeScript](https://www.typescriptlang.org/)
- **样式**：[Tailwind CSS](https://tailwindcss.com/)
- **图片优化**：Next.js Image 组件
- **数据来源**：
  - Canvas 视频：通过解析 canvasdownloader.com 获取
  - 歌曲元数据：Spotify Web API / oEmbed API

## 📁 项目结构

```
CanvasDownloader/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── canvas/
│   │   │       └── route.ts          # Canvas 数据 API
│   │   ├── canvas/
│   │   │   └── page.tsx              # Canvas 详情页
│   │   ├── layout.tsx                # 根布局
│   │   ├── page.tsx                  # 首页
│   │   └── globals.css               # 全局样式
│   └── components/
│       ├── Header.tsx                # 顶部导航
│       ├── Footer.tsx                # 底部信息
│       └── SearchBox.tsx             # 搜索框组件
├── public/                           # 静态资源
├── next.config.ts                    # Next.js 配置
├── tailwind.config.ts                # Tailwind 配置
├── tsconfig.json                     # TypeScript 配置
└── package.json                      # 项目依赖
```

## ⚠️ 注意事项

- **Canvas 视频质量**：视频质量取决于 Spotify 官方提供的原始文件，本应用不会对视频进行二次压缩或增强
- **网络要求**：部分功能需要访问 Spotify 和 canvasdownloader.com，请确保网络畅通
- **并非所有歌曲都有 Canvas**：只有 Spotify 官方为其制作了 Canvas 的歌曲才能下载

## 🔧 常见问题

### Q: 为什么有些歌曲找不到 Canvas？

A: 并非所有 Spotify 歌曲都有 Canvas 视频。Canvas 是 Spotify 为部分歌曲制作的短循环视频，如果某首歌没有 Canvas，应用会显示相应提示。

### Q: 下载的视频质量为什么不高？

A: 视频质量由 Spotify 官方提供的原始文件决定，本应用直接使用 Spotify CDN 上的原始视频，不会进行二次压缩。如果觉得画质不够清晰，这是 Spotify 源文件的限制。

### Q: 可以批量下载吗？

A: 目前版本暂不支持批量下载，每次只能下载一首歌曲的 Canvas。

### Q: 局域网访问时其他设备打不开怎么办？

A: 请检查：
1. 开发服务器是否使用 `--hostname 0.0.0.0` 启动
2. 设备是否在同一局域网内
3. Windows 防火墙是否允许 Node.js 访问专用网络

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Enjoy your Canvas! 🎨🎵**
