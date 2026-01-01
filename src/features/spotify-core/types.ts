/**
 * Spotify Core 类型定义
 * @module features/spotify-core/types
 */

// Token 相关
export interface TokenCache {
  token: string;
  expiresAt: number;
}

// 链接解析相关
export type SpotifyLinkType = 'track' | 'artist' | 'album' | 'playlist' | 'search' | 'unknown';

export interface ParsedSpotifyLink {
  type: SpotifyLinkType;
  id: string | null;
  originalInput: string;
}

// Spotify API 响应类型
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

