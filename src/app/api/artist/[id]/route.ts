import { NextRequest, NextResponse } from "next/server";

// Get access token from Spotify
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

    if (!response.ok) return null;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const artistId = resolvedParams.id;

  // Try official API first, then fall back to anonymous token
  let accessToken = await getSpotifyAccessToken();
  if (!accessToken) {
    accessToken = await getAnonymousToken();
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Failed to authenticate with Spotify" }, { status: 500 });
  }

  try {
    // Fetch artist details
    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!artistResponse.ok) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artistData = await artistResponse.json();

    // Fetch artist's top tracks
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let tracks: {
      id: string;
      name: string;
      artists: string[];
      album: string;
      albumArt?: string;
    }[] = [];

    if (tracksResponse.ok) {
      const tracksData = await tracksResponse.json();
      tracks = tracksData.tracks.map((track: {
        id: string;
        name: string;
        artists: { name: string }[];
        album: { name: string; images: { url: string }[] };
      }) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((a) => a.name),
        album: track.album.name,
        albumArt: track.album.images[0]?.url,
      }));
    }

    return NextResponse.json({
      artist: {
        id: artistData.id,
        name: artistData.name,
        image: artistData.images[0]?.url,
        followers: artistData.followers.total,
        genres: artistData.genres,
        spotifyUrl: artistData.external_urls.spotify,
      },
      tracks,
    });
  } catch (error) {
    console.error("Error fetching artist:", error);
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
  }
}

