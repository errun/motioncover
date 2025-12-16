import { NextRequest, NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
        "User-Agent": USER_AGENT,
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

// Get anonymous access token (no client credentials required)
async function getAnonymousToken(): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      "https://open.spotify.com/get_access_token?reason=transport&productType=web_player",
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://open.spotify.com/",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      const bodyPreview = bodyText.slice(0, 400).replace(/\s+/g, " ").trim();
      console.error(
        `[SpotifyAnon] get_access_token failed: ${response.status} ${response.statusText} bodyPreview=${bodyPreview}`
      );
      return null;
    }

    const data = (await response.json()) as { accessToken?: unknown };
    return typeof data.accessToken === "string" && data.accessToken.length > 0
      ? data.accessToken
      : null;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[SpotifyAnon] get_access_token exception:", error);
    return null;
  }
}

async function getCanvasFromSpotifyTrackCanvases(
  trackId: string,
  accessToken: string
): Promise<{ canvasUrl: string | null; debug?: { status: number; statusText: string; bodyPreview?: string; canvasesCount?: number } } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://spclient.wg.spotify.com/track-canvases/v0/canvases?track_ids=${encodeURIComponent(trackId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          "app-platform": "WebPlayer",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      const bodyPreview = bodyText.slice(0, 400).replace(/\s+/g, " ").trim();
      console.error(
        `[SpotifyCanvas] track-canvases failed: ${response.status} ${response.statusText} bodyPreview=${bodyPreview}`
      );
      return {
        canvasUrl: null,
        debug: { status: response.status, statusText: response.statusText, bodyPreview },
      };
    }

    const data = (await response.json()) as {
      canvases?: Array<{ canvas_url?: unknown; canvasUrl?: unknown; url?: unknown }>;
    };

    const firstCanvas = data.canvases?.[0];
    const canvasUrl =
      (typeof firstCanvas?.canvas_url === "string" ? firstCanvas.canvas_url : null) ||
      (typeof firstCanvas?.canvasUrl === "string" ? firstCanvas.canvasUrl : null) ||
      (typeof firstCanvas?.url === "string" ? firstCanvas.url : null);

    return {
      canvasUrl: canvasUrl || null,
      debug: {
        status: response.status,
        statusText: response.statusText,
        canvasesCount: Array.isArray(data.canvases) ? data.canvases.length : 0,
      },
    };
  } catch {
    clearTimeout(timeoutId);
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const link = searchParams.get("link");
  const debug = searchParams.get("debug") === "true";

  // 调试日志收集
  const debugLogs: string[] = [];
  // Keep `_debug` consistently readable across tooling by restricting to ASCII.
  const sanitizeDebug = (msg: string) => msg.replace(/[^\x20-\x7E]/g, "");
  const log = (msg: string) => {
    console.log(msg);
    debugLogs.push(sanitizeDebug(msg));
  };

  log("=".repeat(60));
  log("[Canvas API] START request");
  log(`[Canvas API] link: ${link}`);
  log(`[Canvas API] runtime: ${process.platform}, Node ${process.version}`);

  if (!link) {
    log("[Canvas API] ERROR missing link param");
    return NextResponse.json({ error: "Missing link parameter", _debug: debug ? debugLogs : undefined }, { status: 400 });
  }

  const trackId = extractTrackId(link);
  log(`[Canvas API] trackId: ${trackId}`);

  if (!trackId) {
    log("[Canvas API] ERROR invalid Spotify link");
    return NextResponse.json({ error: "Invalid Spotify link", _debug: debug ? debugLogs : undefined }, { status: 400 });
  }

  // Step 1: 尝试使用 Spotify 匿名 token 获取 Canvas
  log("[Canvas API] Step1: Spotify track-canvases");
  const anonymousToken = await getAnonymousToken();
  log(`[Canvas API] anon token: ${anonymousToken ? "ok" : "null"}`);
  let spotifyCanvas =
    anonymousToken ? await getCanvasFromSpotifyTrackCanvases(trackId, anonymousToken) : null;
  if (!spotifyCanvas) {
    log("[Canvas API] track-canvases: null (request error/timeout)");
  } else {
    log(
      `[Canvas API] track-canvases: canvasUrl=${spotifyCanvas.canvasUrl || "null"}, canvasesCount=${
        spotifyCanvas.debug?.canvasesCount ?? "?"
      }, status=${spotifyCanvas.debug?.status ?? "?"}`
    );
  }

  // Step 2: 尝试从 Spotify API 获取歌曲信息
  log("[Canvas API] Step2: Spotify Web API track info");
  const accessToken = await getSpotifyAccessToken();
  let trackInfo = null;

  if (accessToken) {
    log("[Canvas API] Web API token ok");
    // Fallback: if anon token is blocked, try using the client-credentials token for track-canvases.
    if (!spotifyCanvas?.canvasUrl) {
      log("[Canvas API] track-canvases retry with Web API token");
      const canvasViaWebToken = await getCanvasFromSpotifyTrackCanvases(trackId, accessToken);
      log(
        `[Canvas API] track-canvases(web): canvasUrl=${canvasViaWebToken?.canvasUrl || "null"}, canvasesCount=${
          canvasViaWebToken?.debug?.canvasesCount ?? "?"
        }, status=${canvasViaWebToken?.debug?.status ?? "?"}`
      );
      if (canvasViaWebToken?.canvasUrl) {
        spotifyCanvas = canvasViaWebToken;
      }
    }

    trackInfo = await getTrackInfoFromAPI(trackId, accessToken);
    log(`[Canvas API] Spotify API result: ${trackInfo ? "ok - " + trackInfo.name : "failed"}`);
  } else {
    log("[Canvas API] Web API token missing, skipped");
  }

  // If we have track info from Spotify API
  if (trackInfo) {
    log("[Canvas API] Responding with Spotify API data");
    const response = {
      trackId,
      name: trackInfo.name,
      artists: trackInfo.artists.map((a: { name: string }) => a.name),
      album: trackInfo.album.name,
      albumArt: trackInfo.album.images[0]?.url,
      canvasUrl: spotifyCanvas?.canvasUrl || null,
      spotifyUrl: trackInfo.external_urls.spotify,
      artistImage: null,
      artistUrl:
        Array.isArray(trackInfo.artists) && trackInfo.artists.length > 0
          ? trackInfo.artists[0]?.external_urls?.spotify ?? null
          : null,
      _debug: debug ? debugLogs : undefined,
    };
    log("=".repeat(60));
    return NextResponse.json(response, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // Fall back to oEmbed for track info
  log("[Canvas API] Step3: fallback to oEmbed");
  const oEmbedInfo = await getTrackInfoFromOEmbed(trackId);
  log(`[Canvas API] oEmbed result: ${oEmbedInfo ? "ok" : "failed"}`);

  // If we have Canvas data, use it even without full track info
  const resolvedCanvasUrl = spotifyCanvas?.canvasUrl || null;
  if (resolvedCanvasUrl) {
    log("[Canvas API] Responding with canvasUrl (no full metadata)");
    const response = {
      trackId,
      name: oEmbedInfo?.title || "Unknown Track",
      artists: ["Unknown Artist"],
      album: "Unknown Album",
      albumArt: oEmbedInfo?.thumbnail_url || null,
      canvasUrl: resolvedCanvasUrl,
      spotifyUrl: `https://open.spotify.com/track/${trackId}`,
      artistImage: null,
      artistUrl: null,
      _debug: debug ? debugLogs : undefined,
    };
    log("=".repeat(60));
    return NextResponse.json(response, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // If we have oEmbed info but no canvas
  if (oEmbedInfo) {
    log("[Canvas API] oEmbed ok, canvas missing");
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
    return NextResponse.json(response, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // Last resort: return basic info with embed URL
  log("[Canvas API] ERROR all methods failed");
  const response = {
    trackId,
    name: `Spotify Track`,
    artists: ["View on Spotify"],
    album: "Unknown Album",
    albumArt: null,
    canvasUrl: spotifyCanvas?.canvasUrl || null,
    spotifyUrl: `https://open.spotify.com/track/${trackId}`,
    embedUrl: `https://open.spotify.com/embed/track/${trackId}`,
    networkError: true,
    error: "无法连接到 Spotify。这可能是网络问题。请检查网络连接或稍后重试。",
    artistUrl: null,
    _debug: debug ? debugLogs : undefined,
  };
  log("=".repeat(60));
  return NextResponse.json(response, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
