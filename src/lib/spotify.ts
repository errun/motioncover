/**
 * Spotify API 客户端
 * 支持:
 * - Client Credentials 流程
 * - Canvas URL 获取
 * - 缓存集成
 * - 重试逻辑
 */

import { hasSpotifyCredentials, env } from './env';
import { cacheGet, cacheSet } from './redis';
import logger from './logger';

const log = logger.withPrefix('Spotify');

// 请求超时 (10秒)
const REQUEST_TIMEOUT = 10000;

// 重试配置
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Access Token 缓存
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * 带超时的 fetch
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 带重试的 fetch（指数退避）
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // 如果是 429 (Rate Limited)，等待后重试
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
        log.warn(`Rate limited, waiting ${retryAfter}s before retry`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, i);
      log.warn(`Request failed, retrying in ${delay}ms (attempt ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

/**
 * 获取 Spotify Access Token (Client Credentials)
 */
export async function getAccessToken(): Promise<string | null> {
  // 检查缓存的 token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  
  if (!hasSpotifyCredentials()) {
    log.warn('Spotify credentials not configured');
    return null;
  }
  
  try {
    const response = await fetchWithTimeout('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    
    if (!response.ok) {
      log.error('Failed to get access token', null, { status: response.status });
      return null;
    }
    
    const data = await response.json();
    
    // 缓存 token（提前 60 秒过期）
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    
    log.info('Access token obtained');
    return data.access_token;
  } catch (error) {
    log.error('Error getting access token', error);
    return null;
  }
}

/**
 * 获取歌曲信息
 */
export async function getTrackInfo(trackId: string) {
  // 检查缓存
  const cacheKey = `track:${trackId}`;
  const cached = await cacheGet<SpotifyTrack>(cacheKey);
  if (cached) {
    log.debug('Track info from cache', { trackId });
    return cached;
  }
  
  const token = await getAccessToken();
  if (!token) return null;
  
  try {
    const response = await fetchWithRetry(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      log.error('Failed to get track info', null, { status: response.status, trackId });
      return null;
    }
    
    const data = await response.json();
    
    // 缓存 24 小时
    await cacheSet(cacheKey, data);
    
    return data as SpotifyTrack;
  } catch (error) {
    log.error('Error getting track info', error, { trackId });
    return null;
  }
}

// 类型定义
interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string; external_urls: { spotify: string } }>;
  album: { name: string; images: Array<{ url: string }> };
  external_urls: { spotify: string };
}

