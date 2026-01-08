"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname, withLocalePathname } from "@/i18n/routing";

export default function NotFound() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);

  const title = locale === "zh" ? "页面不存在" : "Page not found";
  const description =
    locale === "zh"
      ? "你访问的页面不存在或已被移动。"
      : "The page you're looking for doesn't exist or has been moved.";
  const backToHome = locale === "zh" ? "返回首页" : "Back to home";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-black">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <svg
            className="w-20 h-20 mx-auto text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-300 mb-4">{title}</h2>
        <p className="text-gray-400 mb-8">{description}</p>

        <Link
          href={withLocalePathname("/", locale)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1db954] text-white font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {backToHome}
        </Link>
      </div>
    </div>
  );
}
