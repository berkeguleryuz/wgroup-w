import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "tr", "de"] as const,
  defaultLocale: "en",
  localePrefix: "never",
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];

export function localizedPath(_locale: Locale | string, path: string) {
  void _locale;
  return path.startsWith("/") ? path : `/${path}`;
}
