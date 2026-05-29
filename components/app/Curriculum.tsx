import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { formatDuration } from "@/lib/utils";

type Lesson = {
  id: string;
  episodeNumber: number;
  name: string;
  durationSec: number;
  previewSec: number;
  completed: boolean;
};

export function Curriculum({
  slug,
  titleName,
  lessons,
  currentId,
  hasAccess,
}: {
  slug: string;
  titleName: string;
  lessons: Lesson[];
  currentId: string;
  hasAccess: boolean;
}) {
  const t = useTranslations("player");
  const doneCount = lessons.filter((l) => l.completed).length;

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
              className="h-full rounded-full bg-primary"
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
              <Link
                href={`/app/watch/${slug}/${l.id}`}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                  active ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                    l.completed
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "border border-foreground bg-foreground text-background"
                        : "border border-border text-muted-foreground"
                  }`}
                >
                  {l.completed ? <CheckIcon /> : l.episodeNumber}
                </span>
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
            </li>
          );
        })}
      </ol>
    </aside>
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
