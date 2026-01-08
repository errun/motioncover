import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEFAULT_LOCALE, isLocale } from "./i18n/routing";

const PUBLIC_FILE_REGEX =
	/\.(?:png|jpe?g|svg|gif|webp|avif|ico|mp4|webm|mp3|wav|ogg)$/i;

function getLocaleFromPathname(pathname: string) {
	const segment = pathname.split("/")[1] ?? "";
	return isLocale(segment) ? segment : null;
}

function stripLocaleFromPathname(pathname: string, locale: string) {
	const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
	return stripped === "" ? "/" : stripped;
}

function shouldSkipLocaleRedirect(pathname: string) {
	return (
		pathname.startsWith("/api") ||
		pathname.startsWith("/_next") ||
		pathname.startsWith("/imgs") ||
		pathname === "/favicon.ico" ||
		pathname === "/robots.txt" ||
		pathname === "/sitemap.xml" ||
		PUBLIC_FILE_REGEX.test(pathname)
	);
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (shouldSkipLocaleRedirect(pathname)) {
		return NextResponse.next();
	}

	const localeFromPath = getLocaleFromPathname(pathname);

	if (!localeFromPath) {
		const url = request.nextUrl.clone();
		url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
		return NextResponse.redirect(url);
	}

	const url = request.nextUrl.clone();
	url.pathname = stripLocaleFromPathname(pathname, localeFromPath);

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-locale", localeFromPath);

	return NextResponse.rewrite(url, {
		request: {
			headers: requestHeaders,
		},
	});
}
