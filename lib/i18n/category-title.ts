import type { Locale } from "@/lib/i18n/routing";

type LocalizableCategory = {
  title: string;
  titleEn?: string | null;
  titleDe?: string | null;
};

export function categoryTitle(
  cat: LocalizableCategory,
  locale: Locale | string,
): string {
  if (locale === "en") return cat.titleEn ?? cat.title;
  if (locale === "de") return cat.titleDe ?? cat.title;
  return cat.title;
}
