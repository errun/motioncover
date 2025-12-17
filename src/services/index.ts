/**
 * 服务层导出
 * 
 * @module services
 */

// Spotify 认证
export {
  getAccessToken,
  getClientCredentialsToken,
  getAnonymousToken,
  clearTokenCache,
} from './spotifyAuth';

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

