/**
 * Canvas API 路由
 * 获取 Spotify 歌曲的 Canvas 视频和元数据
 *
 * @module api/canvas
 */

import { NextRequest, NextResponse } from "next/server";
import { extractTrackId } from "@/features/spotify-core";
import { getCanvasApiResponse } from "@/services/spotifyService";
import logger from "@/lib/logger";

const log = logger.withPrefix('CanvasAPI');

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const link = searchParams.get("link");
  const debug = searchParams.get("debug") === "true";

  log.info('收到请求', { link });

  // 验证参数
  if (!link) {
    log.warn('缺少 link 参数');
    return NextResponse.json(
      { error: "Missing link parameter" },
      { status: 400 }
    );
  }

  // 解析 Track ID
  const trackId = extractTrackId(link);
  if (!trackId) {
    log.warn('无效的 Spotify 链接', { link });
    return NextResponse.json(
      { error: "Invalid Spotify link" },
      { status: 400 }
    );
  }

  log.info('解析成功', { trackId });

  // 调用服务层获取完整响应
  const response = await getCanvasApiResponse(trackId);

  // 添加调试信息（如果请求）
  const finalResponse = debug
    ? { ...response, _debug: { trackId, link } }
    : response;

  log.info('响应完成', {
    trackId,
    hasCanvas: !!response.canvasUrl,
    name: response.name
  });

  return NextResponse.json(finalResponse, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
