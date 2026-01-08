import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRequestLocale } from "@/i18n/server";
import { withLocalePathname } from "@/i18n/routing";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  const title = isZh ? "关于 MotionCover" : "About MotionCover";
  const description = isZh
    ? "了解 MotionCover：Spotify Canvas 下载器与音乐可视化工具。"
    : "Learn about MotionCover: a Spotify Canvas downloader and music visualizer tools.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/about", locale)}`,
      languages: {
        en: `${baseUrl}/en/about`,
        "zh-CN": `${baseUrl}/zh/about`,
      },
    },
  };
}

export default function AboutPage() {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  const heading = isZh ? "关于 MotionCover" : "About MotionCover";
  const sections = isZh
    ? [
        {
          title: "我们做什么",
          body: "MotionCover 提供 Spotify Canvas 下载器，以及一系列音乐可视化实验工具，帮助你更高效地获取素材并进行创作。",
        },
        {
          title: "我们的目标",
          body: "我们希望把工具做得更轻、更直接：无需注册，打开即用，专注于体验与效率。",
        },
        {
          title: "隐私优先",
          body: "我们不做用户追踪，不展示广告，也不收集个人数据。你只需要粘贴链接，即可预览与下载。",
        },
        {
          title: "免责声明",
          body: "MotionCover 与 Spotify 无任何关联、背书或赞助关系。所有商标与版权归其各自权利方所有；Canvas 视频的权利属于创作者与发行方。",
        },
        {
          title: "联系",
          body: "如果你有建议、问题或发现 bug，欢迎反馈，我们会持续改进。",
        },
      ]
    : [
        {
          title: "What we do",
          body: "MotionCover includes a Spotify Canvas downloader and a set of music visualizer experiments to help you collect assets and create motion designs faster.",
        },
        {
          title: "Our mission",
          body: "Keep things simple: no accounts, no friction, just fast tools with a clean experience.",
        },
        {
          title: "Privacy first",
          body: "No tracking, no ads, no personal data collection. Paste a link, preview, download, and you're done.",
        },
        {
          title: "Disclaimer",
          body: "MotionCover is not affiliated with, endorsed by, or sponsored by Spotify. All trademarks and copyrights belong to their respective owners. Canvas videos are owned by the artists and labels who created them.",
        },
        {
          title: "Contact",
          body: "Questions, suggestions, or bugs? Feel free to reach out — improvements are ongoing.",
        },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
          {heading}
        </h1>

        <div className="space-y-6 text-white/70 leading-relaxed">
          {sections.map((section) => (
            <div key={section.title} className="bg-[#181818] rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                {section.title}
              </h2>
              <p>{section.body}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
