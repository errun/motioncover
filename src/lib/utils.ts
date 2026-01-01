/**
 * 工具函数
 * 通用工具函数，不包含业务逻辑
 */

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

