"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getMessages } from "@/i18n/messages";
import {
  getLocaleFromPathname,
  stripLocaleFromPathname,
  withLocalePathname,
} from "@/i18n/routing";

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const querySuffix = search ? `?${search}` : "";

  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const activePath = stripLocaleFromPathname(pathname);

  const navLinks = [
    { href: "/visualizer", label: messages.nav.visualizer },
    { href: "/spotify-canvas", label: messages.nav.guide },
    { href: "/charts", label: messages.nav.charts },
  ];

  const enHref = withLocalePathname(activePath, "en") + querySuffix;
  const zhHref = withLocalePathname(activePath, "zh") + querySuffix;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#121212]/95 backdrop-blur-sm border-b border-white/10">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-6">
        <Link
          href={withLocalePathname("/", locale)}
          className="text-xl font-bold text-white hover:text-[#1db954] transition-colors"
        >
          MotionCover
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          {navLinks.map((link) => {
            const isActive =
              activePath === link.href || activePath.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={withLocalePathname(link.href, locale)}
                className={`text-sm transition-colors ${
                  isActive ? "text-[#1db954]" : "text-gray-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1">
            <Link
              href={enHref}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                locale === "en" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
              }`}
              aria-label="Switch language to English"
            >
              {messages.language.en}
            </Link>
            <Link
              href={zhHref}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                locale === "zh" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
              }`}
              aria-label="切换语言到中文"
            >
              {messages.language.zh}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
