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
    ? "Spotify Canvas 尺寸与规格（大小、比例、格式）"
    : "Spotify Canvas Dimensions & Specs (Size, Aspect Ratio, Format)";
  const description = isZh
    ? "整理常见 Spotify Canvas 规格：比例、推荐分辨率、时长、格式与注意事项。"
    : "Common Spotify Canvas specs: aspect ratio, recommended resolution, length, formats, and practical tips.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/spotify-canvas/dimensions", locale)}`,
      languages: {
        en: `${baseUrl}/en/spotify-canvas/dimensions`,
        "zh-CN": `${baseUrl}/zh/spotify-canvas/dimensions`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${withLocalePathname("/spotify-canvas/dimensions", locale)}`,
      siteName: "MotionCover",
      type: "article",
    },
  };
}

export default async function SpotifyCanvasDimensionsPage() {
  const locale = await getRequestLocale();
  const isZh = locale === "zh";

  const title = isZh
    ? "Spotify Canvas 尺寸与规格"
    : "Spotify Canvas Dimensions & Specs";
  const subtitle = isZh
    ? "快速答案：竖屏 9:16，常见推荐 1080×1920，短循环视频（通常 3–8 秒）。"
    : "Quick answer: vertical 9:16, commonly recommended 1080×1920, short looping video (often 3–8s).";

  const rows = isZh
    ? [
        { k: "比例（Aspect Ratio）", v: "9:16（竖屏）" },
        { k: "推荐分辨率", v: "1080×1920（常见推荐），至少保证清晰度" },
        { k: "时长（Length）", v: "短循环，常见 3–8 秒（详见时长页面）" },
        { k: "文件格式", v: "MP4（常见）" },
        { k: "视频编码", v: "H.264（常见）" },
        { k: "音频", v: "通常不需要（Canvas 以视觉为主）" },
        { k: "文件大小", v: "常见限制 ≤ 20MB（以 Spotify for Artists 为准）" },
      ]
    : [
        { k: "Aspect ratio", v: "9:16 (vertical)" },
        { k: "Recommended resolution", v: "1080×1920 is commonly recommended" },
        { k: "Length", v: "Short loop, often 3–8 seconds (see length guide)" },
        { k: "File format", v: "MP4 (common)" },
        { k: "Codec", v: "H.264 (common)" },
        { k: "Audio", v: "Usually not needed (Canvas is visual-first)" },
        { k: "File size", v: "Common limit ≤ 20MB (check Spotify for Artists)" },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
          {title}
        </h1>
        <p className="text-white/70 text-center mb-8">{subtitle}</p>

        <div className="bg-[#181818] rounded-xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-1">
            {rows.map((row) => (
              <div
                key={row.k}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-6 py-4 border-b border-white/10 last:border-b-0"
              >
                <div className="text-sm text-white/80 sm:w-56 font-medium">
                  {row.k}
                </div>
                <div className="text-sm text-white/60 flex-1">{row.v}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="mt-8 space-y-4 text-white/70 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "补充建议" : "Practical tips"}
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              {isZh
                ? "尽量避免小字号文字与强 CTA（过小或过密在播放界面不易读）。"
                : "Avoid tiny text and heavy CTAs; they often look unreadable on the player UI."}
            </li>
            <li>
              {isZh
                ? "优先做“无缝循环”，让首尾自然衔接。"
                : "Aim for a seamless loop so the start/end feel continuous."}
            </li>
            <li>
              {isZh
                ? "如果你关心时长与循环策略："
                : "If you're optimizing duration and looping:"}{" "}
              <Link
                href={withLocalePathname("/spotify-canvas/length", locale)}
                className="text-[#1db954] hover:underline"
              >
                {isZh ? "查看 Spotify Canvas 时长指南" : "see the Canvas length guide"}
              </Link>
              .
            </li>
          </ul>
        </section>

        <p className="mt-8 text-xs text-white/50 leading-relaxed">
          {isZh
            ? "说明：不同账号/地区/产品版本可能存在差异，最终以 Spotify for Artists 上传界面的提示为准。"
            : "Note: Specs may vary by product/version. Always follow the constraints shown in Spotify for Artists when uploading."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
