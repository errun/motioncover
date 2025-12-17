/**
 * Spotify 业务服务
 * 封装歌曲信息、Canvas、搜索等业务逻辑
 *
 * @module services/spotifyService
 */

import { getJson, fetchWithTimeout } from '@/lib/httpClient';
import { getAccessToken, getAnonymousToken, getClientCredentialsToken } from './spotifyAuth';
import logger from '@/lib/logger';

const log = logger.withPrefix('SpotifyService');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// =============================================================================
// 类型定义
// =============================================================================

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string; external_urls?: { spotify: string } }[];
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
  artistUrl?: string;
  album: string;
  albumArt?: string;
  spotifyUrl: string;
  durationMs: number;
}

export interface CanvasInfo {
  canvasUrl: string | null;
  canvasNote?: string;
  debug?: {
    status?: number;
    statusText?: string;
    canvasesCount?: number;
    bodyPreview?: string;
  };
}

export interface CanvasApiResponse {
  trackId: string;
  name: string;
  artists: string[];
  album: string;
  albumArt: string | null;
  canvasUrl: string | null;
  canvasNote?: string;
  spotifyUrl: string;
  artistUrl: string | null;
  artistImage?: string | null;
  networkError?: boolean;
  error?: string;
  embedUrl?: string;
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
    artistUrl: track.artists[0]?.external_urls?.spotify,
    album: track.album.name,
    albumArt: track.album.images[0]?.url,
    spotifyUrl: track.external_urls.spotify,
    durationMs: track.duration_ms,
  };
}

/**
 * 从 track-canvases API 获取 Canvas URL
 * @internal
 */
async function fetchCanvasFromApi(trackId: string, token: string): Promise<CanvasInfo> {
  try {
    const response = await fetchWithTimeout(
      `https://spclient.wg.spotify.com/track-canvases/v0/canvases?track_ids=${encodeURIComponent(trackId)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'User-Agent': USER_AGENT,
          'app-platform': 'WebPlayer',
        },
      },
      10000
    );

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      const bodyPreview = bodyText.slice(0, 400).replace(/\s+/g, ' ').trim();
      log.warn('track-canvases API 失败', { trackId, status: response.status });
      return {
        canvasUrl: null,
        debug: { status: response.status, statusText: response.statusText, bodyPreview },
      };
    }

    const data = await response.json() as {
      canvases?: Array<{ canvas_url?: string; canvasUrl?: string; url?: string }>;
    };

    const firstCanvas = data.canvases?.[0];
    const canvasUrl = firstCanvas?.canvas_url || firstCanvas?.canvasUrl || firstCanvas?.url || null;

    return {
      canvasUrl,
      debug: {
        status: response.status,
        statusText: response.statusText,
        canvasesCount: Array.isArray(data.canvases) ? data.canvases.length : 0,
      },
    };
  } catch (error) {
    log.error('Canvas 请求异常', error);
    return { canvasUrl: null, canvasNote: '请求失败' };
  }
}

/**
 * 获取 Canvas 视频 URL
 * 优先使用 Anonymous Token，失败后尝试 Client Credentials Token
 */
export async function getCanvasUrl(trackId: string): Promise<CanvasInfo> {
  // 1. 尝试使用 Anonymous Token
  const anonToken = await getAnonymousToken();
  if (anonToken) {
    const result = await fetchCanvasFromApi(trackId, anonToken);
    if (result.canvasUrl) {
      log.info('Canvas 获取成功 (Anonymous Token)', { trackId });
      return result;
    }
    log.debug('Anonymous Token Canvas 失败，尝试 Client Credentials', { trackId });
  }

  // 2. 回退到 Client Credentials Token
  const ccToken = await getClientCredentialsToken();
  if (ccToken) {
    const result = await fetchCanvasFromApi(trackId, ccToken);
    if (result.canvasUrl) {
      log.info('Canvas 获取成功 (Client Credentials)', { trackId });
      return result;
    }
  }

  // 3. 都失败
  const canvasNote = anonToken
    ? '该歌曲没有 Canvas 视频'
    : 'Canvas 暂时不可用（Spotify Token 获取失败）';

  return { canvasUrl: null, canvasNote };
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

// =============================================================================
// Canvas API 完整响应（供 /api/canvas 路由使用）
// =============================================================================

/**
 * 获取完整的 Canvas API 响应
 * 整合歌曲信息和 Canvas URL
 */
export async function getCanvasApiResponse(trackId: string): Promise<CanvasApiResponse> {
  // 并行获取歌曲信息和 Canvas
  const [trackInfo, canvasInfo] = await Promise.all([
    getTrackInfo(trackId),
    getCanvasUrl(trackId),
  ]);

  // 如果都失败，尝试 oEmbed
  if (!trackInfo) {
    const oEmbed = await getTrackInfoFromOEmbed(trackId);

    if (oEmbed) {
      return {
        trackId,
        name: oEmbed.name,
        artists: oEmbed.artists,
        album: oEmbed.album || 'Unknown Album',
        albumArt: oEmbed.albumArt || null,
        canvasUrl: canvasInfo.canvasUrl,
        canvasNote: canvasInfo.canvasNote,
        spotifyUrl: oEmbed.spotifyUrl,
        artistUrl: null,
      };
    }

    // 完全失败
    return {
      trackId,
      name: 'Spotify Track',
      artists: ['View on Spotify'],
      album: 'Unknown Album',
      albumArt: null,
      canvasUrl: canvasInfo.canvasUrl,
      canvasNote: canvasInfo.canvasNote,
      spotifyUrl: `https://open.spotify.com/track/${trackId}`,
      artistUrl: null,
      embedUrl: `https://open.spotify.com/embed/track/${trackId}`,
      networkError: true,
      error: '无法连接到 Spotify。请检查网络连接或稍后重试。',
    };
  }

  return {
    trackId,
    name: trackInfo.name,
    artists: trackInfo.artists,
    album: trackInfo.album,
    albumArt: trackInfo.albumArt || null,
    canvasUrl: canvasInfo.canvasUrl,
    canvasNote: canvasInfo.canvasNote,
    spotifyUrl: trackInfo.spotifyUrl,
    artistUrl: trackInfo.artistUrl || null,
  };
}
