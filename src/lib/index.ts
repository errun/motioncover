/**
 * 基础工具库导出
 *
 * @module lib
 */

// Utilities
export { cn } from "./cn";
export {
  generateTrackMetadata,
  generateJsonLd,
  formatDuration,
  delay,
  safeJsonParse,
  truncate,
} from "./utils";

// HTTP Client
export {
  fetchWithTimeout,
  fetchWithRetry,
  HTTP_CONFIG,
  type HttpClientOptions,
} from "./httpClient";

// Logger
export { logger } from "./logger";

// Environment
export {
  env,
  hasSpotifyCredentials,
  hasSpotifySpDc,
  hasVercelKV,
  getEnvStatus,
} from "./env";

// Cache (memory-based)
export {
  cacheGet,
  cacheSet,
  cacheDel,
  getCacheStats,
  cleanupMemoryCache,
} from "./redis";

// API Response Helpers
export {
  success,
  error,
  badRequest,
  invalidBody,
  missingParam,
  invalidParam,
  unauthorized,
  forbidden,
  notFound,
  internalError,
  serviceUnavailable,
  externalApiError,
  rateLimited,
  ErrorCodes,
  type ApiResponse,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ErrorCode,
} from "./apiResponse";
