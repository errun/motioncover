import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchBox from "@/components/SearchBox";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canvas Downloader - Download Spotify Canvas Videos",
  description: "Download Spotify Canvas videos for free. Paste a Spotify track link or search for a song to download its Canvas video.",
  openGraph: {
    title: "Canvas Downloader - Download Spotify Canvas Videos",
    description: "Download Spotify Canvas videos for free. Paste a Spotify track link or search for a song to download its Canvas video.",
  },
};

// 版本号：时间精确到分钟
const VERSION = "v1.1.0 (2024-12-17 00:30)";

export default function DownloaderPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Download a Spotify&nbsp;<span className="text-[#1db954]">Canvas</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">{VERSION}</p>
        </div>

        <SearchBox />
      </main>

      <Footer />
    </div>
  );
}

