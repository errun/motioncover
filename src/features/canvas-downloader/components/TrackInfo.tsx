"use client";

/**
 * 歌曲信息显示组件
 * @module features/canvas-downloader/components/TrackInfo
 */

import Image from "next/image";
import type { TrackData } from "../types";

interface TrackInfoProps {
  trackData: TrackData;
  spotifyThumbnail?: string | null;
}

export function TrackInfo({ trackData, spotifyThumbnail }: TrackInfoProps) {
  const artistName =
    trackData.artists && trackData.artists.length > 0
      ? trackData.artists.join(", ")
      : "Unknown Artist";
  
  const displayCover =
    trackData.artistImage || spotifyThumbnail || trackData.albumArt || undefined;
  
  // 点击头像跳转：优先跳到确切的艺术家主页，其次跳到该艺术家的搜索页
  const artistProfileUrl =
    trackData.artistUrl ||
    (trackData.artists && trackData.artists.length > 0
      ? `https://open.spotify.com/search/${encodeURIComponent(trackData.artists[0])}/artists`
      : null);

  const coverContent = (
    <>
      {displayCover ? (
        <Image src={displayCover} alt={artistName} fill className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
      )}
    </>
  );

  return (
    <div className="flex items-center gap-6 mb-8">
      {artistProfileUrl ? (
        <a
          href={artistProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-32 h-32 relative rounded-lg overflow-hidden bg-[#282828] flex-shrink-0 shadow-xl hover:opacity-90 transition-opacity cursor-pointer"
        >
          {coverContent}
        </a>
      ) : (
        <div className="w-32 h-32 relative rounded-lg overflow-hidden bg-[#282828] flex-shrink-0 shadow-xl">
          {coverContent}
        </div>
      )}
      
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white mb-2">{artistName}</h1>
        
        {/* Spotify 播放器 */}
        {trackData.trackId && (
          <div className="mt-3">
            <iframe
              src={`https://open.spotify.com/embed/track/${trackData.trackId}`}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}

