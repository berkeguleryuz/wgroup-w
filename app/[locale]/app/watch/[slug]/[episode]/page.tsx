import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import {
  episodePath,
  episodeSegment,
  parseEpisodeSegment,
} from "@/lib/episode-path";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, getEffectiveAccess } from "@/lib/access";
import { getViewerAudience, canViewTitle } from "@/lib/content-visibility";
import { resolveVideoUrl } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Curriculum } from "@/components/app/Curriculum";
import { PlayerClient } from "./PlayerClient";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string; episode: string }>;
}) {
  const { locale, slug, episode: episodeParam } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  const user = session.user as typeof session.user & { role?: string | null };

  // Pretty URLs (/s1-b2) resolve by season+episode number; legacy id URLs
  // still resolve, then get redirected to the pretty form below.
  const numbers = parseEpisodeSegment(episodeParam);
  const episodeInclude = {
    subtitles: { orderBy: { label: "asc" as const } },
    title: {
      include: {
        episodes: {
          orderBy: [
            { seasonNumber: "asc" as const },
            { episodeNumber: "asc" as const },
          ],
        },
        orgAudience: { select: { organizationId: true } },
        hiddenBy: { select: { organizationId: true } },
        departmentAudience: { select: { departmentId: true } },
      },
    },
  };

  const [t, access, ep] = await Promise.all([
    getTranslations("player"),
    getEffectiveAccess(user.id, user.role),
    numbers
      ? prisma.episode.findFirst({
          where: { ...numbers, title: { slug } },
          include: episodeInclude,
        })
      : prisma.episode.findUnique({
          where: { id: episodeParam },
          include: episodeInclude,
        }),
  ]);
  if (!ep || ep.title.slug !== slug) notFound();

  // Legacy id URL → canonical pretty URL (keeps old links working without
  // exposing the database id in the address bar).
  if (!numbers) redirect(localizedPath(locale, episodePath(slug, ep)));

  const isStaff = user.role === "admin" || user.role === "platform_editor";
  // Draft / scheduled titles are watchable only by staff (mirrors the detail page).
  if (!ep.title.published && !isStaff) notFound();

  const viewer = await getViewerAudience(user.id);
  if (!canViewTitle(ep.title, user.role, viewer)) notFound();

  const [progress, allProgress, videoUrl] = await Promise.all([
    prisma.progress.findUnique({
      where: { userId_episodeId: { userId: user.id, episodeId: ep.id } },
    }),
    prisma.progress.findMany({
      where: { userId: user.id, episode: { titleId: ep.titleId } },
      select: { episodeId: true, completedAt: true, positionSec: true },
    }),
    resolveVideoUrl(ep.videoPath),
  ]);

  // Seed TanStack Query so curriculum + player share one consistent source.
  const initialProgress: Record<
    string,
    { completed: boolean; positionSec: number }
  > = {};
  for (const p of allProgress) {
    initialProgress[p.episodeId] = {
      completed: !!p.completedAt,
      positionSec: p.positionSec,
    };
  }

  // Subtitle tracks must be same-origin (cross-origin <track> needs CORS +
  // crossOrigin on the video, which would break the sample MP4s). Local
  // `/...` paths are served directly; storage-backed ones go through a proxy.
  const subtitles = ep.subtitles.map((s) => ({
    lang: s.lang,
    label: s.label,
    src: s.vttPath.startsWith("/") ? s.vttPath : `/api/subtitles/${s.id}`,
  }));

  const lessons = ep.title.episodes.map((e) => ({
    id: e.id,
    seg: episodeSegment(e),
    episodeNumber: e.episodeNumber,
    name: e.name,
    durationSec: e.durationSec,
    previewSec: e.previewSec,
  }));

  const currentIndex = ep.title.episodes.findIndex((e) => e.id === ep.id);
  const prev = currentIndex > 0 ? ep.title.episodes[currentIndex - 1] : null;
  const next =
    currentIndex < ep.title.episodes.length - 1
      ? ep.title.episodes[currentIndex + 1]
      : null;

  const capSeconds = access.hasAccess ? null : ep.previewSec || 60;

  // Entitlement boundary: subscribers/staff stream the real (signed) URL;
  // non-subscribers only ever get the byte-capped preview proxy — the full
  // media URL is never sent to a client without access. HLS/local previews
  // aren't proxied, so those fall through to the paywall.
  const isHlsOrLocal =
    !videoUrl || videoUrl.startsWith("/") || /\.m3u8(\?|$)/i.test(videoUrl);
  const playbackSrc = access.hasAccess
    ? videoUrl
    : ep.previewSec > 0 && !isHlsOrLocal
      ? `/api/preview/${ep.id}`
      : null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
        <Link
          href={`/app/watch/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← {ep.title.title}
        </Link>

        {playbackSrc ? (
          <PlayerClient
            titleId={ep.titleId}
            slug={slug}
            episodeId={ep.id}
            src={playbackSrc}
            poster={ep.title.heroImageUrl}
            subtitles={subtitles}
            capSeconds={capSeconds}
            startAt={access.hasAccess ? (progress?.positionSec ?? 0) : 0}
            hasAccess={access.hasAccess}
            nextHref={next ? episodePath(slug, next) : null}
            nextName={next?.name ?? null}
            initialProgress={initialProgress}
          />
        ) : !access.hasAccess ? (
          <div className="relative flex aspect-video flex-col items-center justify-center gap-4 rounded-11 border border-border/60 bg-surface-dark px-6 text-center text-surface-dark-foreground">
            <div>
              <h3 className="font-display text-2xl md:text-3xl">
                {t("previewEndedTitle")}
              </h3>
              <p className="mt-2 text-sm opacity-85">{t("subscribeToWatch")}</p>
            </div>
            <Link href="/app/account/subscription">
              <Button variant="primary" size="lg">
                {t("subscribe")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-11 border border-dashed border-border bg-muted/40 text-center text-sm text-muted-foreground">
            {t("videoUnavailable")}
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
              href={episodePath(slug, prev)}
              className="inline-flex items-center gap-2 rounded-11 border border-border bg-background px-4 py-2.5 text-sm transition-colors hover:bg-muted"
            >
              ← {t("prevLesson")}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={episodePath(slug, next)}
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
        titleId={ep.titleId}
        slug={slug}
        titleName={ep.title.title}
        lessons={lessons}
        currentId={ep.id}
        hasAccess={access.hasAccess}
        initialProgress={initialProgress}
      />
    </div>
  );
}
