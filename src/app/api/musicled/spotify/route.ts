import { NextRequest } from "next/server";
import { extractTrackId } from "@/features/spotify-core";
import { fetchWithTimeout } from "@/lib/httpClient";

export const runtime = "nodejs";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const decodeUrl = (value: string) => {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value.replace(/\\u002F/g, "/").replace(/\\\//g, "/");
  }
};

const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const parseMetaTags = (html: string) => {
  const map = new Map<string, string>();
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const attrRegex = /([a-zA-Z0-9:-]+)\s*=\s*["']([^"']*)["']/g;

  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(tag)) !== null) {
      attrs[match[1].toLowerCase()] = decodeHtml(decodeUrl(match[2]));
    }
    const key = (attrs.property || attrs.name || "").toLowerCase();
    const content = attrs.content;
    if (key && content && !map.has(key)) {
      map.set(key, content);
    }
  }

  return map;
};

const findMetaContent = (meta: Map<string, string>, key: string): string | null =>
  meta.get(key.toLowerCase()) ?? null;

const findTitleTag = (html: string): string | null => {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!match?.[1]) return null;
  return decodeHtml(match[1]).trim();
};

const findPreviewUrl = (html: string, meta: Map<string, string>): string | null => {
  const metaUrl =
    findMetaContent(meta, "og:audio") ||
    findMetaContent(meta, "music:preview_url") ||
    findMetaContent(meta, "twitter:player:stream");
  if (metaUrl) {
    return metaUrl;
  }

  const patterns = [
    /"audioPreview"\s*:\s*{\s*"url"\s*:\s*"([^"]+)"/,
    /"preview_url"\s*:\s*"([^"]+)"/,
    /"previewUrl"\s*:\s*"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeUrl(match[1]);
    }
  }

  return null;
};

const fetchTrackHtml = async (trackId: string): Promise<string | null> => {
  try {
    const response = await fetchWithTimeout(
      `https://open.spotify.com/track/${trackId}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        },
      },
      8000
    );
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
};

const parseTrackTitle = (title: string, description: string | null) => {
  const cleanedTitle = title.replace(/\s*\|\s*Spotify.*$/i, "").trim();
  let name = cleanedTitle || title;
  let artists: string[] = [];

  if (cleanedTitle.includes(" by ")) {
    const [trackName, artistPart] = cleanedTitle.split(" by ");
    name = trackName.trim();
    const artistText = artistPart.split(" - ")[0].trim();
    artists = artistText.split(",").map((value) => value.trim()).filter(Boolean);
  } else if (description) {
    const match = description.match(/Listen to (.+?) by (.+?) on Spotify/i);
    if (match) {
      name = match[1].trim();
      artists = match[2].split(",").map((value) => value.trim()).filter(Boolean);
    }
  }

  if (!artists.length && description) {
    const match = description.match(/Listen to (.+?) on Spotify\.?\s*(.+)?/i);
    if (match && match[2]) {
      artists = match[2].split(",").map((value) => value.trim()).filter(Boolean);
    }
  }

  return {
    name: name || "Spotify Track",
    artists: artists.length ? artists : ["Unknown Artist"],
  };
};

const parseTrackHtml = (html: string) => {
  const meta = parseMetaTags(html);
  const title =
    findMetaContent(meta, "og:title") ||
    findMetaContent(meta, "twitter:title") ||
    findTitleTag(html);
  const description =
    findMetaContent(meta, "og:description") || findMetaContent(meta, "description");
  const albumArt =
    findMetaContent(meta, "og:image") ||
    findMetaContent(meta, "twitter:image");
  const duration = findMetaContent(meta, "music:duration");
  const previewUrl = findPreviewUrl(html, meta);

  const { name, artists } = parseTrackTitle(title || "Spotify Track", description);
  const durationSec = duration ? parseInt(duration, 10) : 0;

  return {
    name,
    artists,
    albumArt,
    previewUrl,
    durationMs: Number.isFinite(durationSec) ? durationSec * 1000 : 0,
  };
};

const fetchOEmbed = async (trackId: string) => {
  try {
    const response = await fetchWithTimeout(
      `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      },
      8000
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { title?: string; thumbnail_url?: string };
    if (!data.title) return null;
    const parts = data.title.split(" by ");
    const name = parts[0] || data.title;
    const artistText = parts.slice(1).join(" by ") || "Unknown Artist";
    return {
      name: name.trim() || "Spotify Track",
      artists: artistText.split(",").map((value) => value.trim()).filter(Boolean),
      albumArt: data.thumbnail_url || null,
      durationMs: 0,
    };
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  const link = request.nextUrl.searchParams.get("link");
  if (!link) {
    return Response.json({ error: "Missing link parameter" }, { status: 400 });
  }

  const trackId = extractTrackId(link);
  if (!trackId) {
    return Response.json({ error: "Invalid Spotify link" }, { status: 400 });
  }

  const html = await fetchTrackHtml(trackId);
  const htmlData = html ? parseTrackHtml(html) : null;
  const needsOEmbed = !htmlData?.name || !htmlData?.albumArt;
  const oEmbedData = needsOEmbed ? await fetchOEmbed(trackId) : null;

  const name = htmlData?.name ?? oEmbedData?.name ?? "Spotify Track";
  const artists = htmlData?.artists ?? oEmbedData?.artists ?? ["Unknown Artist"];
  const albumArt = htmlData?.albumArt ?? oEmbedData?.albumArt ?? null;
  const previewUrl = htmlData?.previewUrl ?? null;
  const durationMs = htmlData?.durationMs ?? oEmbedData?.durationMs ?? 0;

  return Response.json({
    trackId,
    name,
    artists,
    albumArt,
    previewUrl,
    spotifyUrl: `https://open.spotify.com/track/${trackId}`,
    durationMs,
  });
}
