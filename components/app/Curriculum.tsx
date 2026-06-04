"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { formatDuration } from "@/lib/utils";
import { LessonMarkButton } from "@/components/app/LessonMarkButton";
import { useTitleProgress, type ProgressMap } from "@/lib/hooks/use-progress";

type Lesson = {
  id: string;
  episodeNumber: number;
  name: string;
  durationSec: number;
  previewSec: number;
};

export function Curriculum({
  titleId,
  slug,
  titleName,
  lessons,
  currentId,
  hasAccess,
  initialProgress,
}: {
  titleId: string;
  slug: string;
  titleName: string;
  lessons: Lesson[];
  currentId: string;
  hasAccess: boolean;
  initialProgress: ProgressMap;
}) {
  const t = useTranslations("player");
  const { data: progress } = useTitleProgress(titleId, initialProgress);

  const isDone = (id: string) => progress?.[id]?.completed ?? false;
  const doneCount = lessons.filter((l) => isDone(l.id)).length;

  return (
    <aside className="rounded-11 border border-border/60 bg-background lg:w-[360px] lg:shrink-0">
      <div className="border-b border-border/60 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {t("curriculum")}
        </p>
        <h2 className="mt-2 font-display text-xl leading-snug">{titleName}</h2>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{
                width: `${lessons.length ? (doneCount / lessons.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {t("lessonProgress", { done: doneCount, total: lessons.length })}
          </span>
        </div>
      </div>

      <ol className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto">
        {lessons.map((l) => {
          const active = l.id === currentId;
          return (
            <li key={l.id}>
              <div
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                  active ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <LessonMarkButton
                  titleId={titleId}
                  episodeId={l.id}
                  completed={isDone(l.id)}
                  episodeNumber={l.episodeNumber}
                  active={active}
                />
                <Link
                  href={`/app/watch/${slug}/${l.id}`}
                  className="flex min-w-0 flex-1 items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        active ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {l.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDuration(l.durationSec)}</span>
                      {!hasAccess && l.previewSec > 0 ? (
                        <span className="rounded-11 bg-primary/50 px-1.5 py-0.5 text-[10px] text-foreground">
                          {t("previewBadge")}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
