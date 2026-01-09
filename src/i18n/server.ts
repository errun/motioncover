import { headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./routing";

export async function getRequestLocale(): Promise<Locale> {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  return locale && isLocale(locale) ? locale : DEFAULT_LOCALE;
}
