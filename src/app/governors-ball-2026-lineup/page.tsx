import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRequestLocale } from "@/i18n/server";
import { withLocalePathname } from "@/i18n/routing";
import govBallPoster from "../../../govball-2026-lineup.png";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";
const pathname = "/governors-ball-2026-lineup";
const publishedDate = "2026-01-06";
const officialLineupUrl = "https://www.governorsballmusicfestival.com/lineup";

type DayLineup = {
  day: "Friday" | "Saturday" | "Sunday";
  date: string;
  headliners: string[];
  artists: string[];
};

const GOV_BALL_2026_LINEUP: DayLineup[] = [
  {
    day: "Friday",
    date: "2026-06-05",
    headliners: ["Lorde", "Baby Keem"],
    artists: [
      "Katseye",
      "Pierce The Veil",
      "Mariah The Scientist",
      "The Dare",
      "2hollis",
      "King Princess",
      "Flipturn",
      "Audrey Hobert",
      "Turnover",
      "The Beths",
      "Arcy Drive",
      "Confidence Man",
      "Absolutely",
      "Whatmore",
      "Old Mervs",
      "The Backfires",
      "School of Rock Queens",
      "Kids Rock for Kids",
    ],
  },
  {
    day: "Saturday",
    date: "2026-06-06",
    headliners: ["Stray Kids", "Kali Uchis"],
    artists: [
      "Major Lazer",
      "Blood Orange",
      "Wet Leg",
      "Amyl and The Sniffers",
      "Ravyn Lenae",
      "Snow Strippers",
      "Del Water Gap",
      "Thee Sacred Souls",
      "Spacey Jane",
      "Jane Remover",
      "Wisp",
      "Midnight Generation",
      "Flowerovlove",
      "Radio Free Alice",
      "Villanelle",
      "Chanpan",
      "Jade Lemac",
      "Jimmyboy",
    ],
  },
  {
    day: "Sunday",
    date: "2026-06-07",
    headliners: ["A$AP Rocky", "Jennie"],
    artists: [
      "Dominic Fike",
      "Geese",
      "Clipse",
      "Freddie Gibbs",
      "Alchemist",
      "Japanese Breakfast",
      "Hot Mulligan",
      "Holly Humberstone",
      "Fcukers",
      "Rachel Chinouriri",
      "Khamari",
      "Between Friends",
      "Slayyyter",
      "Hemlocke Springs",
      "Lexa Gates",
      "Evening Elephants",
      "After",
      "Hannah Jadagu",
      "School of Rock New York",
    ],
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const isZh = locale === "zh";

  const title = isZh
    ? "Gov Ball 2026 阵容公布（2026年1月6日）"
    : "Gov Ball 2026 lineup (Governors Ball) — announced Jan 6, 2026";
  const description = isZh
    ? "2026年1月6日，纽约标志性音乐节 Governors Ball（Gov Ball）正式公布 2026 阵容。本文按周五/周六/周日列出完整名单，并整理分日/时间表关注点，以及用播放列表快速跟进的清单。"
    : "Gov Ball 2026 lineup announced Jan 6, 2026: full artist list by day (Fri/Sat/Sun), plus a quick checklist for day splits, set times, and playlists.";

  const canonical = `${baseUrl}${withLocalePathname(pathname, locale)}`;
  const posterAlt = isZh
    ? "Gov Ball 2026 官方阵容海报缩略图"
    : "Gov Ball 2026 official lineup poster thumbnail";

  return {
    title,
    description,
    keywords: isZh
      ? [
          "Gov Ball 2026",
          "Gov Ball 2026 阵容",
          "Governors Ball 2026",
          "Gov Ball lineup",
          "Governors Ball lineup",
        ]
      : [
          "Gov Ball 2026",
          "Gov Ball 2026 lineup",
          "Governors Ball 2026 lineup",
          "Gov Ball lineup",
          "Governors Ball lineup",
        ],
    alternates: {
      canonical,
      languages: {
        en: `${baseUrl}/en${pathname}`,
        "zh-CN": `${baseUrl}/zh${pathname}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "MotionCover",
      type: "article",
      publishedTime: `${publishedDate}T00:00:00.000Z`,
      images: [
        {
          url: govBallPoster.src,
          width: govBallPoster.width,
          height: govBallPoster.height,
          alt: posterAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [govBallPoster.src],
    },
  };
}

export default async function GovernorsBall2026LineupPage() {
  const locale = await getRequestLocale();
  const isZh = locale === "zh";
  const dayLabelZh = { Friday: "周五", Saturday: "周六", Sunday: "周日" } as const;

  const heading = isZh
    ? "Gov Ball 2026 阵容正式公布"
    : "Gov Ball 2026 lineup is officially out";
  const subtitle = isZh
    ? `2026年1月6日，Governors Ball（纽约标志性音乐节，简称 Gov Ball）公布 2026 阵容。下面是一份面向观众与创作者的快速清单，方便你立即跟进。`
    : `On Jan 6, 2026, Governors Ball (Gov Ball) announced the 2026 lineup. Here’s a quick checklist for listeners and creators to follow up fast.`;

  const checklist = isZh
    ? [
        "保存官方阵容海报/公告链接，优先确认是否有分日（day split）与演出时间表（set times）。",
        "把你感兴趣的艺人整理成 Spotify 播放列表，方便集中试听与挖掘新歌。",
        "关注艺人账号与音乐节官方渠道，留意加场、替换与时间变动。",
        "若你要做宣传动效：先准备封面图、艺人代表作片段与竖屏素材（9:16）。",
      ]
    : [
        "Save the official lineup announcement and check for day splits and set times.",
        "Build a Spotify playlist for the artists you care about to explore new tracks quickly.",
        "Follow artists and official festival channels for updates, additions, or schedule changes.",
        "If you’re making promo visuals: prep cover art, key tracks, and vertical assets (9:16).",
      ];

  const faq = isZh
    ? [
        {
          q: "Gov Ball 2026 阵容是什么时候公布的？",
          a: `根据本页主题：2026年1月6日公布。最终信息以音乐节官方公告为准。`,
        },
        {
          q: "哪里能看到最准确的分日与时间表？",
          a: "以官方渠道发布的 day split / set times 为准；如果尚未发布，通常会在之后陆续公布。",
        },
        {
          q: "这页和 MotionCover 有什么关系？",
          a: "很多人会在阵容公布后做播放列表与宣传素材；MotionCover 提供 Spotify Canvas 预览/下载与可视化工具入口。",
        },
      ]
    : [
        {
          q: "When was the Gov Ball 2026 lineup announced?",
          a: `Per this page’s topic: Jan 6, 2026. Always confirm via official festival announcements.`,
        },
        {
          q: "Where do I find the most accurate day splits and set times?",
          a: "Rely on official day-split and set-times posts. If they’re not out yet, they’re usually released later.",
        },
        {
          q: "Why is this on MotionCover?",
          a: "Many people build playlists and promo assets after a lineup drop. MotionCover helps with Spotify Canvas preview/download and visualizer tools.",
        },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
          {heading}
        </h1>
        <p className="text-white/70 text-center max-w-2xl mx-auto">{subtitle}</p>

        <figure className="mt-6">
          <a
            href={officialLineupUrl}
            target="_blank"
            rel="noreferrer"
            className="block mx-auto max-w-sm"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]">
              <Image
                src={govBallPoster}
                alt={
                  isZh
                    ? "Gov Ball 2026 官方阵容海报缩略图"
                    : "Gov Ball 2026 official lineup poster thumbnail"
                }
                fill
                priority
                placeholder="blur"
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 384px"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/40 pointer-events-none" />
            </div>
          </a>
          <figcaption className="mt-2 text-xs text-white/50 text-center">
            {isZh
              ? "海报来自官方发布（点击打开官方阵容页）"
              : "Poster from the official announcement (click to open the official lineup page)"}
          </figcaption>
        </figure>

        <div className="mt-8 bg-[#121212] rounded-xl p-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-white/50">
                {isZh ? "发布日期" : "Published"}: {publishedDate}
              </p>
              <p className="text-xs text-white/50">
                {isZh ? "关键词" : "Keywords"}: Governors Ball 2026 lineup / Gov
                Ball 2026 lineup
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={withLocalePathname("/spotify-canvas", locale)}
                className="text-xs text-white/70 hover:text-white underline decoration-white/20 hover:decoration-white/60 transition-colors"
              >
                {isZh ? "Spotify Canvas 指南" : "Spotify Canvas guide"}
              </Link>
              <Link
                href={withLocalePathname("/downloader", locale)}
                className="text-xs text-[#1db954] hover:underline"
              >
                {isZh ? "打开下载器" : "Open downloader"}
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-8 space-y-4">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-xl font-semibold text-white">
              {isZh ? "2026 阵容（按天）" : "2026 lineup (by day)"}
            </h2>
            <a
              href={officialLineupUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-white/60 hover:text-white underline decoration-white/20 hover:decoration-white/60 transition-colors"
            >
              {isZh ? "来源：Gov Ball 官方阵容页" : "Source: official lineup page"}
            </a>
          </div>

          <div className="space-y-4">
            {GOV_BALL_2026_LINEUP.map((day) => (
              <div
                key={day.day}
                className="bg-[#181818] rounded-xl p-6 border border-white/10"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {isZh ? `${dayLabelZh[day.day]}（${day.day}）` : day.day}
                  </h3>
                  <p className="text-xs text-white/50">
                    {isZh ? "日期" : "Date"}: {day.date}
                  </p>
                </div>

                <p className="mt-2 text-base font-semibold text-white">
                  {day.headliners.join(" • ")}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {day.artists.map((name) => (
                    <span
                      key={name}
                      className="text-xs text-white/70 bg-white/5 border border-white/10 rounded-full px-2 py-1"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-white/50 leading-relaxed">
            {isZh
              ? "注：以上为依据官方海报/阵容页整理的文本参考，如有变更请以官方内容为准。"
              : "Note: This is a text transcription of the official poster/page for reference. Always rely on official sources for updates."}
          </p>
        </section>

        <section className="mt-8 space-y-3 text-white/70 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "快速清单" : "Quick checklist"}
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white">
            {isZh ? "常见问题" : "FAQ"}
          </h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <div
                key={item.q}
                className="bg-[#181818] rounded-lg p-5 border border-white/10"
              >
                <h3 className="text-sm font-semibold text-white mb-2">
                  {item.q}
                </h3>
                <p className="text-sm text-white/70">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-xs text-white/50 leading-relaxed">
          {isZh
            ? "免责声明：本文为信息整理与工具引导，不代表 Gov Ball 官方。Governors Ball / Gov Ball 相关商标与内容归其权利方所有。"
            : "Disclaimer: This is a third-party informational page and not an official Gov Ball publication. Governors Ball / Gov Ball trademarks and content belong to their respective owners."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
