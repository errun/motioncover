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
    ? "MotionCover：Spotify Canvas 下载器与音乐可视化工具"
    : "MotionCover: Spotify Canvas Downloader & Music Visualizer Tools";
  const description = isZh
    ? "免费下载 Spotify Canvas 循环视频，并探索音频驱动特效、2.5D 视差封面与 AI 分层实验。"
    : "Download Spotify Canvas loops and explore audio-reactive effects, 2.5D parallax covers, and AI layering experiments.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/", locale)}`,
      languages: {
        en: `${baseUrl}/en`,
        "zh-CN": `${baseUrl}/zh`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${withLocalePathname("/", locale)}`,
      siteName: "MotionCover",
      type: "website",
    },
  };
}

export default function Home() {
  const locale = getRequestLocale();
  const isZh = locale === "zh";
  const enterArrow = isZh ? "进入 →" : "Go →";

  const copy = {
    badge: "MOTIONCOVER LAB",
    title: isZh ? "音乐工具入口 · 一站式工作台" : "All-in-one music tools workspace",
    subtitle: isZh
      ? "选择功能入口进入对应页面。默认英文，支持中文（右上角切换）。"
      : "Pick a tool to get started. Default English, with Chinese available (top-right).",
    cards: isZh
      ? [
          {
            id: "tool-1",
            pill: "功能 1",
            pillText: "Spotify Canvas 下载器",
            title: "下载 Spotify Canvas 循环视频",
            desc: "粘贴歌曲链接，预览并下载对应的 Canvas 视频（如有）。",
            href: "/downloader",
            accent: "emerald",
            cta: "进入下载器",
          },
          {
            id: "tool-2",
            pill: "功能 2",
            pillText: "音频 Shader / 特效预览",
            title: "音频驱动 Shader 与粒子特效",
            desc: "预览基于节奏的粒子、火焰、发光、烟雾等效果，并测试 VHS 等后期效果。",
            href: "/visualizer/effects",
            accent: "purple",
            cta: "进入效果面板",
          },
          {
            id: "tool-3",
            pill: "功能 3",
            pillText: "封面 2.5D 视差",
            title: "封面分层 + 2.5D 视差动效",
            desc: "上传封面与音频，生成 2.5D 视差动效，适合 Motion Cover / Canvas 展示。",
            href: "/visualizer/cover-25d",
            accent: "emerald",
            cta: "进入 2.5D 工作台",
          },
          {
            id: "tool-4",
            pill: "功能 4",
            pillText: "AI 分层实验室",
            title: "AI 底图生成 + 智能分层",
            desc: "生成构图清晰的底图，再进行分层与补全，为复杂 Motion Cover 打基础。",
            href: "/visualizer/architect",
            accent: "sky",
            cta: "进入实验室",
          },
        ]
      : [
          {
            id: "tool-1",
            pill: "TOOL 1",
            pillText: "Spotify Canvas Downloader",
            title: "Download Spotify Canvas loops",
            desc: "Paste a track link, preview, and download the Canvas video (if available).",
            href: "/downloader",
            accent: "emerald",
            cta: "Open Downloader",
          },
          {
            id: "tool-2",
            pill: "TOOL 2",
            pillText: "Audio Shader / Effects",
            title: "Audio-reactive shaders & particles",
            desc: "Preview beat-driven particles, fire, glow, smoke, and post effects like VHS.",
            href: "/visualizer/effects",
            accent: "purple",
            cta: "Open Effects",
          },
          {
            id: "tool-3",
            pill: "TOOL 3",
            pillText: "Cover 2.5D Parallax",
            title: "Layered covers with parallax motion",
            desc: "Upload cover + audio to generate 2.5D parallax motion for Motion Covers.",
            href: "/visualizer/cover-25d",
            accent: "emerald",
            cta: "Open 2.5D Studio",
          },
          {
            id: "tool-4",
            pill: "TOOL 4",
            pillText: "AI Layer Lab",
            title: "AI background + smart layering",
            desc: "Generate clean compositions and split layers for complex motion designs.",
            href: "/visualizer/architect",
            accent: "sky",
            cta: "Open Lab",
          },
        ],
    note: isZh
      ? "提示：建议桌面端 Chrome / Edge 访问以获得最佳体验。"
      : "Tip: Desktop Chrome / Edge recommended for the best experience.",
  };

  const accentToClasses = (accent: string) => {
    switch (accent) {
      case "purple":
        return {
          border: "hover:border-purple-500/70",
          bg: "hover:bg-zinc-900/80",
          pillText: "text-purple-300",
          pillBg: "bg-purple-500/10 border-purple-500/40",
          cta: "group-hover:text-purple-300",
        };
      case "sky":
        return {
          border: "hover:border-sky-500/70",
          bg: "hover:bg-zinc-900/80",
          pillText: "text-sky-300",
          pillBg: "bg-sky-500/10 border-sky-500/40",
          cta: "group-hover:text-sky-300",
        };
      case "emerald":
      default:
        return {
          border: "hover:border-emerald-500/70",
          bg: "hover:bg-zinc-900/80",
          pillText: "text-emerald-300",
          pillBg: "bg-emerald-500/10 border-emerald-500/40",
          cta: "group-hover:text-emerald-300",
        };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 pt-24">
        <div className="max-w-5xl w-full space-y-10">
          <header className="space-y-3 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              {copy.badge}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold">{copy.title}</h1>
            <p className="text-sm sm:text-base text-zinc-400">{copy.subtitle}</p>
          </header>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {copy.cards.map((card) => {
              const styles = accentToClasses(card.accent);
              return (
                <Link
                  key={card.id}
                  href={withLocalePathname(card.href, locale)}
                  className={`group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 flex flex-col justify-between transition-colors ${styles.border} ${styles.bg}`}
                >
                  <div className="space-y-2">
                    <div
                      className={`inline-flex items-center gap-2 text-xs ${styles.pillText}`}
                    >
                      <span
                        className={`px-2 py-0.5 rounded-full border ${styles.pillBg}`}
                      >
                        {card.pill}
                      </span>
                      <span>{card.pillText}</span>
                    </div>
                    <h2 className="text-lg font-semibold leading-snug">
                      {card.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                    <span>{card.cta}</span>
                    <span className={styles.cta}>{enterArrow}</span>
                  </div>
                </Link>
              );
            })}
          </section>

          <p className="text-[11px] text-zinc-500 text-center">{copy.note}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
