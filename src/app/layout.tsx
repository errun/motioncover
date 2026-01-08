import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Mono } from "next/font/google";
import { getRequestLocale } from "@/i18n/server";
import { localeToLang } from "@/i18n/routing";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";

export const metadata: Metadata = {
  title: {
    default: "MotionCover",
    template: "%s | MotionCover",
  },
  description: "Download Spotify Canvas videos and explore music visualizer tools.",
  keywords: ["Spotify Canvas", "Canvas Downloader", "Motion Cover", "Music Visualizer"],
  authors: [{ name: "MotionCover" }],
  creator: "MotionCover",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "MotionCover",
    title: "MotionCover",
    description: "Download Spotify Canvas videos and explore music visualizer tools.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MotionCover",
    description: "Download Spotify Canvas videos and explore music visualizer tools.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const baseJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "MotionCover",
  url: siteUrl,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getRequestLocale();
  const lang = localeToLang(locale);

  const jsonLd = {
    ...baseJsonLd,
    description:
      locale === "zh"
        ? "下载 Spotify Canvas 循环视频，并探索音乐可视化工具。"
        : "Download Spotify Canvas videos and explore music visualizer tools.",
    inLanguage: lang,
  };

  return (
    <html lang={lang}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
