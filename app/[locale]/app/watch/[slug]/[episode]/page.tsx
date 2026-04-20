import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, getEffectiveAccess } from "@/lib/access";
import { createVideoSignedUrl } from "@/lib/supabase-storage";
import { PlayerClient } from "./PlayerClient";

export const dynamic = "force-dynamic";

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
        title: { include: { episodes: { orderBy: [{ episodeNumber: "asc" }] } } },
      },
    }),
  ]);
  if (!ep || ep.title.slug !== slug) notFound();

  const [progress, signedResult] = await Promise.all([
    prisma.progress.findUnique({
      where: { userId_episodeId: { userId: user.id, episodeId: ep.id } },
    }),
    createVideoSignedUrl(ep.videoPath, 60 * 60).then(
      (url) => ({ url, error: null as string | null }),
      (e: unknown) => ({ url: null, error: (e as Error).message }),
    ),
  ]);

  const signedUrl = signedResult.url;
  const error = signedResult.error;
  const capSeconds = access.hasAccess ? null : ep.previewSec || 60;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/app/watch/${slug}`}
          className="text-sm underline-offset-4 hover:underline"
        >
          ← {ep.title.title}
        </Link>
        <span className="text-sm text-muted-foreground">
          {ep.episodeNumber} · {ep.name}
        </span>
      </div>

      {signedUrl ? (
        <PlayerClient
          episodeId={ep.id}
          src={signedUrl}
          capSeconds={capSeconds}
          startAt={progress?.positionSec ?? 0}
          hasAccess={access.hasAccess}
        />
      ) : (
        <div className="rounded-11 border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          {t("videoUnavailable")} {error ? `(${error})` : null}
        </div>
      )}

      <section className="rounded-11 border border-border/60 bg-background p-5">
        <h2 className="font-display text-xl">{ep.name}</h2>
        {ep.synopsis ? (
          <p className="mt-2 text-sm text-muted-foreground">{ep.synopsis}</p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-lg">{t("otherEpisodes")}</h3>
        <div className="grid gap-2">
          {ep.title.episodes.map((other) => (
            <Link
              key={other.id}
              href={`/app/watch/${slug}/${other.id}`}
              className={`flex items-center justify-between rounded-11 border border-border/60 px-4 py-3 text-sm hover:bg-muted ${
                other.id === ep.id ? "bg-muted" : "bg-background"
              }`}
            >
              <span>
                {other.episodeNumber}. {other.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(other.durationSec / 60)} min
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
