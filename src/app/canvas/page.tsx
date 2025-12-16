"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";

interface TrackData {
  trackId: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
  canvasUrl?: string;
  spotifyUrl: string;
  embedUrl?: string;
  networkError?: boolean;
  error?: string;
  artistImage?: string;
	  artistUrl?: string;
}

// Extract track ID from Spotify link
function extractTrackId(input: string): string | null {
  if (input.startsWith("spotify:track:")) {
    return input.split(":")[2];
  }
  const patterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /spotify\.com\/intl-[a-z]+\/track\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  if (/^[a-zA-Z0-9]{22}$/.test(input)) return input;
  return null;
}

// Parse canvas data from HTML
function parseCanvasHtml(html: string): Partial<TrackData> {
  const canvasMatch = html.match(/https:\/\/canvaz\.scdn\.co\/[^"'\s]+\.mp4/);
  const artistNameMatch = html.match(/<b>([^<]+)<\/b>\s*<\/a>\s*<\/p>/);
  const artistImageMatch = html.match(/https:\/\/i\.scdn\.co\/image\/ab6761610000[^"'\s]+/);
  const albumArtMatch = html.match(/https:\/\/i\.scdn\.co\/image\/ab67616d[^"'\s]+/);

  return {
    canvasUrl: canvasMatch ? canvasMatch[0] : undefined,
    artists: artistNameMatch ? [artistNameMatch[1]] : undefined,
    artistImage: artistImageMatch ? artistImageMatch[0] : undefined,
    albumArt: albumArtMatch ? albumArtMatch[0] : undefined,
  };
}

function CanvasContent() {
  const searchParams = useSearchParams();
  const link = searchParams.get("link") || "";
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotifyTitle, setSpotifyTitle] = useState<string | null>(null);
  const [spotifyThumbnail, setSpotifyThumbnail] = useState<string | null>(null);

  // 点击 Download 时强制触发文件下载，而不是在新标签页打开视频
  const handleDownloadClick = async () => {
    if (!trackData?.canvasUrl) return;

    try {
      const response = await fetch(trackData.canvasUrl);
      if (!response.ok) {
        throw new Error("Download failed");
      }

	      const blob = await response.blob();
	      const url = window.URL.createObjectURL(blob);
	      const a = document.createElement("a");
	      a.href = url;
	      // 文件名：艺术家名 + 歌曲名 + canvas.mp4
	      const title = spotifyTitle || trackData.name || "Canvas";
	      const artist =
	        trackData.artists && trackData.artists.length > 0
	          ? trackData.artists.join(", ")
	          : "Unknown Artist";
	      let baseName = `${artist} - ${title} canvas`;
	      // 去掉文件名中不允许的字符
	      baseName = baseName
	        .replace(/[\\/:*?"<>|]+/g, "")
	        .replace(/\s+/g, " ")
	        .trim();
	      if (baseName.length > 80) {
	        baseName = baseName.slice(0, 80);
	      }
	      a.download = `${baseName}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Canvas download error", e);
      alert("下载失败，请稍后再试");
    }
  };

  useEffect(() => {
    if (!link) {
      setLoading(false);
      setError("No track link provided");
      return;
    }

    const fetchTrackData = async () => {
      setLoading(true);
      setError(null);

      const trackId = extractTrackId(link);
      if (!trackId) {
        setError("Invalid Spotify link");
        setLoading(false);
        return;
      }

      // Use server API with fallback to embed
      try {
        const response = await fetch(`/api/canvas?link=${encodeURIComponent(link)}`);
        const data = await response.json();

        if (response.ok) {
          setTrackData(data);
        } else {
          // Show embed and link to canvasdownloader.com as fallback
          setTrackData({
            trackId,
            name: "Spotify Track",
            artists: ["Unknown Artist"],
            album: "Unknown Album",
            spotifyUrl: `https://open.spotify.com/track/${trackId}`,
            embedUrl: `https://open.spotify.com/embed/track/${trackId}`,
            networkError: true,
            error: data.error || "Failed to fetch track data",
          });
        }
      } catch (err) {
        setTrackData({
          trackId,
          name: "Spotify Track",
          artists: ["Unknown Artist"],
          album: "Unknown Album",
          spotifyUrl: `https://open.spotify.com/track/${trackId}`,
          embedUrl: `https://open.spotify.com/embed/track/${trackId}`,
          networkError: true,
          error: err instanceof Error ? err.message : "Network error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTrackData();
  }, [link]);

	  // 客户端从 Spotify oEmbed 获取歌曲标题和封面，用来完善音乐信息显示
	  useEffect(() => {
	    if (!trackData?.trackId) return;

	    let cancelled = false;

	    const fetchSpotifyMeta = async () => {
	      try {
	        const res = await fetch(
	          `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackData.trackId}`
	        );
	        if (!res.ok) return;
	        const data = await res.json();
	        if (cancelled) return;
	        setSpotifyTitle(data.title || null);
	        setSpotifyThumbnail(data.thumbnail_url || null);
	      } catch {
	        // 忽略错误，保持后端返回的占位信息
	      }
	    };

	    fetchSpotifyMeta();

	    return () => {
	      cancelled = true;
	    };
	  }, [trackData?.trackId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1db954]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <a href="/" className="text-[#1db954] hover:underline">Go back home</a>
      </div>
    );
  }

  if (!trackData) {
    return null;
  }

  // If there's a network error, still只在本站展示内容，不跳转第三方网站
  if (trackData.networkError) {
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

          {/* Spotify Embed（仍然在本站内嵌显示） */}
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

		  // 顶部展示改为“艺术家信息”：优先使用艺术家头像，其次才用专辑封面 / oEmbed 缩略图
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
		      ? `https://open.spotify.com/search/${encodeURIComponent(
		          trackData.artists[0]
		        )}/artists`
		      : null);

	  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#181818] rounded-2xl p-8">
	        {/* Track / Artist Info */}
		        <div className="flex items-center gap-6 mb-8">
		          {artistProfileUrl ? (
		            <a
		              href={artistProfileUrl}
		              target="_blank"
		              rel="noopener noreferrer"
		              className="w-32 h-32 relative rounded-lg overflow-hidden bg-[#282828] flex-shrink-0 shadow-xl hover:opacity-90 transition-opacity cursor-pointer"
		            >
			              {displayCover ? (
				                <Image src={displayCover} alt={artistName} fill className="object-cover" />
		              ) : (
		                <div className="w-full h-full flex items-center justify-center">
		                  <svg className="w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 24 24">
		                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
		                  </svg>
		                </div>
		              )}
		            </a>
		          ) : (
		            <div className="w-32 h-32 relative rounded-lg overflow-hidden bg-[#282828] flex-shrink-0 shadow-xl">
			              {displayCover ? (
				                <Image src={displayCover} alt={artistName} fill className="object-cover" />
		              ) : (
		                <div className="w-full h-full flex items-center justify-center">
		                  <svg className="w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 24 24">
		                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
		                  </svg>
		                </div>
		              )}
		            </div>
		          )}
		          <div className="flex-1">
		            {/* 红框区域：改为显示艺术家名称 */}
		            <h1 className="text-2xl font-bold text-white mb-2">{artistName}</h1>

	            {/* 顶部 Spotify 播放器：在这里控制音乐播放并显示官方信息 */}
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

        {/* Canvas Preview */}
	        <div className="mb-10">
	          <h2 className="text-lg font-semibold text-white mb-4">Canvas Preview</h2>
	          <div className="aspect-[9/16] max-w-xs md:max-w-xs lg:max-w-sm mx-auto bg-[#282828] rounded-lg overflow-hidden relative">
	            {trackData.canvasUrl ? (
	              <video
	                src={trackData.canvasUrl}
	                loop
	                controls
	                muted
	                playsInline
	                className="w-full h-full object-contain bg-black"
	              />
	            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/50 p-4 text-center">
                <svg className="w-16 h-16 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                <p>Canvas not available for this track</p>
                <p className="text-sm mt-2">Not all tracks have a Canvas video</p>
              </div>
            )}
          </div>
        </div>

        {/* Download Button */}
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
      </div>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1db954]"></div></div>}>
          <CanvasContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

