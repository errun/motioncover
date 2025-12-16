/**
 * 缓存封装
 * 当前使用内存缓存，后续可接入 Vercel KV
 */

import { hasVercelKV } from './env';
import logger from './logger';

const log = logger.withPrefix('Cache');

// 缓存 TTL: 24小时
const DEFAULT_TTL = 60 * 60 * 24;

// 内存缓存
const memoryCache = new Map<string, { data: unknown; expiry: number }>();

// 缓存统计
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
};

/**
 * 从缓存获取数据
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    // 使用内存缓存
    const cached = memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      cacheStats.hits++;
      log.debug(`Cache HIT: ${key}`);
      return cached.data as T;
    }
    if (cached) {
      memoryCache.delete(key);
    }
    cacheStats.misses++;
    log.debug(`Cache MISS: ${key}`);
    return null;
  } catch (error) {
    log.error('Cache get error', error, { key });
    return null;
  }
}

/**
 * 设置缓存数据
 */
export async function cacheSet<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    cacheStats.sets++;
    memoryCache.set(key, {
      data,
      expiry: Date.now() + ttl * 1000,
    });
    log.debug(`Cache SET: ${key}, TTL: ${ttl}s`);
  } catch (error) {
    log.error('Cache set error', error, { key });
  }
}

/**
 * 删除缓存
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    memoryCache.delete(key);
    log.debug(`Cache DEL: ${key}`);
  } catch (error) {
    log.error('Cache delete error', error, { key });
  }
}

/**
 * 获取缓存统计
 */
export function getCacheStats() {
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
    : '0.00';
  
  return {
    ...cacheStats,
    hitRate: `${hitRate}%`,
    usingVercelKV: hasVercelKV(),
    memoryCacheSize: memoryCache.size,
  };
}

/**
 * 清理过期的内存缓存
 */
export function cleanupMemoryCache(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of memoryCache.entries()) {
    if (value.expiry <= now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    log.info(`Cleaned ${cleaned} expired memory cache entries`);
  }
}

// 每5分钟清理一次过期缓存
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryCache, 5 * 60 * 1000);
}

