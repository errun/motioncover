import type { Metadata } from "next";
import { getRequestLocale } from "@/i18n/server";
import { withLocalePathname } from "@/i18n/routing";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const isZh = locale === "zh";

  return {
    title: isZh ? "Canvas 预览与下载" : "Canvas Preview & Download",
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `${baseUrl}${withLocalePathname("/downloader", locale)}`,
    },
  };
}

export default function CanvasLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
