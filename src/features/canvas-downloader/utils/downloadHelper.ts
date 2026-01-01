/**
 * Canvas 下载工具函数
 * @module features/canvas-downloader/utils/downloadHelper
 */

/**
 * 生成安全的文件名
 */
export function generateSafeFilename(artist: string, title: string): string {
  let baseName = `${artist} - ${title} canvas`;
  // 去掉文件名中不允许的字符
  baseName = baseName
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (baseName.length > 80) {
    baseName = baseName.slice(0, 80);
  }
  return `${baseName}.mp4`;
}

/**
 * 下载 Canvas 视频
 */
export async function downloadCanvas(
  canvasUrl: string,
  artist: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(canvasUrl);
    if (!response.ok) {
      return { success: false, error: "Download failed" };
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateSafeFilename(artist, title);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (e) {
    console.error("Canvas download error", e);
    return { 
      success: false, 
      error: e instanceof Error ? e.message : "Unknown error" 
    };
  }
}

