import type { Locale } from "./routing";

const MESSAGES = {
  en: {
    nav: {
      visualizer: "Visualizer",
      downloader: "Downloader",
      guide: "Spotify Canvas",
      charts: "Charts",
    },
    footer: {
      about: "About",
      disclaimer:
        "This site is not affiliated with Spotify. All trademarks belong to their respective owners.",
    },
    language: {
      en: "EN",
      zh: "中文",
    },
  },
  zh: {
    nav: {
      visualizer: "可视化",
      downloader: "下载器",
      guide: "Spotify Canvas 指南",
      charts: "排行榜",
    },
    footer: {
      about: "关于",
      disclaimer: "本站与 Spotify 无关。所有商标归各自权利方所有。",
    },
    language: {
      en: "EN",
      zh: "中文",
    },
  },
} as const satisfies Record<Locale, unknown>;

export function getMessages(locale: Locale) {
  return MESSAGES[locale];
}

