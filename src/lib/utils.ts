/**
 * 工具函数
 */

/**
 * 从各种格式的 Spotify URL/URI 中提取 Track ID
 */
export function extractTrackId(input: string): string | null {
  if (!input) return null;
  
  const trimmed = input.trim();
  
  // spotify:track:xxx
  const uriMatch = trimmed.match(/spotify:track:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  
  // open.spotify.com/track/xxx 或 open.spotify.com/intl-xx/track/xxx
  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  
  // 纯 ID (22 字符的 base62)
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * 从 Spotify URL 中提取 Artist ID
 */
export function extractArtistId(input: string): string | null {
  if (!input) return null;
  
  const trimmed = input.trim();
  
  // spotify:artist:xxx
  const uriMatch = trimmed.match(/spotify:artist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  
  // open.spotify.com/artist/xxx
  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?artist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  
  return null;
}

/**
 * 生成 Track 页面的元数据
 */
export function generateTrackMetadata(track: {
  name: string;
  artists: string[];
  albumArt?: string | null;
}) {
  const artistNames = track.artists.join(', ');
  const title = `${track.name} by ${artistNames} - Canvas Downloader`;
  const description = `Download the Spotify Canvas video for "${track.name}" by ${artistNames}`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: track.albumArt ? [{ url: track.albumArt }] : [],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: track.albumArt ? [track.albumArt] : [],
    },
  };
}

/**
 * 生成 JSON-LD 结构化数据
 */
export function generateJsonLd(track: {
  name: string;
  artists: string[];
  albumArt?: string | null;
  spotifyUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: track.name,
    byArtist: track.artists.map(name => ({
      '@type': 'MusicGroup',
      name,
    })),
    ...(track.albumArt && { image: track.albumArt }),
    ...(track.spotifyUrl && { url: track.spotifyUrl }),
  };
}

/**
 * 格式化时间
 */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * 截断字符串
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

