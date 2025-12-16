import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true,
	// 关闭开发环境左下角的 Next.js 指示图标
	devIndicators: false,
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
