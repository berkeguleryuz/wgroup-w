import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, getEffectiveAccess } from "@/lib/access";
import { createVideoSignedUrl } from "@/lib/supabase-storage";
import { Curriculum } from "@/components/app/Curriculum";
import { PlayerClient } from "./PlayerClient";

async function resolveVideoUrl(
  videoPath: string,
): Promise<{ url: string | null; error: string | null }> {
  if (/^https?:\/\//i.test(videoPath)) {
    return { url: videoPath, error: null };
  }
  try {
    const url = await createVideoSignedUrl(videoPath, 60 * 60);
    return { url, error: null };
  } catch (e) {
    return { url: null, error: (e as Error).message };
  }
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string; episode: string }>;
}) {
  const { locale, slug, episode: episodeId } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  const user = session.user as typeof session.user & { role?: string | null };

  const [t, access, ep] = await Promise.all([
    getTranslations("player"),
    getEffectiveAccess(user.id, user.role),
    prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        title: {
          include: {
            episodes: {
              orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
            },
          },
        },
      },
    }),
  ]);
  if (!ep || ep.title.slug !== slug) notFound();

  const [progress, allProgress, video] = await Promise.all([
    prisma.progress.findUnique({
      where: { userId_episodeId: { userId: user.id, episodeId: ep.id } },
    }),
    prisma.progress.findMany({
      where: { userId: user.id, episode: { titleId: ep.titleId } },
      select: { episodeId: true, completedAt: true },
    }),
    resolveVideoUrl(ep.videoPath),
  ]);

  const completedSet = new Set(
    allProgress.filter((p) => p.completedAt).map((p) => p.episodeId),
  );
  const lessons = ep.title.episodes.map((e) => ({
    id: e.id,
    episodeNumber: e.episodeNumber,
    name: e.name,
    durationSec: e.durationSec,
    previewSec: e.previewSec,
    completed: completedSet.has(e.id),
  }));

  const currentIndex = ep.title.episodes.findIndex((e) => e.id === ep.id);
  const prev = currentIndex > 0 ? ep.title.episodes[currentIndex - 1] : null;
  const next =
    currentIndex < ep.title.episodes.length - 1
      ? ep.title.episodes[currentIndex + 1]
      : null;

  const capSeconds = access.hasAccess ? null : ep.previewSec || 60;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
        <Link
          href={`/app/watch/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← {ep.title.title}
        </Link>

        {video.url ? (
          <PlayerClient
            episodeId={ep.id}
            src={video.url}
            capSeconds={capSeconds}
            startAt={progress?.positionSec ?? 0}
            hasAccess={access.hasAccess}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-11 border border-dashed border-border bg-muted/40 text-center text-sm text-muted-foreground">
            {t("videoUnavailable")} {video.error ? `(${video.error})` : null}
          </div>
        )}

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {currentIndex + 1} / {ep.title.episodes.length}
          </p>
          <h1 className="mt-2 font-display text-2xl md:text-3xl">{ep.name}</h1>
          {ep.synopsis ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {ep.synopsis}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-5">
          {prev ? (
            <Link
              href={`/app/watch/${slug}/${prev.id}`}
              className="inline-flex items-center gap-2 rounded-11 border border-border bg-background px-4 py-2.5 text-sm transition-colors hover:bg-muted"
            >
              ← {t("prevLesson")}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/app/watch/${slug}/${next.id}`}
              className="inline-flex items-center gap-2 rounded-11 bg-surface-dark px-5 py-2.5 text-sm font-semibold text-surface-dark-foreground transition-colors hover:bg-surface-dark/90"
            >
              {t("nextLesson")} →
            </Link>
          ) : (
            <Link
              href={`/app/watch/${slug}`}
              className="inline-flex items-center gap-2 rounded-11 border border-border bg-background px-4 py-2.5 text-sm transition-colors hover:bg-muted"
            >
              {t("backToTitle")}
            </Link>
          )}
        </div>
      </div>

      <Curriculum
        slug={slug}
        titleName={ep.title.title}
        lessons={lessons}
        currentId={ep.id}
        hasAccess={access.hasAccess}
      />
    </div>
  );
}
