export const LOCALES = ["en", "zh"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(maybeLocale: string): maybeLocale is Locale {
  return (LOCALES as readonly string[]).includes(maybeLocale);
}

export function getLocaleFromPathname(pathname: string | null | undefined): Locale {
  if (!pathname) return DEFAULT_LOCALE;
  const segment = pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : DEFAULT_LOCALE;
}

export function stripLocaleFromPathname(pathname: string): string {
  const segment = pathname.split("/")[1] ?? "";
  if (!isLocale(segment)) return pathname === "" ? "/" : pathname;
  const stripped = pathname.replace(new RegExp(`^/${segment}(?=/|$)`), "");
  return stripped === "" ? "/" : stripped;
}

export function withLocalePathname(pathname: string, locale: Locale): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const withoutLocale = stripLocaleFromPathname(normalized);
  if (withoutLocale === "/") return `/${locale}`;
  return `/${locale}${withoutLocale}`;
}

export function localeToLang(locale: Locale) {
  switch (locale) {
    case "zh":
      return "zh-CN";
    default:
      return "en";
  }
}

