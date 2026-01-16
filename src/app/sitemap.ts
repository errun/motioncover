/**
 * sitemap.xml generation
 */

import { MetadataRoute } from "next";
import { withLocalePathname } from "@/i18n/routing";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motioncover.app";

const ROUTES: string[] = [
  "/",
  "/spotify-canvas",
  "/spotify-canvas/dimensions",
  "/spotify-canvas/length",
  "/spotify-canvas/maker",
  "/spotify-canvas/download",
  "/about",
  "/faq",
  "/charts",
  "/governors-ball-2026-lineup",
  "/visualizer/cover-25d",
  "/visualizer/architect",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return ROUTES.map((pathname) => {
    const enUrl = `${baseUrl}${withLocalePathname(pathname, "en")}`;
    const zhUrl = `${baseUrl}${withLocalePathname(pathname, "zh")}`;

    const isHome = pathname === "/";
    const isSpotifyCanvas = pathname === "/spotify-canvas";

    return {
      url: enUrl,
      lastModified: now,
      changeFrequency: isHome ? "weekly" : isSpotifyCanvas ? "weekly" : "monthly",
      priority: isHome ? 1 : isSpotifyCanvas ? 0.9 : 0.7,
      alternates: {
        languages: {
          en: enUrl,
          "zh-CN": zhUrl,
        },
      },
    };
  });
}
