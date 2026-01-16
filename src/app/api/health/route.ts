/**
 * 健康检查 API
 * GET /api/health
 */

import { NextResponse } from 'next/server';
import { getEnvStatus } from '@/lib/env';
import { getCacheStats } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  
  const envStatus = getEnvStatus();
  const cacheStats = getCacheStats();
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: envStatus.nodeEnv,
    deployedAt: '2026-01-16T09:30:00Z', // Zeabur deployment test
    
    // 服务状态
    services: {
      spotify: {
        configured: envStatus.hasSpotifyCredentials,
        spDcConfigured: envStatus.hasSpotifySpDc,
      },
      cache: {
        provider: cacheStats.usingVercelKV ? 'vercel-kv' : 'memory',
        stats: cacheStats,
      },
    },
    
    // 运行时信息
    runtime: {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
    },
    
    // 响应时间
    responseTime: `${Date.now() - startTime}ms`,
  };
  
  return NextResponse.json(health, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

