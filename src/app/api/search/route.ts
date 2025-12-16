import { NextRequest, NextResponse } from "next/server";

// Get access token from Spotify (using client credentials flow)
async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}

// Get anonymous access token
async function getAnonymousToken(): Promise<string | null> {
  try {
    const response = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const type = searchParams.get("type") || "artist,track";
  const limit = searchParams.get("limit") || "20";

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  // Try official API first, then fall back to anonymous token
  let accessToken = await getSpotifyAccessToken();
  if (!accessToken) {
    accessToken = await getAnonymousToken();
  }

  if (!accessToken) {
    return NextResponse.json({
      error: "Unable to connect to Spotify. Please try again later.",
      artists: [],
      tracks: []
    }, { status: 503 });
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      // Return empty results instead of error
      return NextResponse.json({ artists: [], tracks: [] });
    }

    const data = await response.json();

    // Format the response
    const results = {
      artists: data.artists?.items.map((artist: {
        id: string;
        name: string;
        images: { url: string }[];
        followers: { total: number };
        genres: string[];
        external_urls: { spotify: string };
      }) => ({
        id: artist.id,
        name: artist.name,
        image: artist.images[0]?.url,
        followers: artist.followers.total,
        genres: artist.genres,
        spotifyUrl: artist.external_urls.spotify,
      })) || [],
      tracks: data.tracks?.items.map((track: {
        id: string;
        name: string;
        artists: { name: string }[];
        album: { name: string; images: { url: string }[] };
        external_urls: { spotify: string };
        preview_url: string | null;
      }) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((a) => a.name),
        album: track.album.name,
        albumArt: track.album.images[0]?.url,
        spotifyUrl: track.external_urls.spotify,
        previewUrl: track.preview_url,
      })) || [],
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ artists: [], tracks: [] });
  }
}

