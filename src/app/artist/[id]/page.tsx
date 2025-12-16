"use client";

import { useEffect, useState, use } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";

interface Artist {
  name: string;
  image?: string;
  followers: number;
  genres: string[];
}

interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
}

export default function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        // Fetch artist details and top tracks
        const response = await fetch(`/api/artist/${resolvedParams.id}`);
        if (response.ok) {
          const data = await response.json();
          setArtist(data.artist);
          setTracks(data.tracks || []);
        }
      } catch (error) {
        console.error("Failed to fetch artist:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [resolvedParams.id]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1db954]"></div>
          </div>
        ) : artist ? (
          <>
            {/* Artist Header */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
              <div className="w-48 h-48 relative rounded-full overflow-hidden bg-[#282828] flex-shrink-0">
                {artist.image ? (
                  <Image src={artist.image} alt={artist.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-20 h-20 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-center md:text-left">
                <p className="text-white/50 text-sm uppercase tracking-wider mb-2">Artist</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{artist.name}</h1>
                <p className="text-white/70">
                  {artist.followers.toLocaleString()} followers
                </p>
                {artist.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                    {artist.genres.slice(0, 5).map((genre) => (
                      <span key={genre} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/70">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tracks */}
            <h2 className="text-2xl font-bold text-white mb-6">Top Tracks</h2>
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <Link
                  key={track.id}
                  href={`/canvas?link=spotify:track:${track.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#282828] transition-colors group"
                >
                  <span className="w-8 text-center text-white/50">{index + 1}</span>
                  <div className="w-12 h-12 relative rounded overflow-hidden bg-[#282828] flex-shrink-0">
                    {track.albumArt ? (
                      <Image src={track.albumArt} alt={track.album} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{track.name}</h3>
                    <p className="text-sm text-white/50 truncate">{track.album}</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-[#1db954] text-white rounded-full text-sm font-medium transition-opacity">
                    Get Canvas
                  </button>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-white/50">Artist not found</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

