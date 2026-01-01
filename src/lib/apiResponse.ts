/**
 * 统一 API 响应格式
 * @module lib/apiResponse
 */

import { NextResponse } from "next/server";

// ============ Types ============

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============ Error Codes ============

export const ErrorCodes = {
  // 请求错误 (4xx)
  BAD_REQUEST: "BAD_REQUEST",
  INVALID_BODY: "INVALID_BODY",
  MISSING_PARAM: "MISSING_PARAM",
  INVALID_PARAM: "INVALID_PARAM",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",

  // 服务端错误 (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============ Response Helpers ============

/**
 * 成功响应
 */
export function success<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * 错误响应
 */
export function error(
  code: ErrorCode,
  message: string,
  status = 500,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const errorBody: ApiErrorResponse["error"] = { code, message };
  if (details !== undefined) {
    errorBody.details = details;
  }
  return NextResponse.json({ success: false, error: errorBody }, { status });
}

// ============ 常用错误快捷方法 ============

export function badRequest(message: string, details?: unknown) {
  return error(ErrorCodes.BAD_REQUEST, message, 400, details);
}

export function invalidBody(message = "Invalid request body") {
  return error(ErrorCodes.INVALID_BODY, message, 400);
}

export function missingParam(param: string) {
  return error(ErrorCodes.MISSING_PARAM, `Missing required parameter: ${param}`, 400);
}

export function invalidParam(param: string, message: string) {
  return error(ErrorCodes.INVALID_PARAM, `Invalid parameter '${param}': ${message}`, 400);
}

export function unauthorized(message = "Authentication required") {
  return error(ErrorCodes.UNAUTHORIZED, message, 401);
}

export function forbidden(message = "Access denied") {
  return error(ErrorCodes.FORBIDDEN, message, 403);
}

export function notFound(resource = "Resource") {
  return error(ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
}

export function internalError(message = "Internal server error", details?: unknown) {
  return error(ErrorCodes.INTERNAL_ERROR, message, 500, details);
}

export function serviceUnavailable(message = "Service temporarily unavailable") {
  return error(ErrorCodes.SERVICE_UNAVAILABLE, message, 503);
}

export function externalApiError(service: string, details?: unknown) {
  return error(ErrorCodes.EXTERNAL_API_ERROR, `External API error: ${service}`, 502, details);
}

export function rateLimited(message = "Too many requests") {
  return error(ErrorCodes.RATE_LIMITED, message, 429);
}

