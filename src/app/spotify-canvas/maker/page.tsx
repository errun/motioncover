import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRequestLocale } from "@/i18n/server";
import { withLocalePathname } from "@/i18n/routing";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const isZh = locale === "zh";

  const title = isZh
    ? "Spotify Canvas Maker：如何制作与上传 Canvas（艺术家指南）"
    : "Spotify Canvas Maker: How to Create & Upload a Canvas (Artist Guide)";
  const description = isZh
    ? "面向艺术家：了解 Spotify Canvas 的制作要点、常见规格与上传流程。"
    : "For artists: learn how to create a Spotify Canvas, common specs, and how uploading works.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/spotify-canvas/maker", locale)}`,
      languages: {
        en: `${baseUrl}/en/spotify-canvas/maker`,
        "zh-CN": `${baseUrl}/zh/spotify-canvas/maker`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${withLocalePathname("/spotify-canvas/maker", locale)}`,
      siteName: "MotionCover",
      type: "article",
    },
  };
}

export default async function SpotifyCanvasMakerPage() {
  const locale = await getRequestLocale();
  const isZh = locale === "zh";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
          {isZh ? "Spotify Canvas 制作 / Maker" : "Spotify Canvas Maker / Creator"}
        </h1>
        <p className="text-white/70 text-center mb-8">
          {isZh
            ? "要点：Canvas 由艺术家通过 Spotify for Artists 上传。这里整理“怎么做”和“怎么上传”。"
            : "Key point: Canvas is uploaded by artists via Spotify for Artists. This guide covers creation + uploading."}
        </p>

        <section className="bg-[#181818] rounded-xl p-6 border border-white/10 space-y-4 text-white/70 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "1) 先做出符合规范的视频" : "1) Create a video that matches the specs"}
          </h2>
          <p>
            {isZh
              ? "常见为竖屏 9:16（例如 1080×1920），短循环视频。建议先确认尺寸/格式要求："
              : "Canvas is typically vertical 9:16 (e.g. 1080×1920) and short. Check dimensions and format requirements first:"}{" "}
            <Link
              href={withLocalePathname("/spotify-canvas/dimensions", locale)}
              className="text-[#1db954] hover:underline"
            >
              {isZh ? "Canvas 尺寸与规格" : "Canvas dimensions & specs"}
            </Link>
            .
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              {isZh
                ? "优先做“无缝循环”，让首尾衔接自然。"
                : "Aim for a seamless loop so the start/end feel continuous."}
            </li>
            <li>
              {isZh
                ? "少文字、少 Logo、少 CTA，突出氛围与质感。"
                : "Avoid heavy text/logos/CTAs; focus on mood and motion."}
            </li>
            <li>
              {isZh
                ? "注意画面安全区，避免关键信息贴边。"
                : "Keep important elements within a safe area (avoid edges)."}
            </li>
          </ul>
        </section>

        <section className="mt-8 bg-[#181818] rounded-xl p-6 border border-white/10 space-y-4 text-white/70 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "2) 在 Spotify for Artists 上传 Canvas" : "2) Upload via Spotify for Artists"}
          </h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              {isZh
                ? "登录 Spotify for Artists（需要你是该曲目的艺术家/团队成员）。"
                : "Sign in to Spotify for Artists (you must be the artist or have access)."}
            </li>
            <li>
              {isZh
                ? "找到对应歌曲，进入 Canvas 上传入口。"
                : "Open the track and find the Canvas upload option."}
            </li>
            <li>
              {isZh
                ? "上传视频并按提示裁切/预览，保存发布。"
                : "Upload the video, crop/preview if needed, then save/publish."}
            </li>
          </ol>
          <p className="text-xs text-white/50">
            {isZh
              ? "不同地区/账号功能可能有差异，以上为常见流程。"
              : "Availability may differ by account/region; steps can vary slightly."}
          </p>
        </section>

        <section className="mt-8 bg-[#121212] rounded-xl p-6 border border-white/10 space-y-3 text-white/70">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "参考与下载" : "Reference & downloading"}
          </h2>
          <p>
            {isZh
              ? "如果你想参考某首歌的 Canvas（用于学习/个人用途），可以用下载器快速预览与下载："
              : "If you want to reference a track’s Canvas (learning/personal use), you can preview and download it here:"}{" "}
            <Link
              href={withLocalePathname("/downloader", locale)}
              className="text-[#1db954] hover:underline"
            >
              {isZh ? "打开 Spotify Canvas 下载器" : "Open the Spotify Canvas downloader"}
            </Link>
            .
          </p>
          <p className="text-xs text-white/50 leading-relaxed">
            {isZh
              ? "版权提示：Canvas 归艺术家/厂牌所有，商用前请获得授权。"
              : "Copyright note: Canvas videos are owned by artists/labels; obtain permission before commercial use."}
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
