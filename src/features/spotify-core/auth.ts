/**
 * Spotify 认证服务
 * 处理 Token 获取与缓存
 * 
 * @module features/spotify-core/auth
 */

import { postJson, fetchWithRetry } from '@/lib/httpClient';
import logger from '@/lib/logger';
import type { TokenCache } from './types';

const log = logger.withPrefix('SpotifyAuth');

let clientCredentialsCache: TokenCache | null = null;
let anonymousTokenCache: TokenCache | null = null;

/**
 * 获取 Client Credentials Token
 * 用于标准 API 调用 (需要 SPOTIFY_CLIENT_ID 和 SPOTIFY_CLIENT_SECRET)
 */
export async function getClientCredentialsToken(): Promise<string | null> {
  if (clientCredentialsCache && Date.now() < clientCredentialsCache.expiresAt - 60000) {
    return clientCredentialsCache.token;
  }
  
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    log.warn('SPOTIFY_CLIENT_ID 或 SPOTIFY_CLIENT_SECRET 未设置');
    return null;
  }
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const result = await postJson<{ access_token: string; expires_in: number }>(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    }
  );
  
  if (!result.ok) {
    log.error('获取 Client Credentials Token 失败', undefined, { error: result.error });
    return null;
  }
  
  clientCredentialsCache = {
    token: result.data.access_token,
    expiresAt: Date.now() + result.data.expires_in * 1000,
  };
  
  log.info('获取 Client Credentials Token 成功');
  return clientCredentialsCache.token;
}

/**
 * 获取 Anonymous Token
 * 用于 Canvas API (不需要配置环境变量)
 */
export async function getAnonymousToken(): Promise<string | null> {
  if (anonymousTokenCache && Date.now() < anonymousTokenCache.expiresAt - 60000) {
    return anonymousTokenCache.token;
  }
  
  try {
    const response = await fetchWithRetry(
      'https://open.spotify.com/get_access_token?reason=transport&productType=web_player',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!response.ok) {
      log.warn('获取 Anonymous Token 失败', { status: response.status });
      return null;
    }
    
    const data = await response.json();
    
    if (!data.accessToken) {
      log.warn('Anonymous Token 响应缺少 accessToken');
      return null;
    }
    
    anonymousTokenCache = {
      token: data.accessToken,
      expiresAt: data.accessTokenExpirationTimestampMs || Date.now() + 3600000,
    };
    
    log.info('获取 Anonymous Token 成功');
    return anonymousTokenCache.token;
  } catch (error) {
    log.error('获取 Anonymous Token 异常', error);
    return null;
  }
}

/**
 * 获取可用的 Token（优先 Client Credentials，回退 Anonymous）
 */
export async function getAccessToken(): Promise<string | null> {
  const ccToken = await getClientCredentialsToken();
  if (ccToken) return ccToken;
  return getAnonymousToken();
}

/**
 * 清除 Token 缓存（用于强制刷新）
 */
export function clearTokenCache(): void {
  clientCredentialsCache = null;
  anonymousTokenCache = null;
  log.info('Token 缓存已清除');
}

