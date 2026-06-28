"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { VideoPlayer, type SubtitleTrack } from "@/components/video/VideoPlayer";
import {
  useMarkEpisode,
  useTitleProgress,
  type ProgressMap,
} from "@/lib/hooks/use-progress";

const AUTO_ADVANCE_SECONDS = 5;

type Props = {
  titleId: string;
  slug: string;
  episodeId: string;
  src: string;
  poster?: string | null;
  subtitles?: SubtitleTrack[];
  capSeconds: number | null;
  startAt: number;
  hasAccess: boolean;
  nextHref?: string | null;
  nextName?: string | null;
  initialProgress: ProgressMap;
};

export function PlayerClient({
  titleId,
  slug,
  episodeId,
  src,
  poster = null,
  subtitles = [],
  capSeconds,
  startAt,
  hasAccess,
  nextHref = null,
  nextName = null,
  initialProgress,
}: Props) {
  const t = useTranslations("player");
  const router = useRouter();
  const lastReportRef = useRef(0);
  const latestPosRef = useRef(startAt);
  const [previewEnded, setPreviewEnded] = useState(false);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const { data: progress } = useTitleProgress(titleId, initialProgress);
  const mark = useMarkEpisode(titleId);
  const completed = progress?.[episodeId]?.completed ?? false;

  const reportPosition = useCallback(
    (position: number) => {
      void fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId, position }),
        keepalive: true,
      }).catch(() => {});
    },
    [episodeId],
  );

  const handleTimeUpdate = useCallback(
    (sec: number) => {
      latestPosRef.current = sec;
      const now = Date.now();
      if (now - lastReportRef.current > 10_000) {
        lastReportRef.current = now;
        reportPosition(Math.floor(sec));
      }
    },
    [reportPosition],
  );

  const handleEnded = useCallback(() => {
    mark.mutate({
      episodeId,
      completed: true,
      position: Math.floor(latestPosRef.current),
    });
    setEnded(true);
    if (nextHref) setCountdown(AUTO_ADVANCE_SECONDS);
  }, [mark, episodeId, nextHref]);

  // Flush latest position on unload.
  useEffect(() => {
    const flush = () => {
      if (latestPosRef.current > 0) reportPosition(Math.floor(latestPosRef.current));
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [reportPosition]);

  // Auto-advance countdown.
  useEffect(() => {
    if (!ended || !nextHref || countdown === null) return;
    if (countdown <= 0) {
      router.push(nextHref);
      return;
    }
    const id = setTimeout(
      () => setCountdown((c) => (c === null ? c : c - 1)),
      1000,
    );
    return () => clearTimeout(id);
  }, [ended, countdown, nextHref, router]);

  const dismissOverlay = () => {
    setCountdown(null);
    setEnded(false);
  };

  const toggleCompleted = () => {
    if (mark.isPending) return;
    mark.mutate({ episodeId, completed: !completed });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-11 border border-border/60 bg-black">
        <VideoPlayer
          src={src}
          poster={poster ?? undefined}
          subtitles={subtitles}
          capSeconds={capSeconds}
          startAt={startAt}
          onTimeUpdate={handleTimeUpdate}
          onCapReached={() => setPreviewEnded(true)}
          onEnded={handleEnded}
        >
          {/* Non-subscriber preview paywall */}
          {previewEnded && !hasAccess ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 px-6 text-center">
              <div className="max-w-md text-surface-dark-foreground">
                <h3 className="font-display text-2xl md:text-3xl">
                  {t("previewEndedTitle")}
                </h3>
                <p className="mt-2 text-sm opacity-85">{t("previewEndedBody")}</p>
                <Link
                  href="/app/account/subscription"
                  className="mt-5 inline-block"
                >
                  <Button variant="primary" size="lg">
                    {t("subscribe")}
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}

          {/* Completed overlay */}
          {ended && hasAccess ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 px-6 text-center">
              <div className="max-w-md text-surface-dark-foreground">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon />
                </div>
                <h3 className="font-display text-2xl md:text-3xl">
                  {t("episodeCompleted")}
                </h3>

                {nextHref && countdown !== null ? (
                  <>
                    <p className="mt-2 text-sm opacity-85">
                      {t("nextUp")}:{" "}
                      <span className="font-semibold">{nextName}</span>
                    </p>
                    <p className="mt-1 text-sm opacity-70">
                      {t("autoAdvanceIn", { sec: countdown })}
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-3">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => router.push(nextHref)}
                      >
                        {t("playNext")}
                      </Button>
                      <button
                        type="button"
                        onClick={dismissOverlay}
                        className="rounded-11 border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-surface-dark-foreground backdrop-blur transition-colors hover:bg-white/20"
                      >
                        {t("cancelAuto")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm opacity-80">
                      {t("courseFinished")}
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-3">
                      <Link href={`/app/watch/${slug}`}>
                        <Button variant="primary" size="lg">
                          {t("backToTitle")}
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={dismissOverlay}
                        className="rounded-11 border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-surface-dark-foreground backdrop-blur transition-colors hover:bg-white/20"
                      >
                        {t("close")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </VideoPlayer>
      </div>

      {/* Manual completion control */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={toggleCompleted}
          disabled={mark.isPending}
          aria-pressed={completed}
          className={`inline-flex items-center gap-2 rounded-11 border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
            completed
              ? "border-primary bg-primary/15 text-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full ${
              completed
                ? "bg-primary text-primary-foreground"
                : "border border-border"
            }`}
          >
            {completed ? <CheckIcon /> : null}
          </span>
          {completed ? t("markUnwatched") : t("markCompleted")}
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10.5 L8.5 15 L16 6" />
    </svg>
  );
}
