import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRequestLocale } from "@/i18n/server";
import { withLocalePathname } from "@/i18n/routing";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  const title = isZh
    ? "如何下载 Spotify Canvas（下载教程与排查）"
    : "How to Download Spotify Canvas (Step-by-step + Troubleshooting)";
  const description = isZh
    ? "从 Spotify 歌曲链接下载 Canvas：步骤、常见问题与原因排查。"
    : "Download a Canvas from a Spotify track link: steps, common issues, and troubleshooting.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/spotify-canvas/download", locale)}`,
      languages: {
        en: `${baseUrl}/en/spotify-canvas/download`,
        "zh-CN": `${baseUrl}/zh/spotify-canvas/download`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${withLocalePathname("/spotify-canvas/download", locale)}`,
      siteName: "MotionCover",
      type: "article",
    },
  };
}

export default function SpotifyCanvasDownloadGuidePage() {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
          {isZh ? "如何下载 Spotify Canvas" : "How to Download Spotify Canvas"}
        </h1>
        <p className="text-white/70 text-center mb-8">
          {isZh
            ? "用下载器粘贴歌曲链接即可。如果该曲目有 Canvas，就可以预览并下载。"
            : "Paste a track link into the downloader. If the track has a Canvas, you can preview and download it."}
        </p>

        <section className="bg-[#181818] rounded-xl p-6 border border-white/10 space-y-4 text-white/70 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "步骤" : "Steps"}
          </h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <Link
                href={withLocalePathname("/downloader", locale)}
                className="text-[#1db954] hover:underline"
              >
                {isZh ? "打开下载器页面" : "Open the downloader"}
              </Link>
              {isZh ? "。" : "."}
            </li>
            <li>
              {isZh
                ? "粘贴 Spotify 歌曲链接（例如 open.spotify.com/track/...）。"
                : "Paste a Spotify track link (e.g. open.spotify.com/track/...)."}
            </li>
            <li>
              {isZh
                ? "等待加载后预览 Canvas，点击 Download 下载。"
                : "Wait for loading, preview the Canvas, then click Download."}
            </li>
          </ol>
        </section>

        <section className="mt-8 bg-[#121212] rounded-xl p-6 border border-white/10 space-y-4 text-white/70 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "常见问题" : "Common issues"}
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              {isZh
                ? "提示没有 Canvas：并非所有歌曲都上传了 Canvas。"
                : "No Canvas available: not every track has a Canvas uploaded."}
            </li>
            <li>
              {isZh
                ? "地区/账号差异：Canvas 可能存在地区限制或 A/B 差异。"
                : "Region/account differences: Canvas can vary by region or A/B tests."}
            </li>
            <li>
              {isZh
                ? "网络问题：如果 Spotify 连接不稳定，可能会加载失败。"
                : "Network issues: unstable Spotify access may cause loading failures."}
            </li>
          </ul>
        </section>

        <p className="mt-8 text-xs text-white/50 leading-relaxed">
          {isZh
            ? "版权提示：Canvas 归艺术家/厂牌所有。请尊重版权，避免未授权的商业使用。"
            : "Copyright note: Canvas videos are owned by artists/labels. Respect rights and avoid unauthorized commercial use."}
        </p>
      </main>
      <Footer />
    </div>
  );
}

