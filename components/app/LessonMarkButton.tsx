"use client";

import { useTranslations } from "next-intl";

import { useMarkEpisode } from "@/lib/hooks/use-progress";

type Props = {
  titleId: string;
  episodeId: string;
  completed: boolean;
  episodeNumber: number;
  active?: boolean;
};

export function LessonMarkButton({
  titleId,
  episodeId,
  completed,
  episodeNumber,
  active = false,
}: Props) {
  const t = useTranslations("player");
  const mark = useMarkEpisode(titleId);

  const toggle = () => {
    if (mark.isPending) return;
    mark.mutate({ episodeId, completed: !completed });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={mark.isPending}
      aria-pressed={completed}
      title={completed ? t("markUnwatched") : t("markCompleted")}
      aria-label={completed ? t("markUnwatched") : t("markCompleted")}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs transition-colors disabled:opacity-60 ${
        completed
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : active
            ? "border border-foreground text-foreground hover:bg-foreground hover:text-background"
            : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      }`}
    >
      {completed ? <CheckIcon /> : episodeNumber}
    </button>
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
