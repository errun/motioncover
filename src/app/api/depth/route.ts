import { NextRequest, NextResponse } from "next/server";
import { estimateDepth, buildDebugInfo } from "@/features/parallax";

// 明确使用 Node.js runtime，保证可以用 Buffer 等 Node API
export const runtime = "nodejs";

/**
 * POST /api/depth
 * 深度估算 API - 使用 Replicate ZoeDepth 或 fallback 渐变图
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const debugSteps: string[] = [];

  // 安全解析 JSON body
  let imageBase64: string | undefined;
  try {
    const body = await request.json();
    imageBase64 = body?.imageBase64;
    debugSteps.push("收到请求并成功解析 JSON body");
  } catch {
    debugSteps.push("解析 JSON body 失败");
    return NextResponse.json(
      {
        error: "Invalid JSON body",
        debug: buildDebugInfo("invalid-body", startedAt, debugSteps),
      },
      { status: 400 }
    );
  }

  if (!imageBase64) {
    debugSteps.push("缺少 imageBase64 字段");
    return NextResponse.json(
      {
        error: "Image is required",
        debug: buildDebugInfo("no-image", startedAt, debugSteps),
      },
      { status: 400 }
    );
  }

  // 调用服务层进行深度估算
  const result = await estimateDepth(imageBase64);

  return NextResponse.json(result);
}
