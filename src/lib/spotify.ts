/**
 * Spotify API 客户端
 *
 * @deprecated 此文件已废弃，请使用 '@/services' 中的服务
 *
 * 迁移指南:
 * - getAccessToken -> import { getAccessToken } from '@/services'
 * - getTrackInfo -> import { getTrackInfo } from '@/services'
 * - SpotifyTrack -> import { SpotifyTrack } from '@/services'
 */

// Re-export from services for backward compatibility
export {
  getAccessToken,
  getTrackInfo,
  type SpotifyTrack,
} from '@/services';
