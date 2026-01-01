/**
 * Canvas Downloader 类型定义
 * @module features/canvas-downloader/types
 */

export interface TrackData {
  trackId: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
  canvasUrl?: string;
  canvasNote?: string | null;
  spotifyUrl: string;
  embedUrl?: string;
  networkError?: boolean;
  error?: string;
  artistImage?: string;
  artistUrl?: string;
}

export interface TrackDataState {
  trackData: TrackData | null;
  loading: boolean;
  error: string | null;
  spotifyTitle: string | null;
  spotifyThumbnail: string | null;
}

