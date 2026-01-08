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
    ? "Spotify Canvas 指南：下载、尺寸规范与制作建议"
    : "Spotify Canvas Guide: Download, Specs, Dimensions & Tips";
  const description = isZh
    ? "了解 Spotify Canvas 是什么、常见尺寸/时长规范，以及如何下载与制作。"
    : "Learn what Spotify Canvas is, common specs (dimensions/length), and how to download or create one.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/spotify-canvas", locale)}`,
      languages: {
        en: `${baseUrl}/en/spotify-canvas`,
        "zh-CN": `${baseUrl}/zh/spotify-canvas`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${withLocalePathname("/spotify-canvas", locale)}`,
      siteName: "MotionCover",
      type: "article",
    },
  };
}

export default function SpotifyCanvasGuidePage() {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  const title = isZh
    ? "Spotify Canvas 指南"
    : "Spotify Canvas Guide";
  const subtitle = isZh
    ? "一页看懂：Canvas 是什么、规格（尺寸/时长）、下载方式与制作建议。"
    : "Everything in one place: what Canvas is, specs (dimensions/length), downloading, and creation tips.";

  const cards = isZh
    ? [
        {
          title: "免费下载器",
          desc: "粘贴歌曲链接，预览并下载 Canvas（如有）。",
          href: "/downloader",
        },
        {
          title: "尺寸与规格",
          desc: "分辨率、比例、格式、文件大小等常见规范。",
          href: "/spotify-canvas/dimensions",
        },
        {
          title: "时长",
          desc: "Spotify Canvas 通常多长？如何做无缝循环？",
          href: "/spotify-canvas/length",
        },
        {
          title: "制作 / Maker",
          desc: "如何为自己的歌曲制作并上传 Canvas（面向艺术家）。",
          href: "/spotify-canvas/maker",
        },
        {
          title: "下载教程",
          desc: "下载步骤、常见问题与排查建议。",
          href: "/spotify-canvas/download",
        },
      ]
    : [
        {
          title: "Free Downloader",
          desc: "Paste a track link to preview and download the Canvas (if available).",
          href: "/downloader",
        },
        {
          title: "Dimensions & Specs",
          desc: "Resolution, aspect ratio, formats, and common requirements.",
          href: "/spotify-canvas/dimensions",
        },
        {
          title: "Length",
          desc: "How long is a Spotify Canvas, and how to loop it cleanly.",
          href: "/spotify-canvas/length",
        },
        {
          title: "Maker / Creator",
          desc: "How artists create and upload a Canvas for their tracks.",
          href: "/spotify-canvas/maker",
        },
        {
          title: "How to Download",
          desc: "Step-by-step download instructions and troubleshooting.",
          href: "/spotify-canvas/download",
        },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
          {title}
        </h1>
        <p className="text-white/70 text-center max-w-2xl mx-auto">{subtitle}</p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={withLocalePathname(card.href, locale)}
              className="group bg-[#181818] rounded-xl p-6 border border-white/10 hover:border-white/20 transition-colors"
            >
              <h2 className="text-lg font-semibold text-white mb-2">
                {card.title}
              </h2>
              <p className="text-sm text-white/60">{card.desc}</p>
              <p className="mt-4 text-sm text-[#1db954] group-hover:underline">
                {isZh ? "查看 →" : "Read more →"}
              </p>
            </Link>
          ))}
        </div>

        <section className="mt-10 bg-[#121212] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-3">
            {isZh ? "什么是 Spotify Canvas？" : "What is Spotify Canvas?"}
          </h2>
          <p className="text-white/70 leading-relaxed">
            {isZh
              ? "Spotify Canvas 是一段短的竖屏循环视频，由艺术家添加到歌曲上。当你在 Spotify 播放歌曲时，Canvas 会在播放界面循环展示。"
              : "Spotify Canvas is a short vertical looping video that artists can add to tracks. When a song plays in Spotify, Canvas can loop on the Now Playing screen."}
          </p>
        </section>

        <p className="mt-10 text-xs text-white/50 leading-relaxed">
          {isZh
            ? "提示：Spotify 的规范可能会更新，最终以 Spotify for Artists 的官方说明为准。"
            : "Note: Spotify's requirements may change; always refer to Spotify for Artists documentation for the latest specs."}
        </p>
      </main>
      <Footer />
    </div>
  );
}

