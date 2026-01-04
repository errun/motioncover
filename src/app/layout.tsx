import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Mono } from "next/font/google";
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
    default: "Canvas Downloader for Spotify · Download Spotify Canvas loops",
    template: "%s | Canvas Downloader",
  },
  description: "Download Spotify Canvas videos for free. Paste a track link to download Canvas loops.",
  keywords: ["Spotify", "Canvas", "Download", "Video", "Music", "Loop", "Motion Cover"],
  authors: [{ name: "Motion Cover" }],
  creator: "Motion Cover",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Canvas Downloader for Spotify",
    title: "Canvas Downloader for Spotify",
    description: "Download Spotify Canvas videos for free. Paste a track link to download Canvas loops.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Canvas Downloader for Spotify",
    description: "Download Spotify Canvas videos for free",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD 结构化数据
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Canvas Downloader for Spotify",
  description: "Download Spotify Canvas videos for free",
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
  return (
    <html lang="en">
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
