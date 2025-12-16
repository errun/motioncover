"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";

interface Artist {
  id: string;
  name: string;
  image?: string;
  followers: number;
  genres: string[];
  spotifyUrl: string;
}

interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
  spotifyUrl: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<{ artists: Artist[]; tracks: Track[] }>({ artists: [], tracks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error("Search failed");
        }
        const data = await response.json();
        setResults(data);
      } catch {
        setError("Failed to search. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  if (!query) {
    return (
      <div className="text-center py-20">
        <p className="text-white/70">Enter a search query to find artists and tracks</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1db954]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Artists Section */}
      {results.artists.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Artists</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {results.artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artist/${artist.id}`}
                className="bg-[#181818] hover:bg-[#282828] p-4 rounded-lg transition-colors group"
              >
                <div className="aspect-square relative mb-4 rounded-full overflow-hidden bg-[#282828]">
                  {artist.image ? (
                    <Image src={artist.image} alt={artist.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-white truncate">{artist.name}</h3>
                <p className="text-sm text-white/50">Artist</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tracks Section */}
      {results.tracks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>
          <div className="space-y-2">
            {results.tracks.map((track) => (
              <Link
                key={track.id}
                href={`/canvas?link=spotify:track:${track.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#282828] transition-colors group"
              >
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
                  <p className="text-sm text-white/50 truncate">{track.artists.join(", ")} • {track.album}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-[#1db954] text-white rounded-full text-sm font-medium transition-opacity">
                  Get Canvas
                </button>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-6xl mx-auto w-full">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1db954]"></div></div>}>
          <SearchContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

