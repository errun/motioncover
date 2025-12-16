import { NextRequest, NextResponse } from "next/server";

// Extract track ID from various Spotify URL formats
function extractTrackId(input: string): string | null {
  // Handle spotify:track:ID format
  if (input.startsWith("spotify:track:")) {
    return input.split(":")[2];
  }

  // Handle various URL formats
  const patterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /spotify\.com\/intl-[a-z]+\/track\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // If it's just an ID (22 chars alphanumeric)
  if (/^[a-zA-Z0-9]{22}$/.test(input)) {
    return input;
  }

  return null;
}

// Get track info using Spotify oEmbed API (no auth required)
async function getTrackInfoFromOEmbed(trackId: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  console.log(`[oEmbed] 开始获取 trackId=${trackId} 的信息`);

  try {
    const url = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
    console.log(`[oEmbed] 请求 URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[oEmbed] 响应状态: ${response.status}`);

    if (!response.ok) {
      console.error(`[oEmbed] API 错误: status=${response.status}, statusText=${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[oEmbed] 成功获取数据:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[oEmbed] 请求异常:", error);
    return null;
  }
}

// Get access token from Spotify (using client credentials flow)
async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  console.log(`[SpotifyAuth] 检查环境变量: SPOTIFY_CLIENT_ID=${clientId ? '已设置' : '未设置'}, SPOTIFY_CLIENT_SECRET=${clientSecret ? '已设置' : '未设置'}`);

  if (!clientId || !clientSecret) {
    console.log("[SpotifyAuth] 缺少 Spotify API 凭证，跳过官方 API");
    return null;
  }

  try {
    console.log("[SpotifyAuth] 正在请求 access token...");
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    console.log(`[SpotifyAuth] Token 响应状态: ${response.status}`);

    if (!response.ok) {
      console.error(`[SpotifyAuth] 获取 token 失败: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log("[SpotifyAuth] 成功获取 access token");
    return data.access_token;
  } catch (error) {
    console.error("[SpotifyAuth] 请求异常:", error);
    return null;
  }
}

// Get detailed track info from Spotify API
async function getTrackInfoFromAPI(trackId: string, accessToken: string) {
  console.log(`[SpotifyAPI] 开始获取 trackId=${trackId} 的详细信息`);

  try {
    const url = `https://api.spotify.com/v1/tracks/${trackId}`;
    console.log(`[SpotifyAPI] 请求 URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log(`[SpotifyAPI] 响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SpotifyAPI] 获取歌曲信息失败: ${response.status}, 响应: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[SpotifyAPI] 成功获取歌曲信息:`, {
      name: data.name,
      artists: data.artists?.map((a: { name: string }) => a.name),
      album: data.album?.name,
      albumArt: data.album?.images?.[0]?.url ? '有' : '无',
    });
    return data;
  } catch (error) {
    console.error("[SpotifyAPI] 请求异常:", error);
    return null;
  }
}

// Parse HTML from canvasdownloader.com to extract data
export function parseCanvasDownloaderHtml(html: string): {
	  canvasUrl: string | null;
	  artistName: string | null;
	  artistImage: string | null;
	  artistUrl: string | null;
	  trackName: string | null;
	  albumArt: string | null;
	} {
  console.log(`[ParseHTML] 开始解析 HTML，长度: ${html.length} 字符`);

  // Extract Canvas video URL
  const canvasMatch = html.match(/https:\/\/canvaz\.scdn\.co\/[^"'\s]+\.mp4/);
  const canvasUrl = canvasMatch ? canvasMatch[0] : null;
  console.log(`[ParseHTML] Canvas URL: ${canvasUrl || '未找到'}`);

	  // Extract artist name - look for pattern like <b>Artist Name</b>
	  const artistNameMatch = html.match(/<b>([^<]+)<\/b>\s*<\/a>\s*<\/p>/);
	  const artistName = artistNameMatch ? artistNameMatch[1] : null;
  console.log(`[ParseHTML] 艺术家名: ${artistName || '未找到'}`);

	  // Extract artist Spotify URL if present
  // allow optional intl-xx prefix and query params (e.g. ?si=...)
	  const artistUrlMatch = html.match(
	    /https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?artist\/[a-zA-Z0-9]+[^"'\s]*/
	  );
	  const artistUrl = artistUrlMatch ? artistUrlMatch[0] : null;
  console.log(`[ParseHTML] 艺术家 URL: ${artistUrl || '未找到'}`);

  // Extract artist image
  const artistImageMatch = html.match(/https:\/\/i\.scdn\.co\/image\/ab6761610000[^"'\s]+/);
  const artistImage = artistImageMatch ? artistImageMatch[0] : null;
  console.log(`[ParseHTML] 艺术家图片: ${artistImage || '未找到'}`);

  // Extract track name from title
  const titleMatch = html.match(/<title>\s*Canvas by ([^·]+)/);
  const trackName = titleMatch ? titleMatch[1].trim() : null;
  console.log(`[ParseHTML] 歌曲名: ${trackName || '未找到'}`);

  // Extract album art (thumbnail)
	  const albumArtMatch = html.match(/https:\/\/i\.scdn\.co\/image\/ab67616d[^"'\s]+/);
	  const albumArt = albumArtMatch ? albumArtMatch[0] : null;
  console.log(`[ParseHTML] 专辑封面: ${albumArt || '未找到'}`);

  // 如果没有找到 Canvas，打印 HTML 片段帮助调试
  if (!canvasUrl) {
    console.log(`[ParseHTML] ⚠️ 未找到 Canvas URL，HTML 前 2000 字符:`);
    console.log(html.substring(0, 2000));
  }

	  return { canvasUrl, artistName, artistImage, artistUrl, trackName, albumArt };
}

// Fetch canvas data from canvasdownloader.com using PowerShell (Windows)
async function getCanvasFromCanvasDownloaderPowerShell(trackId: string): Promise<{
	  canvasUrl: string | null;
	  artistName: string | null;
	  artistImage: string | null;
	  artistUrl: string | null;
	  trackName: string | null;
	  albumArt: string | null;
	} | null> {
  // Only available on Windows
  if (process.platform !== 'win32') {
    console.log("[PowerShell] 当前平台不是 Windows，跳过 PowerShell 方法");
    return null;
  }

  console.log(`[PowerShell] 开始使用 PowerShell 获取 Canvas，trackId=${trackId}`);

  const { execFile } = await import("child_process");
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  try {
    const url = `https://www.canvasdownloader.com/canvas?link=spotify:track:${trackId}`;
    console.log(`[PowerShell] 请求 URL: ${url}`);

    const psCommand = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Invoke-WebRequest -Uri '${url}' -UseBasicParsing -TimeoutSec 30).Content`;

    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psCommand], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024, // 1MB
      timeout: 35000,
    });

    console.log(`[PowerShell] 获取到 HTML，长度: ${stdout?.length || 0} 字符`);

    if (stdout) {
      return parseCanvasDownloaderHtml(stdout);
    }
    return null;
  } catch (error) {
    console.error("[PowerShell] 请求异常:", error);
    return null;
  }
}

// Fetch canvas data from canvasdownloader.com (server-side with fetch)
async function getCanvasFromCanvasDownloaderFetch(trackId: string): Promise<{
	  canvasUrl: string | null;
	  artistName: string | null;
	  artistImage: string | null;
	  artistUrl: string | null;
	  trackName: string | null;
	  albumArt: string | null;
	} | null> {
  console.log(`[FetchMethod] 开始使用 fetch 获取 Canvas，trackId=${trackId}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const url = `https://www.canvasdownloader.com/canvas?link=spotify:track:${trackId}`;
    console.log(`[FetchMethod] 请求 URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[FetchMethod] 响应状态: ${response.status}`);

    if (!response.ok) {
      console.error(`[FetchMethod] 请求失败: status=${response.status}, statusText=${response.statusText}`);
      return null;
    }

    const html = await response.text();
    console.log(`[FetchMethod] 获取到 HTML，长度: ${html.length} 字符`);

    return parseCanvasDownloaderHtml(html);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[FetchMethod] 请求异常:", error);
    return null;
  }
}

// Try both methods to get canvas data
async function getCanvasFromCanvasDownloader(trackId: string): Promise<{
	  canvasUrl: string | null;
	  artistName: string | null;
	  artistImage: string | null;
	  artistUrl: string | null;
	  trackName: string | null;
	  albumArt: string | null;
	} | null> {
  // Try PowerShell first (uses system proxy settings)
  console.log("Trying PowerShell method...");
  const psResult = await getCanvasFromCanvasDownloaderPowerShell(trackId);
  if (psResult?.canvasUrl) {
    console.log("PowerShell method succeeded");
    return psResult;
  }

  // Fall back to fetch
  console.log("Trying fetch method...");
  return getCanvasFromCanvasDownloaderFetch(trackId);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const link = searchParams.get("link");
  const debug = searchParams.get("debug") === "true";

  // 调试日志收集
  const debugLogs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    debugLogs.push(msg);
  };

  log("=".repeat(60));
  log("[Canvas API] 🚀 开始处理请求");
  log(`[Canvas API] 原始 link 参数: ${link}`);
  log(`[Canvas API] 运行环境: ${process.platform}, Node ${process.version}`);

  if (!link) {
    log("[Canvas API] ❌ 缺少 link 参数");
    return NextResponse.json({ error: "Missing link parameter", _debug: debug ? debugLogs : undefined }, { status: 400 });
  }

  const trackId = extractTrackId(link);
  log(`[Canvas API] 解析出的 trackId: ${trackId}`);

  if (!trackId) {
    log("[Canvas API] ❌ 无效的 Spotify 链接");
    return NextResponse.json({ error: "Invalid Spotify link", _debug: debug ? debugLogs : undefined }, { status: 400 });
  }

  // Try to get Canvas from canvasdownloader.com first (most reliable)
  log("[Canvas API] 📡 Step 1: 从 CanvasDownloader.com 获取 Canvas...");
  const canvasData = await getCanvasFromCanvasDownloader(trackId);
  log(`[Canvas API] CanvasDownloader 返回: canvasUrl=${canvasData?.canvasUrl || '无'}, artistName=${canvasData?.artistName || '无'}`);

  // Try to get detailed info from Spotify API
  log("[Canvas API] 📡 Step 2: 尝试从 Spotify API 获取歌曲信息...");
  const accessToken = await getSpotifyAccessToken();
  let trackInfo = null;

  if (accessToken) {
    log("[Canvas API] ✅ 有 access token，使用 Spotify API");
    trackInfo = await getTrackInfoFromAPI(trackId, accessToken);
    log(`[Canvas API] Spotify API 结果: ${trackInfo ? '成功 - ' + trackInfo.name : '失败'}`);
  } else {
    log("[Canvas API] ⚠️ 没有 access token，跳过 Spotify API");
  }

  // If we have track info from Spotify API
  if (trackInfo) {
    log("[Canvas API] ✅ 使用 Spotify API 数据返回");
    const response = {
      trackId,
      name: trackInfo.name,
      artists: trackInfo.artists.map((a: { name: string }) => a.name),
      album: trackInfo.album.name,
      albumArt: trackInfo.album.images[0]?.url,
      canvasUrl: canvasData?.canvasUrl || null,
      spotifyUrl: trackInfo.external_urls.spotify,
      artistImage: canvasData?.artistImage || null,
      artistUrl:
        canvasData?.artistUrl ||
        (Array.isArray(trackInfo.artists) && trackInfo.artists.length > 0
          ? trackInfo.artists[0]?.external_urls?.spotify ?? null
          : null),
      _debug: debug ? debugLogs : undefined,
    };
    log("=".repeat(60));
    return NextResponse.json(response);
  }

  // Fall back to oEmbed for track info
  log("[Canvas API] 📡 Step 3: 降级到 oEmbed API...");
  const oEmbedInfo = await getTrackInfoFromOEmbed(trackId);
  log(`[Canvas API] oEmbed 结果: ${oEmbedInfo ? '成功' : '失败'}`);

  // If we have Canvas data, use it even without full track info
  if (canvasData?.canvasUrl) {
    log("[Canvas API] ✅ 有 Canvas URL，使用 Canvas 数据返回");
    const response = {
      trackId,
      name: oEmbedInfo?.title || "Unknown Track",
      artists: canvasData.artistName ? [canvasData.artistName] : ["Unknown Artist"],
      album: "Unknown Album",
      albumArt: oEmbedInfo?.thumbnail_url || null,
      canvasUrl: canvasData.canvasUrl,
      spotifyUrl: `https://open.spotify.com/track/${trackId}`,
      artistImage: canvasData.artistImage,
      artistUrl: canvasData.artistUrl,
      _debug: debug ? debugLogs : undefined,
    };
    log("=".repeat(60));
    return NextResponse.json(response);
  }

  // If we have oEmbed info but no canvas
  if (oEmbedInfo) {
    log("[Canvas API] ⚠️ 只有 oEmbed 数据，没有 Canvas");
    const response = {
      trackId,
      name: oEmbedInfo.title || "Unknown Track",
      artists: ["Unknown Artist"],
      album: "Unknown Album",
      albumArt: oEmbedInfo.thumbnail_url,
      canvasUrl: null,
      spotifyUrl: `https://open.spotify.com/track/${trackId}`,
      artistUrl: null,
      _debug: debug ? debugLogs : undefined,
    };
    log("=".repeat(60));
    return NextResponse.json(response);
  }

  // Last resort: return basic info with embed URL
  log("[Canvas API] ❌ 所有方法都失败，返回网络错误");
  const response = {
    trackId,
    name: `Spotify Track`,
    artists: ["View on Spotify"],
    album: "Unknown Album",
    albumArt: null,
    canvasUrl: null,
    spotifyUrl: `https://open.spotify.com/track/${trackId}`,
    embedUrl: `https://open.spotify.com/embed/track/${trackId}`,
    networkError: true,
    error: "无法连接到 Spotify。这可能是网络问题。请检查网络连接或稍后重试。",
    artistUrl: null,
    _debug: debug ? debugLogs : undefined,
  };
  log("=".repeat(60));
  return NextResponse.json(response);
}

