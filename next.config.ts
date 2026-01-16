import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true,
	// 启用 standalone 输出模式，用于 Docker 部署
	output: "standalone",
	// 关闭开发环境左下角的 Next.js 指示图标
	devIndicators: false,
	// 将原生模块标记为服务器外部包，避免 Turbopack 打包错误
	serverExternalPackages: ["@napi-rs/canvas"],
	images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "wrapped-images.spotifycdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "seeded-session-images.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "canvaz.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "image-cdn-ak.spotifycdn.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
