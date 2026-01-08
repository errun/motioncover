import type { Metadata } from "next";
import { getRequestLocale } from "@/i18n/server";
import { withLocalePathname } from "@/i18n/routing";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const isZh = locale === "zh";

  return {
    title: isZh ? "搜索" : "Search",
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/downloader", locale)}`,
    },
  };
}

export default function SearchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

