import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchBox from "@/components/SearchBox";
import { getRequestLocale } from "@/i18n/server";
import { withLocalePathname } from "@/i18n/routing";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";
const VERSION = "v1.1.0 (2024-12-17 00:30)";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  const title = isZh
    ? "Spotify Canvas 下载器（免费）"
    : "Spotify Canvas Downloader (Free)";
  const description = isZh
    ? "粘贴 Spotify 歌曲链接，在线预览并下载对应的 Canvas 循环视频（如有）。"
    : "Paste a Spotify track link to preview and download its Canvas loop (if available).";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/downloader", locale)}`,
      languages: {
        en: `${baseUrl}/en/downloader`,
        "zh-CN": `${baseUrl}/zh/downloader`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${withLocalePathname("/downloader", locale)}`,
      siteName: "MotionCover",
      type: "website",
    },
  };
}

export default function DownloaderPage() {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {isZh ? "下载" : "Download a"} Spotify&nbsp;
            <span className="text-[#1db954]">Canvas</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">{VERSION}</p>
        </div>

        <SearchBox />

        <p className="mt-6 text-center text-xs text-white/50">
          {isZh ? "想了解 Canvas 的尺寸、时长和规范？查看 " : "Need Canvas specs? See "}
          <Link
            href={withLocalePathname("/spotify-canvas", locale)}
            className="text-[#1db954] hover:underline"
          >
            {isZh ? "Spotify Canvas 指南" : "the Spotify Canvas guide"}
          </Link>
          .
        </p>
      </main>

      <Footer />
    </div>
  );
}
