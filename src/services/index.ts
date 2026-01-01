/**
 * 服务层导出
 *
 * @module services
 */

// Spotify 认证 (re-export from spotify-core)
export {
  getAccessToken,
  getClientCredentialsToken,
  getAnonymousToken,
  clearTokenCache,
} from '@/features/spotify-core';

// Spotify 业务服务
export {
  getTrackInfo,
  getTrackInfoFromOEmbed,
  getCanvasUrl,
  getCanvasApiResponse,
  searchTracks,
  type SpotifyTrack,
  type TrackInfo,
  type CanvasInfo,
  type CanvasApiResponse,
  type SearchResult,
} from './spotifyService';

// 深度估算服务 (re-export from parallax)
export {
  estimateDepth,
  buildDebugInfo,
  safeGenerateFallbackDepthMap,
  ZOEDEPTH_MODELS,
  type DepthEstimationResult,
  type DepthDebugInfo,
} from '@/features/parallax';
