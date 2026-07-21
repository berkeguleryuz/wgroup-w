import { getLocale, getTranslations } from "next-intl/server";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";

import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { categoryTitle } from "@/lib/i18n/category-title";
import { formatDuration } from "@/lib/utils";
import { FEATURED_TITLES_TAG } from "@/lib/public-home-catalog";

async function loadFeatured() {
  "use cache";
  cacheLife("minutes");
  cacheTag(FEATURED_TITLES_TAG);

  try {
    const titles = await prisma.title.findMany({
      // Public marketing never surfaces company-only titles.
      where: { published: true, visibility: "PUBLIC" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        category: true,
        episodes: { select: { durationSec: true } },
      },
    });
    return titles;
  } catch {
    return [];
  }
}

const gradients = [
  "linear-gradient(135deg, var(--surface-dark) 0%, var(--cinema-700) 100%)",
  "linear-gradient(135deg, var(--primary) 0%, var(--gold-600) 100%)",
  "linear-gradient(135deg, var(--cinema-800) 0%, var(--cinema-600) 100%)",
  "linear-gradient(135deg, var(--muted-foreground) 0%, var(--surface-dark) 100%)",
  "linear-gradient(135deg, var(--surface-dark) 0%, var(--cinema-600) 100%)",
  "linear-gradient(135deg, var(--primary) 0%, var(--gold-700) 100%)",
];

export async function FeaturedLibrary() {
  const [titles, t, locale] = await Promise.all([
    loadFeatured(),
    getTranslations("featuredLibrary"),
    getLocale(),
  ]);

  return (
    <section id="library" className="border-b border-border/60 bg-muted/40">
      <div className="mx-auto max-w-[1800px] px-6 py-20 md:px-10 md:py-24 xl:px-16">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <span className="font-accent text-xl text-muted-foreground">
              {t("sectionTag")}
            </span>
            <h2 className="mt-2 text-3xl md:text-5xl font-display">
              {t("heading")}
            </h2>
          </div>
          <Link
            href="/register"
            className="text-sm underline-offset-4 hover:underline"
          >
            {t("seeFull")}
          </Link>
        </div>

        {titles.length === 0 ? (
          <div className="mt-10 rounded-11 border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {titles.map((title, i) => {
              const total = title.episodes.reduce((s, e) => s + e.durationSec, 0);
              return (
                <article
                  key={title.id}
                  className="group relative aspect-video overflow-hidden rounded-11 border border-border/60 text-surface-dark-foreground"
                >
                  {title.heroImageUrl ? (
                    <Image
                      src={title.heroImageUrl}
                      alt={title.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{ background: gradients[i % gradients.length] }}
                    />
                  )}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/15"
                  />
                  <div className="relative flex h-full flex-col justify-between p-6">
                    <div>
                      <p className="font-accent text-sm opacity-90">
                        {title.type === "SERIES" ? t("series") : t("film")} ·{" "}
                        {categoryTitle(title.category, locale)}
                      </p>
                      <h3 className="mt-2 font-display text-2xl leading-tight line-clamp-2">
                        {title.title}
                      </h3>
                      <p className="mt-2 text-sm opacity-85 line-clamp-2">
                        {title.synopsis}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs opacity-85">
                      <span>
                        {title.type === "SERIES"
                          ? t("episodesShort", { count: title.episodes.length })
                          : t("film")}
                      </span>
                      <span>{formatDuration(total)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
