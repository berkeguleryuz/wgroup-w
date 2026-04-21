import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, getEffectiveAccess } from "@/lib/access";
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
      },
    }),
  ]);

  if (!title || !title.published) notFound();

  const total = title.episodes.reduce((s, e) => s + e.durationSec, 0);
  const firstEpisode = title.episodes[0];

  return (
    <div className="space-y-10">
      <section
        className="rounded-11 p-10 md:p-16 border border-border/60"
        style={{
          background: "linear-gradient(135deg, #100D08 0%, #3a2e1f 100%)",
          color: "var(--surface-dark-foreground)",
        }}
      >
        <span className="font-accent text-lg opacity-80">
          {title.type === "SERIES" ? tFl("series") : tFl("film")} ·{" "}
          {title.category.title}
        </span>
        <h1 className="mt-3 text-4xl md:text-6xl lg:text-7xl">{title.title}</h1>
        <p className="mt-6 max-w-2xl opacity-85">{title.synopsis}</p>
        <div className="mt-6 flex items-center gap-6 text-sm opacity-80">
          <span>
            {title.type === "SERIES"
              ? t("episodeCount", { count: title.episodes.length })
              : t("film")}
          </span>
          <span>{formatDuration(total)}</span>
          {title.credits.length > 0 ? (
            <span>
              {t("presentedBy", {
                names: title.credits.map((c) => c.instructor.name).join(", "),
              })}
            </span>
          ) : null}
        </div>
        {firstEpisode ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
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
                <span className="font-display text-2xl text-muted-foreground w-10 text-right">
                  {ep.episodeNumber}
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
