/**
 * HTTP 客户端 - 底层基础设施
 * 提供超时、重试、Rate Limit 处理
 * 
 * @module lib/httpClient
 */

import logger from './logger';

const log = logger.withPrefix('HttpClient');

// 默认配置
export const HTTP_CONFIG = {
  defaultTimeout: 10000,    // 10 秒
  maxRetries: 3,
  initialRetryDelay: 1000,  // 1 秒
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export interface HttpClientOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

/**
 * 带超时的 fetch
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = HTTP_CONFIG.defaultTimeout
): Promise<Response> {
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
 * 处理 Rate Limit (429)
 */
async function handleRateLimit(response: Response): Promise<number> {
  const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
  log.warn(`Rate limited, waiting ${retryAfter}s before retry`);
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  return retryAfter;
}

/**
 * 带重试的 fetch（指数退避）
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: { retries?: number; timeout?: number } = {}
): Promise<Response> {
  const maxRetries = config.retries ?? HTTP_CONFIG.maxRetries;
  const timeout = config.timeout ?? HTTP_CONFIG.defaultTimeout;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      
      // 处理 Rate Limit
      if (response.status === 429) {
        await handleRateLimit(response);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      const delay = HTTP_CONFIG.initialRetryDelay * Math.pow(2, attempt);
      log.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

/**
 * JSON GET 请求
 */
export async function getJson<T>(
  url: string,
  options: HttpClientOptions = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': HTTP_CONFIG.userAgent,
        ...options.headers,
      },
    }, { retries: options.retries, timeout: options.timeout });
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false, status: response.status, error: text.slice(0, 200) };
    }
    
    const data = await response.json();
    return { ok: true, data: data as T };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * JSON POST 请求
 */
export async function postJson<T>(
  url: string,
  body: Record<string, unknown> | string,
  options: HttpClientOptions = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const isFormData = typeof body === 'string';
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': isFormData ? 'application/x-www-form-urlencoded' : 'application/json',
        'Accept': 'application/json',
        'User-Agent': HTTP_CONFIG.userAgent,
        ...options.headers,
      },
      body: isFormData ? body : JSON.stringify(body),
    }, { retries: options.retries, timeout: options.timeout });
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false, status: response.status, error: text.slice(0, 200) };
    }
    
    const data = await response.json();
    return { ok: true, data: data as T };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

