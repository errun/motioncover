import { headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./routing";

export function getRequestLocale(): Locale {
  const locale = headers().get("x-locale");
  return locale && isLocale(locale) ? locale : DEFAULT_LOCALE;
}

