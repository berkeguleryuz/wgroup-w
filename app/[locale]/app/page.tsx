import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { requireSession, getEffectiveAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Section } from "@prisma/client";
import { AppHero } from "@/components/app/AppHero";
import { Carousel } from "@/components/app/Carousel";
import { TitleCard } from "@/components/app/TitleCard";
import { Button } from "@/components/ui/Button";

const titleInclude = {
  category: true,
  episodes: { select: { durationSec: true } },
} as const;

export default async function AppHomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession();
  const user = session.user as typeof session.user & { role?: string | null };

  const [
    t,
    tNav,
    tLib,
    access,
    featured,
    continueWatching,
    newReleases,
    series,
    movies,
    talent,
  ] = await Promise.all([
    getTranslations("appHome"),
    getTranslations("nav"),
    getTranslations("featuredLibrary"),
    getEffectiveAccess(user.id, user.role),
    prisma.title.findFirst({
      where: { published: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { category: true },
    }),
    prisma.progress.findMany({
      where: { userId: user.id, completedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        episode: {
          include: {
            title: { include: titleInclude },
          },
        },
      },
    }),
    prisma.title.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: titleInclude,
    }),
    prisma.title.findMany({
      where: { published: true, category: { section: Section.SERIES } },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: titleInclude,
    }),
    prisma.title.findMany({
      where: { published: true, category: { section: Section.MOVIE } },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: titleInclude,
    }),
    prisma.title.findMany({
      where: { published: true, category: { section: Section.TALENT } },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: titleInclude,
    }),
  ]);

  return (
    <div>
      <AppHero
        title={
          featured
            ? {
                slug: featured.slug,
                title: featured.title,
                synopsis: featured.synopsis,
                type: featured.type,
                heroImageUrl: featured.heroImageUrl,
                trailerUrl: featured.trailerUrl,
                categoryTitle: featured.category.title,
              }
            : null
        }
        playLabel={t("play")}
        moreLabel={t("moreInfo")}
        seriesLabel={tLib("series")}
        filmLabel={tLib("film")}
        fallbackHeading={t("heroFallbackTitle")}
        fallbackBody={t("heroFallbackBody")}
      />

      <div className="relative z-10 -mt-28 space-y-12 md:-mt-32">
        {!access.hasAccess ? (
          <div className="rounded-11 border border-primary bg-primary/40 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">
                  {t("subscriptionWarningTitle")}
                </h2>
                <p className="mt-2 text-sm text-foreground/80">
                  {t("subscriptionWarningBody")}
                </p>
              </div>
              <Link href="/app/account/subscription">
                <Button variant="dark" size="lg">
                  {t("startSubscription")}
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        {continueWatching.length > 0 ? (
          <Carousel title={t("continueWatching")}>
            {continueWatching.map((p, i) => (
              <div key={p.episodeId} className="w-72 shrink-0">
                <TitleCard title={p.episode.title} variant="wide" index={i} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("minutesWatched", {
                    name: p.episode.name,
                    minutes: Math.round(p.positionSec / 60),
                  })}
                </p>
              </div>
            ))}
          </Carousel>
        ) : null}

        {newReleases.length > 0 ? (
          <Carousel title={t("newReleases")} subtitle={t("newReleasesSub")}>
            {newReleases.map((item, i) => (
              <div key={item.id} className="w-56 shrink-0">
                <TitleCard title={item} index={i} />
              </div>
            ))}
          </Carousel>
        ) : null}

        {series.length > 0 ? (
          <Carousel title={tNav("series")}>
            {series.map((item, i) => (
              <div key={item.id} className="w-56 shrink-0">
                <TitleCard title={item} index={i} />
              </div>
            ))}
          </Carousel>
        ) : null}

        {movies.length > 0 ? (
          <Carousel title={tNav("films")}>
            {movies.map((item, i) => (
              <div key={item.id} className="w-56 shrink-0">
                <TitleCard title={item} index={i} />
              </div>
            ))}
          </Carousel>
        ) : null}

        {talent.length > 0 ? (
          <Carousel title={tNav("talentManagement")}>
            {talent.map((item, i) => (
              <div key={item.id} className="w-56 shrink-0">
                <TitleCard title={item} index={i} />
              </div>
            ))}
          </Carousel>
        ) : null}
      </div>
    </div>
  );
}
