import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { categoryTitle } from "@/lib/i18n/category-title";
import StatCard from "@/components/dashboard/StatCard";

export default async function EditorDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, totalTitles, published, draft, totalEpisodes, recent] =
    await Promise.all([
      getTranslations("editor"),
      prisma.title.count(),
      prisma.title.count({ where: { published: true } }),
      prisma.title.count({ where: { published: false } }),
      prisma.episode.count(),
      prisma.title.findMany({
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { category: true, episodes: { select: { id: true } } },
      }),
    ]);

  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("dashboard")}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("statTotal")} value={totalTitles} icon="film" />
        <StatCard
          label={t("statPublished")}
          value={published}
          icon="clapper"
          tone="dark"
          floatDelay={0.5}
        />
        <StatCard
          label={t("statDraft")}
          value={draft}
          icon="pencil"
          floatDelay={1}
        />
        <StatCard
          label={t("statEpisodes")}
          value={totalEpisodes}
          icon="reel"
          floatDelay={1.5}
        />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl">{t("recentUpdates")}</h2>
          <Link
            href="/app/editor/titles"
            className="text-sm underline-offset-4 hover:underline"
          >
            {t("viewAll")}
          </Link>
        </div>
        <div className="divide-y divide-border/70 rounded-11 border border-border/60 bg-background">
          {recent.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {t("empty")}{" "}
              <Link
                href="/app/editor/titles/new"
                className="underline-offset-4 hover:underline text-foreground"
              >
                {t("createFirst")}
              </Link>
              .
            </div>
          ) : (
            recent.map((item) => (
              <Link
                key={item.id}
                href={`/app/editor/titles/${item.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryTitle(item.category, locale)} ·{" "}
                    {t("statEpisodes").toLowerCase()}: {item.episodes.length} ·{" "}
                    {item.published
                      ? t("statusPublished")
                      : t("statusDraft")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.updatedAt.toLocaleDateString(dateLocale)}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
