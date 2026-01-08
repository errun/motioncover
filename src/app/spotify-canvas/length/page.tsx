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
    ? "Spotify Canvas 时长：一般多长？如何做无缝循环"
    : "Spotify Canvas Length: How Long Is It & Looping Tips";
  const description = isZh
    ? "Spotify Canvas 通常为短循环视频（常见 3–8 秒）。了解时长范围与循环制作建议。"
    : "Spotify Canvas is a short looping video (often 3–8 seconds). Learn typical length and how to loop smoothly.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/spotify-canvas/length", locale)}`,
      languages: {
        en: `${baseUrl}/en/spotify-canvas/length`,
        "zh-CN": `${baseUrl}/zh/spotify-canvas/length`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${withLocalePathname("/spotify-canvas/length", locale)}`,
      siteName: "MotionCover",
      type: "article",
    },
  };
}

export default function SpotifyCanvasLengthPage() {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
          {isZh ? "Spotify Canvas 时长" : "Spotify Canvas Length"}
        </h1>
        <p className="text-white/70 text-center mb-8">
          {isZh
            ? "快速答案：Canvas 通常是短循环视频，常见时长为 3–8 秒。"
            : "Quick answer: Canvas is a short loop, often in the 3–8 second range."}
        </p>

        <section className="bg-[#181818] rounded-xl p-6 border border-white/10 space-y-4 text-white/70 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "为什么这么短？" : "Why is it so short?"}
          </h2>
          <p>
            {isZh
              ? "Canvas 需要在播放界面快速建立氛围，同时避免分散注意力。短循环更适合重复播放，也更易于控制文件大小与加载体验。"
              : "Canvas is designed to quickly set a mood on the Now Playing screen without distracting from the music. Short loops also keep files small and load fast."}
          </p>
        </section>

        <section className="mt-8 space-y-4 text-white/70 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "无缝循环制作建议" : "Tips for a seamless loop"}
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              {isZh
                ? "尽量让首尾画面在构图/运动上自然对齐，避免硬切。"
                : "Align the start/end composition and motion to avoid a hard cut."}
            </li>
            <li>
              {isZh
                ? "使用缓入缓出或循环运动（如轻微漂移、呼吸感缩放）。"
                : "Use easing and cyclical motions (subtle drift, breathing zoom, etc.)."}
            </li>
            <li>
              {isZh
                ? "避免快速闪烁与过度抖动，长时间循环会造成疲劳。"
                : "Avoid aggressive flicker/shake—loops can become tiring quickly."}
            </li>
          </ul>
        </section>

        <section className="mt-8 bg-[#121212] rounded-xl p-6 border border-white/10 space-y-3 text-white/70">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "相关：尺寸与规格" : "Related: Dimensions & specs"}
          </h2>
          <p>
            {isZh
              ? "想确认比例/分辨率/格式等规范："
              : "Need the recommended aspect ratio, resolution, and format?"}{" "}
            <Link
              href={withLocalePathname("/spotify-canvas/dimensions", locale)}
              className="text-[#1db954] hover:underline"
            >
              {isZh
                ? "查看 Spotify Canvas 尺寸与规格"
                : "See Spotify Canvas dimensions & specs"}
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

