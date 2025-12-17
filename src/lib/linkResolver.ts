/**
 * Spotify 链接解析服务
 * 统一处理各种格式的 Spotify URL/URI
 * 
 * @module lib/linkResolver
 */

export type SpotifyLinkType = 'track' | 'artist' | 'album' | 'playlist' | 'search' | 'unknown';

export interface ParsedSpotifyLink {
  type: SpotifyLinkType;
  id: string | null;
  originalInput: string;
}

// Spotify ID 格式: 22位 base62 字符
const SPOTIFY_ID_REGEX = /^[a-zA-Z0-9]{22}$/;

// URL 模式匹配
const PATTERNS = {
  // spotify:track:xxx 格式
  trackUri: /spotify:track:([a-zA-Z0-9]{22})/,
  artistUri: /spotify:artist:([a-zA-Z0-9]{22})/,
  albumUri: /spotify:album:([a-zA-Z0-9]{22})/,
  playlistUri: /spotify:playlist:([a-zA-Z0-9]{22})/,
  
  // open.spotify.com/track/xxx 或 open.spotify.com/intl-xx/track/xxx
  trackUrl: /open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?track\/([a-zA-Z0-9]{22})/,
  artistUrl: /open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?artist\/([a-zA-Z0-9]{22})/,
  albumUrl: /open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?album\/([a-zA-Z0-9]{22})/,
  playlistUrl: /open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?playlist\/([a-zA-Z0-9]{22})/,
  
  // 通用 spotify.com 检测
  spotifyDomain: /spotify\.com/,
  spotifyUri: /^spotify:/,
};

/**
 * 判断输入是否为 Spotify 链接
 */
export function isSpotifyLink(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  return PATTERNS.spotifyDomain.test(trimmed) || PATTERNS.spotifyUri.test(trimmed);
}

/**
 * 从各种格式中提取 Track ID
 */
export function extractTrackId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // URI 格式: spotify:track:xxx
  const uriMatch = trimmed.match(PATTERNS.trackUri);
  if (uriMatch) return uriMatch[1];
  
  // URL 格式: open.spotify.com/track/xxx
  const urlMatch = trimmed.match(PATTERNS.trackUrl);
  if (urlMatch) return urlMatch[1];
  
  // 纯 ID (22 字符的 base62)
  if (SPOTIFY_ID_REGEX.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * 从各种格式中提取 Artist ID
 */
export function extractArtistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  const uriMatch = trimmed.match(PATTERNS.artistUri);
  if (uriMatch) return uriMatch[1];
  
  const urlMatch = trimmed.match(PATTERNS.artistUrl);
  if (urlMatch) return urlMatch[1];
  
  return null;
}

/**
 * 从各种格式中提取 Album ID
 */
export function extractAlbumId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  const uriMatch = trimmed.match(PATTERNS.albumUri);
  if (uriMatch) return uriMatch[1];
  
  const urlMatch = trimmed.match(PATTERNS.albumUrl);
  if (urlMatch) return urlMatch[1];
  
  return null;
}

/**
 * 从各种格式中提取 Playlist ID
 */
export function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  const uriMatch = trimmed.match(PATTERNS.playlistUri);
  if (uriMatch) return uriMatch[1];
  
  const urlMatch = trimmed.match(PATTERNS.playlistUrl);
  if (urlMatch) return urlMatch[1];
  
  return null;
}

/**
 * 解析 Spotify 输入，返回类型和 ID
 */
export function parseSpotifyInput(input: string): ParsedSpotifyLink {
  if (!input) {
    return { type: 'unknown', id: null, originalInput: input };
  }
  
  const trimmed = input.trim();
  
  // 按优先级尝试解析
  const trackId = extractTrackId(trimmed);
  if (trackId) return { type: 'track', id: trackId, originalInput: input };
  
  const artistId = extractArtistId(trimmed);
  if (artistId) return { type: 'artist', id: artistId, originalInput: input };
  
  const albumId = extractAlbumId(trimmed);
  if (albumId) return { type: 'album', id: albumId, originalInput: input };
  
  const playlistId = extractPlaylistId(trimmed);
  if (playlistId) return { type: 'playlist', id: playlistId, originalInput: input };
  
  // 是 Spotify 链接但无法解析具体类型
  if (isSpotifyLink(trimmed)) {
    return { type: 'unknown', id: null, originalInput: input };
  }
  
  // 当作搜索查询
  return { type: 'search', id: null, originalInput: input };
}

/**
 * 构建 Spotify URL
 */
export function buildSpotifyUrl(type: 'track' | 'artist' | 'album' | 'playlist', id: string): string {
  return `https://open.spotify.com/${type}/${id}`;
}

