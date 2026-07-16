"use client";

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

  return (
    <div className="w-64 sm:w-72 xl:w-80 shrink-0">
      <TitleCard
        title={title}
        index={index}
        href={href}
        progressPercent={percent}
        variant="expanded"
        onRemove={() => remove.mutate()}
        removeLabel={removeLabel}
      />

      <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
