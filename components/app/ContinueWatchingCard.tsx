"use client";

import type { MouseEvent } from "react";
import type { Title, Category, Episode } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { progressKey } from "@/lib/hooks/use-progress";
import { TitleCard } from "./TitleCard";

type Props = {
  title: Title & { category: Category; episodes: Pick<Episode, "durationSec">[] };
  titleId: string;
  href: string;
  index: number;
  caption: string;
  /** Watched fraction 0–100. */
  percent: number;
  removeLabel: string;
};

export function ContinueWatchingCard({
  title,
  titleId,
  href,
  index,
  caption,
  percent,
  removeLabel,
}: Props) {
  const qc = useQueryClient();

  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/progress", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleId }),
      });
      if (!res.ok) throw new Error("remove failed");
    },
    // Drop any cached per-title progress so the watch page re-syncs.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: progressKey(titleId) });
    },
  });

  if (remove.isSuccess || remove.isPending) return null; // optimistic removal

  const handleRemove = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    remove.mutate();
  };

  return (
    <div className="w-72 shrink-0">
      <div className="relative">
        <TitleCard
          title={title}
          variant="wide"
          index={index}
          href={href}
          progressPercent={percent}
        />

        <button
          type="button"
          onClick={handleRemove}
          aria-label={removeLabel}
          title={removeLabel}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-dark/55 text-surface-dark-foreground backdrop-blur transition-colors hover:bg-surface-dark/90"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
