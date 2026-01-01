"use client";

/**
 * 获取歌曲数据的 Hook
 * @module features/canvas-downloader/hooks/useTrackData
 */

import { useEffect, useState } from "react";
import { extractTrackId } from "@/features/spotify-core";
import type { TrackData, TrackDataState } from "../types";

export function useTrackData(link: string): TrackDataState {
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotifyTitle, setSpotifyTitle] = useState<string | null>(null);
  const [spotifyThumbnail, setSpotifyThumbnail] = useState<string | null>(null);

  // 获取歌曲数据
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

      try {
        const response = await fetch(`/api/canvas?link=${encodeURIComponent(link)}`);
        const data = await response.json();

        if (response.ok) {
          setTrackData(data);
        } else {
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
        const trackId = extractTrackId(link);
        setTrackData({
          trackId: trackId || "",
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

  // 从 Spotify oEmbed 获取歌曲标题和封面
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
        // 忽略错误
      }
    };

    fetchSpotifyMeta();

    return () => {
      cancelled = true;
    };
  }, [trackData?.trackId]);

  return { trackData, loading, error, spotifyTitle, spotifyThumbnail };
}

