"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * While any episode on the page has a queued/processing transcode job,
 * re-fetch the server component tree every few seconds so the status badge
 * flips to "multi quality" on its own — no manual reload. Renders nothing;
 * unmounts (and stops polling) once nothing is pending.
 */
export function TranscodeRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
