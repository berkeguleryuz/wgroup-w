"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";

type Props = {
  episodeId: string;
  src: string;
  capSeconds: number | null;
  startAt: number;
  hasAccess: boolean;
};

export function PlayerClient({ episodeId, src, capSeconds, startAt, hasAccess }: Props) {
  const t = useTranslations("player");
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportRef = useRef(0);
  const [previewEnded, setPreviewEnded] = useState(false);

  const report = useCallback(
    async (position: number, completed = false) => {
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episodeId, position, completed }),
          keepalive: true,
        });
      } catch {}
    },
    [episodeId],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (startAt > 0 && (capSeconds === null || startAt < capSeconds)) {
      video.currentTime = startAt;
    }

    const onTimeUpdate = () => {
      if (capSeconds !== null && video.currentTime >= capSeconds) {
        video.pause();
        setPreviewEnded(true);
        return;
      }
      const now = Date.now();
      if (now - lastReportRef.current > 10_000) {
        lastReportRef.current = now;
        void report(Math.floor(video.currentTime));
      }
    };

    const onEnded = () => {
      void report(Math.floor(video.currentTime), true);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    const flush = () => {
      if (video.currentTime > 0) {
        void report(Math.floor(video.currentTime));
      }
    };
    window.addEventListener("beforeunload", flush);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      window.removeEventListener("beforeunload", flush);
    };
  }, [capSeconds, report, startAt]);

  return (
    <div className="relative overflow-hidden rounded-11 border border-border/60 bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        src={src}
        className="aspect-video w-full"
      />
      {previewEnded && !hasAccess ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center">
          <div className="max-w-md text-surface-dark-foreground">
            <h3 className="font-display text-2xl md:text-3xl">
              {t("previewEndedTitle")}
            </h3>
            <p className="mt-2 text-sm opacity-85">{t("previewEndedBody")}</p>
            <Link href="/app/account/subscription" className="mt-5 inline-block">
              <Button variant="primary" size="lg">
                {t("subscribe")}
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
