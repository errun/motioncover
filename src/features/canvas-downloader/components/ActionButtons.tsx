"use client";

/**
 * 下载和 Spotify 打开按钮
 * @module features/canvas-downloader/components/ActionButtons
 */

import { useCallback } from "react";
import { downloadCanvas } from "../utils/downloadHelper";
import type { TrackData } from "../types";

interface ActionButtonsProps {
  trackData: TrackData;
  spotifyTitle?: string | null;
}

export function ActionButtons({ trackData, spotifyTitle }: ActionButtonsProps) {
  const handleDownloadClick = useCallback(async () => {
    if (!trackData.canvasUrl) return;

    const title = spotifyTitle || trackData.name || "Canvas";
    const artist =
      trackData.artists && trackData.artists.length > 0
        ? trackData.artists.join(", ")
        : "Unknown Artist";

    const result = await downloadCanvas(trackData.canvasUrl, artist, title);
    if (!result.success) {
      alert("下载失败，请稍后再试");
    }
  }, [trackData, spotifyTitle]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      {trackData.canvasUrl && (
        <button
          type="button"
          onClick={handleDownloadClick}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1db954] hover:bg-[#1aa34a] text-white font-semibold rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Canvas
        </button>
      )}
      <a
        href={trackData.spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-white rounded-full transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        Open in Spotify
      </a>
    </div>
  );
}

