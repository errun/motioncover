import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
          About Canvas Downloader
        </h1>
        
        <div className="space-y-6 text-white/70 leading-relaxed">
          <div className="bg-[#181818] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">What We Do</h2>
            <p>
              Canvas Downloader is a free tool that allows you to download Spotify Canvas videos. 
              These are the short looping videos that play when you listen to certain tracks on Spotify.
            </p>
          </div>

          <div className="bg-[#181818] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Our Mission</h2>
            <p>
              We believe in making content accessible. Many people love these visual loops and want 
              to save them for personal use, create fan art, or simply enjoy them offline. 
              That&apos;s why we created this simple, ad-free tool.
            </p>
          </div>

          <div className="bg-[#181818] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Privacy First</h2>
            <p>
              We don&apos;t track you, we don&apos;t show ads, and we don&apos;t collect any personal data. 
              Your privacy matters to us. Just paste a link, download your Canvas, and enjoy.
            </p>
          </div>

          <div className="bg-[#181818] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Disclaimer</h2>
            <p>
              Canvas Downloader is not affiliated with, endorsed by, or sponsored by Spotify. 
              All trademarks and copyrights belong to their respective owners. 
              The Canvas videos are property of the artists and labels who created them.
            </p>
          </div>

          <div className="bg-[#181818] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Contact</h2>
            <p>
              Have questions, suggestions, or found a bug? Feel free to reach out. 
              We&apos;re always looking to improve the service.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

