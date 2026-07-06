import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { categoryTitle } from "@/lib/i18n/category-title";
import { requireSession, getEffectiveAccess } from "@/lib/access";
import {
  getViewerAudience,
  audienceWhere,
  canViewTitle,
} from "@/lib/content-visibility";
import { prisma } from "@/lib/prisma";
import { episodePath } from "@/lib/episode-path";
import { Section } from "@prisma/client";
import { AppHero } from "@/components/app/AppHero";
import { Carousel } from "@/components/app/Carousel";
import { TitleCard } from "@/components/app/TitleCard";
import { ContinueWatchingCard } from "@/components/app/ContinueWatchingCard";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/utils";

const titleInclude = {
  category: true,
  episodes: { select: { durationSec: true } },
  orgAudience: { select: { organizationId: true } },
  departmentAudience: { select: { departmentId: true } },
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
  const viewer = await getViewerAudience(user.id);
  const audience = audienceWhere(user.role, viewer);

  const [
    t,
    tNav,
    tLib,
    access,
    featured,
    continueRaw,
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
      where: { published: true, AND: [audience] },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { category: true },
    }),
    prisma.progress.findMany({
      where: {
        userId: user.id,
        completedAt: null,
        // Never resurface titles the viewer can no longer see (unpublished or
        // company-only they've left).
        episode: { title: { published: true, AND: [audience] } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        episode: {
          include: {
            title: { include: titleInclude },
          },
        },
      },
    }),
    prisma.title.findMany({
      where: { published: true, AND: [audience] },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: titleInclude,
    }),
    prisma.title.findMany({
      where: {
        published: true,
        category: { section: Section.SERIES },
        AND: [audience],
      },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: titleInclude,
    }),
    prisma.title.findMany({
      where: {
        published: true,
        category: { section: Section.MOVIE },
        AND: [audience],
      },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: titleInclude,
    }),
    prisma.title.findMany({
      where: {
        published: true,
        category: { section: Section.TALENT },
        AND: [audience],
      },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: titleInclude,
    }),
  ]);

  // One card per series: keep only the most recently watched in-progress
  // episode for each title (rows are already ordered by updatedAt desc).
  const seenTitles = new Set<string>();
  const continueWatching = continueRaw
    // Defense-in-depth on top of the query filter above.
    .filter((p) => canViewTitle(p.episode.title, user.role, viewer))
    .filter((p) => {
      const titleId = p.episode.title.id;
      if (seenTitles.has(titleId)) return false;
      seenTitles.add(titleId);
      return true;
    })
    .slice(0, 8);

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
                categoryTitle: categoryTitle(featured.category, locale),
              }
            : null
        }
        playLabel={t("play")}
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
            {continueWatching.map((p, i) => {
              const dur = p.episode.durationSec;
              const remaining = dur > 0 ? Math.max(0, dur - p.positionSec) : 0;
              const percent = dur > 0 ? (p.positionSec / dur) * 100 : 0;
              return (
                <ContinueWatchingCard
                  key={p.episodeId}
                  title={p.episode.title}
                  titleId={p.episode.title.id}
                  href={episodePath(p.episode.title.slug, p.episode)}
                  index={i}
                  percent={percent}
                  caption={
                    dur > 0
                      ? t("timeLeft", {
                          name: p.episode.name,
                          time: formatDuration(remaining),
                        })
                      : p.episode.name
                  }
                  removeLabel={t("removeFromList")}
                />
              );
            })}
          </Carousel>
        ) : null}

        {newReleases.length > 0 ? (
          <Carousel title={t("newReleases")} subtitle={t("newReleasesSub")}>
            {newReleases.map((item, i) => (
              <div key={item.id} className="w-64 sm:w-72 xl:w-80 shrink-0">
                <TitleCard title={item} index={i} />
              </div>
            ))}
          </Carousel>
        ) : null}

        {series.length > 0 ? (
          <Carousel title={tNav("series")}>
            {series.map((item, i) => (
              <div key={item.id} className="w-64 sm:w-72 xl:w-80 shrink-0">
                <TitleCard title={item} index={i} />
              </div>
            ))}
          </Carousel>
        ) : null}

        {movies.length > 0 ? (
          <Carousel title={tNav("films")}>
            {movies.map((item, i) => (
              <div key={item.id} className="w-64 sm:w-72 xl:w-80 shrink-0">
                <TitleCard title={item} index={i} />
              </div>
            ))}
          </Carousel>
        ) : null}

        {talent.length > 0 ? (
          <Carousel title={tNav("talentManagement")}>
            {talent.map((item, i) => (
              <div key={item.id} className="w-64 sm:w-72 xl:w-80 shrink-0">
                <TitleCard title={item} index={i} />
              </div>
            ))}
          </Carousel>
        ) : null}
      </div>
    </div>
  );
}
