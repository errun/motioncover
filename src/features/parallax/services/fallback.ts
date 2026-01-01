/**
 * Depth Map 回退生成
 * @module features/parallax/services/fallback
 */

/**
 * 生成一个永远不会抛异常的 fallback 深度图
 */
export async function safeGenerateFallbackDepthMap(imageBase64: string): Promise<string> {
  try {
    return await generateFallbackDepthMap(imageBase64);
  } catch (err) {
    console.error("generateFallbackDepthMap failed, using static gradient:", err);
    return createRadialGradientDataUrl(512, 512);
  }
}

/**
 * 生成简单的径向渐变深度图作为 fallback
 */
async function generateFallbackDepthMap(_imageBase64: string): Promise<string> {
  // Server 环境没有 document，直接返回 SVG 渐变
  if (typeof document === "undefined") {
    return createRadialGradientDataUrl(512, 512);
  }

  // Browser 端再用 canvas 版本
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return createRadialGradientDataUrl(512, 512);
  }

  // Create radial gradient (center is white/close, edges are black/far)
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.5, "#888888");
  gradient.addColorStop(1, "#000000");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  return canvas.toDataURL("image/png");
}

/**
 * 为服务端创建简单的径向渐变 data URL
 */
export function createRadialGradientDataUrl(width: number, height: number): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <radialGradient id="depth" cx="50%" cy="50%" r="70%">
          <stop offset="0%" style="stop-color:#ffffff"/>
          <stop offset="50%" style="stop-color:#888888"/>
          <stop offset="100%" style="stop-color:#000000"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#depth)"/>
    </svg>
  `;

  // 浏览器端用 window.btoa，Node 端用 Buffer
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return "data:image/svg+xml;base64," + window.btoa(svg);
  }

  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

