import { NextRequest } from "next/server";

export const runtime = "nodejs";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const isAllowedHost = (host: string) => {
  const normalized = host.toLowerCase();
  return normalized === "scdn.co" || normalized.endsWith(".scdn.co");
};

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return Response.json({ error: "Invalid url parameter" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return Response.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  if (!isAllowedHost(target.hostname)) {
    return Response.json({ error: "Host not allowed" }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Failed to fetch asset" }, { status: upstream.status || 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    headers.set("content-length", contentLength);
  }
  headers.set("cache-control", "public, max-age=86400, immutable");

  return new Response(upstream.body, { status: upstream.status, headers });
}
