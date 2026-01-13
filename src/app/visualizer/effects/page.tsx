import { redirect } from "next/navigation";
import { getRequestLocale } from "@/i18n/server";
import { withLocalePathname } from "@/i18n/routing";

export default async function VisualizerEffectsPage() {
  const locale = await getRequestLocale();
  redirect(withLocalePathname("/visualizer/cover-25d", locale));
}
