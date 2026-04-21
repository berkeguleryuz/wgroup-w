import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { requireSession, getEffectiveAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Section } from "@prisma/client";
import { Carousel } from "@/components/app/Carousel";
import { TitleCard } from "@/components/app/TitleCard";
import { Button } from "@/components/ui/Button";

export default async function AppHomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession();
  const user = session.user as typeof session.user & { role?: string | null };

  const [t, tNav, access, continueWatching, newReleases, series, movies, talent] =
    await Promise.all([
      getTranslations("appHome"),
      getTranslations("nav"),
      getEffectiveAccess(user.id, user.role),
      prisma.progress.findMany({
        where: { userId: user.id, completedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: {
          episode: {
            include: {
              title: {
                include: {
                  category: true,
                  episodes: { select: { durationSec: true } },
                },
              },
            },
          },
        },
      }),
      prisma.title.findMany({
        where: { published: true },
        orderBy: { publishedAt: "desc" },
        take: 10,
        include: { category: true, episodes: { select: { durationSec: true } } },
      }),
      prisma.title.findMany({
        where: { published: true, category: { section: Section.SERIES } },
        orderBy: { publishedAt: "desc" },
        take: 10,
        include: { category: true, episodes: { select: { durationSec: true } } },
      }),
      prisma.title.findMany({
        where: { published: true, category: { section: Section.MOVIE } },
        orderBy: { publishedAt: "desc" },
        take: 10,
        include: { category: true, episodes: { select: { durationSec: true } } },
      }),
      prisma.title.findMany({
        where: { published: true, category: { section: Section.TALENT } },
        orderBy: { publishedAt: "desc" },
        take: 10,
        include: { category: true, episodes: { select: { durationSec: true } } },
      }),
    ]);

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <span className="font-accent text-lg text-muted-foreground">
          {t("greeting", { name: user.name || user.email.split("@")[0] })}
        </span>
        <h1 className="text-4xl md:text-6xl">{t("heading")}</h1>
      </header>

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

      <Carousel title={t("newReleases")} subtitle={t("newReleasesSub")}>
        {newReleases.map((item, i) => (
          <div key={item.id} className="w-56 shrink-0">
            <TitleCard title={item} index={i} />
          </div>
        ))}
      </Carousel>

      <Carousel title={tNav("series")}>
        {series.map((item, i) => (
          <div key={item.id} className="w-56 shrink-0">
            <TitleCard title={item} index={i} />
          </div>
        ))}
      </Carousel>

      <Carousel title={tNav("films")}>
        {movies.map((item, i) => (
          <div key={item.id} className="w-56 shrink-0">
            <TitleCard title={item} index={i} />
          </div>
        ))}
      </Carousel>

      <Carousel title={tNav("talentManagement")}>
        {talent.map((item, i) => (
          <div key={item.id} className="w-56 shrink-0">
            <TitleCard title={item} index={i} />
          </div>
        ))}
      </Carousel>
    </div>
  );
}
