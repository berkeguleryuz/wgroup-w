import { getTranslations } from "next-intl/server";
import { cacheLife, cacheTag } from "next/cache";

import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/utils";

async function loadFeatured() {
  "use cache";
  cacheLife("minutes");
  cacheTag("featured-titles");

  try {
    const titles = await prisma.title.findMany({
      where: { published: true },
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
  "linear-gradient(135deg, #100D08 0%, #3a2e1f 100%)",
  "linear-gradient(135deg, #edddb9 0%, #d9c08a 100%)",
  "linear-gradient(135deg, #2b2016 0%, #5b4630 100%)",
  "linear-gradient(135deg, #5b534a 0%, #100D08 100%)",
  "linear-gradient(135deg, #100D08 0%, #5b4630 100%)",
  "linear-gradient(135deg, #edddb9 0%, #c9a86a 100%)",
];

export async function FeaturedLibrary() {
  const [titles, t] = await Promise.all([
    loadFeatured(),
    getTranslations("featuredLibrary"),
  ]);

  return (
    <section id="library" className="border-b border-border/60 bg-muted/40">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
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
              const isDark = i % 3 !== 1;
              return (
                <article
                  key={title.id}
                  className="group rounded-11 border border-border/60 overflow-hidden"
                  style={{
                    background: gradients[i % gradients.length],
                    color: isDark
                      ? "var(--surface-dark-foreground)"
                      : "var(--foreground)",
                  }}
                >
                  <div className="aspect-[4/5] p-6 flex flex-col justify-between">
                    <div>
                      <p className="font-accent text-sm opacity-80">
                        {title.type === "SERIES" ? t("series") : t("film")} ·{" "}
                        {title.category.title}
                      </p>
                      <h3 className="mt-3 font-display text-3xl leading-tight">
                        {title.title}
                      </h3>
                      <p className="mt-3 text-sm opacity-80 line-clamp-3">
                        {title.synopsis}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs opacity-80">
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
