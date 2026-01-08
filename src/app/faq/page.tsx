import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRequestLocale } from "@/i18n/server";
import { withLocalePathname } from "@/i18n/routing";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  const title = isZh ? "常见问题" : "Frequently Asked Questions";
  const description = isZh
    ? "关于 Spotify Canvas 下载与使用的常见问题。"
    : "Common questions about Spotify Canvas and downloading.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/faq", locale)}`,
      languages: {
        en: `${baseUrl}/en/faq`,
        "zh-CN": `${baseUrl}/zh/faq`,
      },
    },
  };
}

export default function FAQPage() {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  const heading = isZh ? "常见问题" : "Frequently Asked Questions";
  const faqs = isZh
    ? [
        {
          question: "什么是 Spotify Canvas？",
          answer:
            "Spotify Canvas 是由艺术家添加到歌曲上的短循环视频。你在 Spotify 听歌时，部分歌曲会在播放界面显示这段循环视频。",
        },
        {
          question: "如何下载 Canvas？",
          answer:
            "在下载器页面粘贴 Spotify 歌曲链接（或搜索），如果该曲目有 Canvas，就可以预览并下载。",
        },
        {
          question: "所有歌曲都有 Canvas 吗？",
          answer:
            "不是。Canvas 是可选内容，需要由艺术家或厂牌上传，因此并非每首歌都有。",
        },
        {
          question: "下载的 Canvas 是什么格式？",
          answer: "通常为 MP4 格式，兼容多数播放器与剪辑软件。",
        },
        {
          question: "这个服务免费吗？",
          answer: "是的，免费使用，无广告与用户追踪。",
        },
        {
          question: "你们与 Spotify 有关联吗？",
          answer: "没有。本站为独立项目，与 Spotify 无任何关联、背书或赞助关系。",
        },
        {
          question: "我可以商业使用下载的 Canvas 吗？",
          answer:
            "Canvas 版权归艺术家与厂牌所有。商业用途请先获得授权；个人用途一般问题不大，但仍建议遵守当地法律法规。",
        },
        {
          question: "为什么找不到某首歌的 Canvas？",
          answer:
            "可能原因包括：该曲目没有 Canvas、地区限制、或 Spotify / 网络暂时不可用。",
        },
      ]
    : [
        {
          question: "What is a Spotify Canvas?",
          answer:
            "Spotify Canvas is a short looping video that artists can add to their tracks. These videos loop while you listen, making the experience more visual.",
        },
        {
          question: "How do I download a Canvas?",
          answer:
            "Paste a Spotify track link into the downloader (or search). If the track has a Canvas, you can preview and download it.",
        },
        {
          question: "Do all Spotify tracks have a Canvas?",
          answer:
            "No. Canvas videos are optional and must be uploaded by the artist or label, so availability varies.",
        },
        {
          question: "What format is the Canvas downloaded in?",
          answer: "Typically MP4, compatible with most players and editors.",
        },
        {
          question: "Is this service free?",
          answer: "Yes — free to use, with no ads or tracking.",
        },
        {
          question: "Is this affiliated with Spotify?",
          answer:
            "No. MotionCover is an independent project and is not affiliated with, endorsed by, or sponsored by Spotify.",
        },
        {
          question: "Can I use downloaded Canvas videos commercially?",
          answer:
            "Canvas videos are owned by the artists and labels. Get proper permissions before using them commercially.",
        },
        {
          question: "Why can't I find a Canvas for a specific track?",
          answer:
            "Possible reasons: no Canvas uploaded, region restrictions, or temporary issues with Spotify/network access.",
        },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
          {heading}
        </h1>

        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question} className="bg-[#181818] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-3">
                {faq.question}
              </h2>
              <p className="text-white/70 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
