import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, getEffectiveAccess } from "@/lib/access";
import { getMembershipOrgIds, canViewTitle } from "@/lib/content-visibility";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/utils";

export default async function TitleDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  const user = session.user as typeof session.user & { role?: string | null };

  const [t, tFl, access, title] = await Promise.all([
    getTranslations("titleDetail"),
    getTranslations("featuredLibrary"),
    getEffectiveAccess(user.id, user.role),
    prisma.title.findUnique({
      where: { slug },
      include: {
        category: true,
        episodes: { orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }] },
        credits: { include: { instructor: true } },
        orgAudience: { select: { organizationId: true } },
      },
    }),
  ]);

  if (!title || !title.published) notFound();

  const orgIds = await getMembershipOrgIds(user.id);
  if (!canViewTitle(title, user.role, orgIds)) notFound();

  const completedSet = new Set(
    (
      await prisma.progress.findMany({
        where: { userId: user.id, episode: { titleId: title.id }, completedAt: { not: null } },
        select: { episodeId: true },
      })
    ).map((p) => p.episodeId),
  );

  const total = title.episodes.reduce((s, e) => s + e.durationSec, 0);
  const firstEpisode = title.episodes[0];

  return (
    <div className="space-y-10">
      <section className="relative -mx-6 -mt-[104px] overflow-hidden md:-mx-10 xl:-mx-16">
        <div className="relative min-h-[60vh]">
          {title.heroImageUrl ? (
            <img
              src={title.heroImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #100D08 0%, #3a2e1f 100%)",
              }}
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-surface-dark via-surface-dark/55 to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent"
          />

          <div className="relative mx-auto flex min-h-[60vh] max-w-[1800px] items-end px-6 pb-16 pt-32 text-surface-dark-foreground md:px-10 xl:px-16">
            <div className="max-w-2xl">
              <span className="font-accent text-lg text-primary md:text-xl">
                {(title.type === "SERIES" ? tFl("series") : tFl("film")) +
                  " · " +
                  title.category.title}
              </span>
              <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-[-0.02em] md:text-6xl">
                {title.title}
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed opacity-85 md:text-base">
                {title.synopsis}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm opacity-80">
                <span>
                  {title.type === "SERIES"
                    ? t("episodeCount", { count: title.episodes.length })
                    : t("film")}
                </span>
                <span>{formatDuration(total)}</span>
                {title.credits.length > 0 ? (
                  <span>
                    {t("presentedBy", {
                      names: title.credits
                        .map((c) => c.instructor.name)
                        .join(", "),
                    })}
                  </span>
                ) : null}
              </div>
              {firstEpisode ? (
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link href={`/app/watch/${title.slug}/${firstEpisode.id}`}>
                    <Button size="lg" variant="primary">
                      {access.hasAccess ? t("startWatching") : t("startPreview")}
                    </Button>
                  </Link>
                  {!access.hasAccess ? (
                    <Link
                      href="/app/account/subscription"
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      {t("subscribeForFull")}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl md:text-3xl">{t("episodes")}</h2>
        <div className="divide-y divide-border/70 rounded-11 border border-border/60 bg-background">
          {title.episodes.map((ep) => (
            <Link
              key={ep.id}
              href={`/app/watch/${title.slug}/${ep.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
                    completedSet.has(ep.id)
                      ? "bg-primary text-primary-foreground"
                      : "border border-border font-display text-muted-foreground"
                  }`}
                >
                  {completedSet.has(ep.id) ? "✓" : ep.episodeNumber}
                </span>
                <div>
                  <p className="font-semibold">{ep.name}</p>
                  {ep.synopsis ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {ep.synopsis}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatDuration(ep.durationSec)}</span>
                {!access.hasAccess && ep.previewSec > 0 ? (
                  <span className="rounded-11 bg-primary/60 px-2 py-1 text-foreground">
                    {t("previewBadge")}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
