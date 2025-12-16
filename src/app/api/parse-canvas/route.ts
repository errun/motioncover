import { NextRequest, NextResponse } from "next/server";

// Parse HTML from canvasdownloader.com to extract data
function parseCanvasDownloaderHtml(html: string): {
  canvasUrl: string | null;
  artistName: string | null;
  artistImage: string | null;
  trackName: string | null;
  albumArt: string | null;
} {
  // Extract Canvas video URL
  const canvasMatch = html.match(/https:\/\/canvaz\.scdn\.co\/[^"'\s]+\.mp4/);
  const canvasUrl = canvasMatch ? canvasMatch[0] : null;
  
  // Extract artist name - look for pattern like <b>Artist Name</b>
  const artistNameMatch = html.match(/<b>([^<]+)<\/b>\s*<\/a>\s*<\/p>/);
  const artistName = artistNameMatch ? artistNameMatch[1] : null;
  
  // Extract artist image
  const artistImageMatch = html.match(/https:\/\/i\.scdn\.co\/image\/ab6761610000[^"'\s]+/);
  const artistImage = artistImageMatch ? artistImageMatch[0] : null;
  
  // Extract track name from title - "Canvas by Artist Name"
  const titleMatch = html.match(/<title>\s*Canvas by ([^·<]+)/);
  const trackName = titleMatch ? titleMatch[1].trim() : null;
  
  // Extract album art (thumbnail from oEmbed or album image)
  const albumArtMatch = html.match(/https:\/\/i\.scdn\.co\/image\/ab67616d[^"'\s]+/);
  const albumArt = albumArtMatch ? albumArtMatch[0] : null;
  
  return { canvasUrl, artistName, artistImage, trackName, albumArt };
}

// Extract track ID from Spotify link
function extractTrackId(input: string): string | null {
  if (input.startsWith("spotify:track:")) {
    return input.split(":")[2];
  }

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

  if (/^[a-zA-Z0-9]{22}$/.test(input)) {
    return input;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html, link } = body;

    if (!html) {
      return NextResponse.json({ error: "Missing HTML content" }, { status: 400 });
    }

    const trackId = link ? extractTrackId(link) : null;
    const parsed = parseCanvasDownloaderHtml(html);

    return NextResponse.json({
      trackId,
      name: parsed.artistName || "Unknown Track", // Artist name is shown in title
      artists: parsed.artistName ? [parsed.artistName] : ["Unknown Artist"],
      album: "Unknown Album",
      albumArt: parsed.albumArt || parsed.artistImage,
      canvasUrl: parsed.canvasUrl,
      artistImage: parsed.artistImage,
      spotifyUrl: trackId ? `https://open.spotify.com/track/${trackId}` : null,
    });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json({ error: "Failed to parse HTML" }, { status: 500 });
  }
}

