import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-20">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-4xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Motion<span className="text-[#1db954]">Cover</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-8">
            音乐可视化 · Canvas 下载 · 艺术封面
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            探索音乐与视觉的完美结合。下载 Spotify Canvas 动态封面，或体验我们的音乐可视化工具。
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full px-4">
          {/* Canvas Downloader */}
          <Link
            href="/downloader"
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#1db954]/50 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-[#1db954]/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#1db954]/30 transition-colors">
              <svg className="w-6 h-6 text-[#1db954]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Canvas 下载器</h3>
            <p className="text-gray-400 text-sm">
              下载 Spotify Canvas 动态视频封面，支持链接粘贴和歌曲搜索
            </p>
          </Link>

          {/* Visualizer */}
          <Link
            href="/visualizer"
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#B026FF]/50 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">音乐可视化</h3>
            <p className="text-gray-400 text-sm">
              Phonk 风格音频可视化，让你的音乐动起来
            </p>
          </Link>

          {/* Charts */}
          <Link
            href="/charts"
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#1db954]/50 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">热门排行</h3>
            <p className="text-gray-400 text-sm">
              发现热门 Canvas 视频和流行歌曲
            </p>
          </Link>
        </div>

        {/* Stats or Description */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            免费 · 无广告 · 开源
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
