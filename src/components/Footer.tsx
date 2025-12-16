import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto py-6 text-center text-white/50 text-sm border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4">
        <p>
          © {new Date().getFullYear()} Canvas Downloader -{" "}
          <Link href="/about" className="hover:text-white transition-colors">
            About
          </Link>
        </p>
        <p className="mt-2 text-xs">
          This site is not affiliated with Spotify. All trademarks belong to their respective owners.
        </p>
      </div>
    </footer>
  );
}

