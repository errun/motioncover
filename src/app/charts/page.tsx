"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";

interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
}

export default function ChartsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch popular tracks (you would need to implement this API endpoint)
    const fetchCharts = async () => {
      try {
        // For now, search for popular artists to get some tracks
        const response = await fetch("/api/search?q=top%20hits%202024&type=track&limit=50");
        if (response.ok) {
          const data = await response.json();
          setTracks(data.tracks || []);
        }
      } catch (error) {
        console.error("Failed to fetch charts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCharts();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
          Trending Tracks
        </h1>
        <p className="text-white/50 text-center mb-8">
          Discover Canvas from popular tracks
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1db954]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {tracks.map((track, index) => (
              <Link
                key={track.id}
                href={`/canvas?link=spotify:track:${track.id}`}
                className="bg-[#181818] hover:bg-[#282828] p-4 rounded-lg transition-colors group"
              >
                <div className="aspect-square relative mb-4 rounded overflow-hidden bg-[#282828]">
                  {track.albumArt ? (
                    <Image src={track.albumArt} alt={track.album} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-bold">
                    #{index + 1}
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-[#1db954] rounded-full p-3">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <h3 className="font-medium text-white truncate">{track.name}</h3>
                <p className="text-sm text-white/50 truncate">{track.artists.join(", ")}</p>
              </Link>
            ))}
          </div>
        )}

        {!loading && tracks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/50">No tracks available. Please configure Spotify API credentials.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

