"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  useTrackData,
  CanvasPreview,
  TrackInfo,
  ActionButtons,
  NetworkErrorFallback,
  LoadingSpinner,
} from "@/features/canvas-downloader";
import { getLocaleFromPathname, withLocalePathname } from "@/i18n/routing";

function CanvasContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const link = searchParams.get("link") || "";
  const { trackData, loading, error, spotifyTitle, spotifyThumbnail } = useTrackData(link);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <Link
          href={withLocalePathname("/", locale)}
          className="text-[#1db954] hover:underline"
        >
          {locale === "zh" ? "返回首页" : "Go back home"}
        </Link>
      </div>
    );
  }

  if (!trackData) {
    return null;
  }

  if (trackData.networkError) {
    return <NetworkErrorFallback trackData={trackData} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#181818] rounded-2xl p-8">
        <TrackInfo trackData={trackData} spotifyThumbnail={spotifyThumbnail} />
        <CanvasPreview canvasUrl={trackData.canvasUrl} canvasNote={trackData.canvasNote} />
        <ActionButtons trackData={trackData} spotifyTitle={spotifyTitle} />
      </div>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4">
        <Suspense fallback={<LoadingSpinner />}>
          <CanvasContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
