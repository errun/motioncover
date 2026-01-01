"use client";

/**
 * 网络错误回退组件
 * @module features/canvas-downloader/components/NetworkErrorFallback
 */

import type { TrackData } from "../types";

interface NetworkErrorFallbackProps {
  trackData: TrackData;
}

export function NetworkErrorFallback({ trackData }: NetworkErrorFallbackProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-[#181818] rounded-2xl p-8">
        {/* Network Error Notice */}
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-6">
          <p className="text-yellow-200 text-sm mb-2">
            ⚠️ 网络连接问题：暂时无法从 Spotify 获取 Canvas 视频。
          </p>
          <p className="text-yellow-100/70 text-xs">
            我们依然会在本页面为你展示 Spotify 播放器，你可以正常播放歌曲。
          </p>
        </div>

        {/* Spotify Embed */}
        {trackData.embedUrl && (
          <div className="mb-8">
            <h3 className="text-white/80 text-sm mb-3">歌曲预览：</h3>
            <iframe
              src={trackData.embedUrl}
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl"
            />
          </div>
        )}

        <div className="flex justify-center">
          <a
            href={trackData.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/20 hover:border-white/40 text-white rounded-full transition-colors text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            在 Spotify 打开
          </a>
        </div>
      </div>
    </div>
  );
}

