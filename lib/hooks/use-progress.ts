"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type EpisodeProgress = { completed: boolean; positionSec: number };
export type ProgressMap = Record<string, EpisodeProgress>;

export const progressKey = (titleId: string) => ["progress", titleId] as const;
const keyFor = progressKey;

/**
 * Shared per-title progress, seeded with server data so the first client render
 * matches SSR. Every consumer (curriculum, player, mark buttons) reads the same
 * cache entry, so an optimistic update in one place updates all of them.
 */
export function useTitleProgress(titleId: string, initialData: ProgressMap) {
  return useQuery<ProgressMap>({
    queryKey: keyFor(titleId),
    queryFn: async () => {
      const res = await fetch(
        `/api/progress?titleId=${encodeURIComponent(titleId)}`,
      );
      if (!res.ok) throw new Error("progress fetch failed");
      return (await res.json()) as ProgressMap;
    },
    initialData,
  });
}

/** Mark an episode completed / unwatched with an optimistic cache update. */
export function useMarkEpisode(titleId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      episodeId: string;
      completed: boolean;
      position?: number;
    }) => {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
        keepalive: true,
      });
      if (!res.ok) throw new Error("progress update failed");
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: keyFor(titleId) });
      const prev = qc.getQueryData<ProgressMap>(keyFor(titleId));
      qc.setQueryData<ProgressMap>(keyFor(titleId), (old) => {
        const next = { ...(old ?? {}) };
        const cur = next[vars.episodeId] ?? { completed: false, positionSec: 0 };
        next[vars.episodeId] = {
          completed: vars.completed,
          positionSec: vars.position ?? cur.positionSec,
        };
        return next;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(keyFor(titleId), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keyFor(titleId) });
    },
  });
}
