/**
 * Spotify 业务服务
 * 封装歌曲信息、搜索等业务逻辑
 * 
 * @module services/spotifyService
 */

import { getJson, fetchWithRetry } from '@/lib/httpClient';
import { getAccessToken, getAnonymousToken } from './spotifyAuth';
import logger from '@/lib/logger';

const log = logger.withPrefix('SpotifyService');

// 类型定义
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
  external_urls: { spotify: string };
}

export interface TrackInfo {
  trackId: string;
  name: string;
  artists: string[];
  artistId?: string;
  album: string;
  albumArt?: string;
  spotifyUrl: string;
  durationMs: number;
}

export interface CanvasInfo {
  canvasUrl: string | null;
  canvasNote?: string;
}

export interface SearchResult {
  tracks: TrackInfo[];
  total: number;
}

/**
 * 通过 oEmbed API 获取基本歌曲信息（无需认证）
 */
export async function getTrackInfoFromOEmbed(trackId: string): Promise<TrackInfo | null> {
  const result = await getJson<{
    title: string;
    thumbnail_url: string;
  }>(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
  
  if (!result.ok) {
    log.warn('oEmbed 请求失败', { trackId, error: result.error });
    return null;
  }
  
  // oEmbed 返回格式: "Song Name by Artist Name"
  const parts = result.data.title.split(' by ');
  const name = parts[0] || result.data.title;
  const artist = parts.slice(1).join(' by ') || 'Unknown Artist';
  
  return {
    trackId,
    name,
    artists: [artist],
    album: '',
    albumArt: result.data.thumbnail_url,
    spotifyUrl: `https://open.spotify.com/track/${trackId}`,
    durationMs: 0,
  };
}

/**
 * 通过 Spotify API 获取详细歌曲信息
 */
export async function getTrackInfo(trackId: string): Promise<TrackInfo | null> {
  const token = await getAccessToken();
  
  if (!token) {
    log.warn('无法获取 Token，回退到 oEmbed');
    return getTrackInfoFromOEmbed(trackId);
  }
  
  const result = await getJson<SpotifyTrack>(
    `https://api.spotify.com/v1/tracks/${trackId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  
  if (!result.ok) {
    log.warn('Spotify API 请求失败，回退到 oEmbed', { trackId, error: result.error });
    return getTrackInfoFromOEmbed(trackId);
  }
  
  const track = result.data;
  return {
    trackId: track.id,
    name: track.name,
    artists: track.artists.map(a => a.name),
    artistId: track.artists[0]?.id,
    album: track.album.name,
    albumArt: track.album.images[0]?.url,
    spotifyUrl: track.external_urls.spotify,
    durationMs: track.duration_ms,
  };
}

/**
 * 获取 Canvas 视频 URL
 */
export async function getCanvasUrl(trackId: string): Promise<CanvasInfo> {
  const token = await getAnonymousToken();
  
  if (!token) {
    log.warn('无法获取 Anonymous Token');
    return { canvasUrl: null, canvasNote: 'Token 获取失败' };
  }
  
  try {
    const response = await fetchWithRetry(
      `https://spclient.wg.spotify.com/canvaz-cache/v0/canvases?track_uri=spotify:track:${trackId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      log.warn('Canvas API 请求失败', { trackId, status: response.status });
      return { canvasUrl: null, canvasNote: `API 返回 ${response.status}` };
    }
    
    const data = await response.json();
    const canvas = data.canvases?.[0];
    
    if (canvas?.canvas_url) {
      return { canvasUrl: canvas.canvas_url };
    }
    
    return { canvasUrl: null, canvasNote: '该歌曲没有 Canvas 视频' };
  } catch (error) {
    log.error('Canvas 请求异常', error);
    return { canvasUrl: null, canvasNote: '请求失败' };
  }
}

/**
 * 搜索歌曲
 */
export async function searchTracks(query: string, limit = 20): Promise<SearchResult> {
  const token = await getAccessToken();
  
  if (!token) {
    log.warn('无法获取 Token');
    return { tracks: [], total: 0 };
  }
  
  const result = await getJson<{
    tracks: { items: SpotifyTrack[]; total: number };
  }>(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  
  if (!result.ok) {
    log.warn('搜索请求失败', { query, error: result.error });
    return { tracks: [], total: 0 };
  }
  
  return {
    tracks: result.data.tracks.items.map(track => ({
      trackId: track.id,
      name: track.name,
      artists: track.artists.map(a => a.name),
      artistId: track.artists[0]?.id,
      album: track.album.name,
      albumArt: track.album.images[0]?.url,
      spotifyUrl: track.external_urls.spotify,
      durationMs: track.duration_ms,
    })),
    total: result.data.tracks.total,
  };
}

