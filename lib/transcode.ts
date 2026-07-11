import "server-only";

import { prisma } from "@/lib/prisma";

/** Raw editor uploads the background worker can turn into an HLS ladder. */
const RAW_VIDEO_RE = /^uploads\/[\w./-]+\.(mp4|webm|mov|m4v)$/i;

/**
 * Queue a background HLS transcode for an episode whose videoPath is a raw
 * storage key, and nudge the GitHub Actions worker awake. No-ops for HLS
 * masters, external URLs and local paths. Never throws — transcoding is an
 * enhancement; the raw MP4 stays playable either way.
 */
export async function enqueueTranscode(
  episodeId: string,
  videoPath: string,
): Promise<void> {
  if (!RAW_VIDEO_RE.test(videoPath)) return;
  try {
    await prisma.transcodeJob.upsert({
      where: { episodeId },
      create: { episodeId, sourceKey: videoPath },
      // Re-upload: point the job at the new source and start over.
      update: {
        sourceKey: videoPath,
        status: "QUEUED",
        attempts: 0,
        error: null,
        lockedAt: null,
      },
    });
    await dispatchWorker();
  } catch (e) {
    console.warn("[transcode] enqueue failed:", e);
  }
}

/**
 * Fire the `transcode` repository_dispatch event so the worker workflow runs
 * now instead of waiting for its cron safety net. Requires GITHUB_REPO
 * ("owner/name") and GITHUB_TRANSCODE_TOKEN or GITHUB_FINE_GRAIN_TOKEN
 * (fine-grained PAT, contents:rw) in the environment; silently skips when unset.
 */
export async function dispatchWorker(): Promise<void> {
  const repo = process.env.GITHUB_REPO;
  const token =
    process.env.GITHUB_TRANSCODE_TOKEN ?? process.env.GITHUB_FINE_GRAIN_TOKEN;
  if (!repo || !token) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_type: "transcode" }),
    });
    if (!res.ok) {
      console.warn(`[transcode] dispatch failed: ${res.status}`);
    }
  } catch (e) {
    console.warn("[transcode] dispatch failed:", e);
  }
}
