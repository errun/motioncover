import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-4xl w-full space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">MOTIONCOVER LAB</p>
          <h1 className="text-3xl sm:text-4xl font-bold">
	            音乐可视化 · <span className="text-purple-400">三大功能入口</span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
	            先选功能，再进入对应工作台。目前支持「音频 Shader 化预览」「封面 2.5D 视差动画」和「AI Architect / Surgeon 智能底图 + 分层实验室」。
          </p>
        </header>

	        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 功能 1：音频 Shader 化 / 效果预览 */}
          <Link
            href="/visualizer/effects"
            className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 flex flex-col justify-between hover:border-purple-500/70 hover:bg-zinc-900/80 transition-colors"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs text-purple-300">
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/40">
                  功能 1
                </span>
                <span>音频 Shader 化 · 效果库</span>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                🎛️ 音频驱动的 Shader / 粒子效果
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                预览基于音频节奏的粒子 / 火焰 / 发光 / 烟雾等视觉效果，并测试 VHS 等后期效果，为后续封面设计挑选合适的视觉语言。
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>进入效果预览面板</span>
              <span className="group-hover:text-purple-300">进入 →</span>
            </div>
          </Link>

	          {/* 功能 2：封面 2.5D 视差动画 */}
          <Link
            href="/visualizer/cover-25d"
            className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 flex flex-col justify-between hover:border-emerald-500/70 hover:bg-zinc-900/80 transition-colors"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs text-emerald-300">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/40">
                  功能 2
                </span>
                <span>封面 2.5D 视差动画</span>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                🖼️ 封面图层分离 + 视差动效
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                上传封面与音乐，使用 AI 自动抠图、补全背景并生成 2.5D 视差动画，适合做 Motion Cover / Canvas 级别的动图展示。
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>进入封面 2.5D 工作台</span>
              <span className="group-hover:text-emerald-300">进入 →</span>
            </div>
	          </Link>

	          {/* 功能 3：AI Architect / Surgeon 实验室 */}
	          <Link
	            href="/visualizer/architect"
	            className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 flex flex-col justify-between hover:border-sky-500/70 hover:bg-zinc-900/80 transition-colors"
	          >
	            <div className="space-y-2">
	              <div className="inline-flex items-center gap-2 text-xs text-sky-300">
	                <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/40">
	                  功能 3
	                </span>
	                <span>AI Architect / Surgeon 实验室</span>
	              </div>
	              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
	                🧠 AI 生成底图 + 智能图层分离
	              </h2>
	              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
	                用 FLUX 1.1 Pro 生成构图清晰的赛博朋克底图，再通过 AI 自动抠图与补全背景，为多层视差和复杂 Motion Cover 打基础。
	              </p>
	            </div>
	            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
	              <span>进入 Architect / Surgeon 实验室</span>
	              <span className="group-hover:text-sky-300">进入 →</span>
	            </div>
	          </Link>
        </section>

        <p className="text-[11px] text-zinc-500 text-center">
          提示：当前为实验室版本，可能会频繁更新交互与视觉。建议桌面端 Chrome / Edge 浏览器访问以获得最佳体验。
        </p>
      </div>
    </main>
  );
}
