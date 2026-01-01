/**
 * Spotify Core 模块
 * 提供 Spotify 认证、链接解析等基础功能
 * 
 * @module features/spotify-core
 */

// Types
export type {
  TokenCache,
  SpotifyLinkType,
  ParsedSpotifyLink,
  SpotifyTrack,
  TrackInfo,
  CanvasInfo,
  CanvasApiResponse,
  SearchResult,
} from './types';

// Auth
export {
  getAccessToken,
  getClientCredentialsToken,
  getAnonymousToken,
  clearTokenCache,
} from './auth';

// Link Resolver
export {
  isSpotifyLink,
  extractTrackId,
  extractArtistId,
  extractAlbumId,
  extractPlaylistId,
  parseSpotifyInput,
  buildSpotifyUrl,
} from './linkResolver';

