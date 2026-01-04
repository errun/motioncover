/**
 * 环境变量验证和类型安全访问
 */

interface EnvConfig {
  // Spotify API
  SPOTIFY_CLIENT_ID: string | undefined;
  SPOTIFY_CLIENT_SECRET: string | undefined;
  SPOTIFY_SP_DC: string | undefined;
  
  // Vercel KV (Redis)
  KV_REST_API_URL: string | undefined;
  KV_REST_API_TOKEN: string | undefined;
  
  // App
  NODE_ENV: string;
  NEXT_PUBLIC_SITE_URL: string;
}

function getEnv(): EnvConfig {
  return {
    // Spotify
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    SPOTIFY_SP_DC: process.env.SPOTIFY_SP_DC,
    
    // Vercel KV
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    
    // App
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://www.motioncover.app"),
  };
}

export const env = getEnv();

/**
 * 检查 Spotify API 凭证是否可用
 */
export function hasSpotifyCredentials(): boolean {
  return !!(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
}

/**
 * 检查 Spotify SP_DC Cookie 是否可用
 */
export function hasSpotifySpDc(): boolean {
  return !!env.SPOTIFY_SP_DC;
}

/**
 * 检查 Vercel KV 是否可用
 */
export function hasVercelKV(): boolean {
  return !!(env.KV_REST_API_URL && env.KV_REST_API_TOKEN);
}

/**
 * 获取环境状态摘要
 */
export function getEnvStatus() {
  return {
    hasSpotifyCredentials: hasSpotifyCredentials(),
    hasSpotifySpDc: hasSpotifySpDc(),
    hasVercelKV: hasVercelKV(),
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
  };
}
