"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMessages } from "@/i18n/messages";
import { getLocaleFromPathname, withLocalePathname } from "@/i18n/routing";

export default function Footer() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);

  return (
    <footer className="mt-auto py-6 text-center text-white/50 text-sm border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4">
        <p>
          © {new Date().getFullYear()} MotionCover -{" "}
          <Link
            href={withLocalePathname("/about", locale)}
            className="hover:text-white transition-colors"
          >
            {messages.footer.about}
          </Link>
        </p>
        <p className="mt-2 text-xs">{messages.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
