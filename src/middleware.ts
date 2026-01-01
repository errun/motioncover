import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_PATHS = [
	"/visualizer/cover-25d",
	"/visualizer/effects",
	"/visualizer/architect",
	"/imgs",
	"/api",
	"/_next",
	"/favicon.ico",
	"/robots.txt",
	"/sitemap.xml",
];

const PUBLIC_FILE_REGEX = /\.(?:png|jpe?g|svg|gif|webp|avif|ico|mp4|webm|mp3|wav|ogg)$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

	// 允许首页渲染功能入口卡片
	if (pathname === "/") {
		return NextResponse.next();
	}

	// 允许白名单前缀路径直接访问
	if (ALLOWED_PATHS.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (PUBLIC_FILE_REGEX.test(pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/visualizer/cover-25d";
  return NextResponse.redirect(url);
}
