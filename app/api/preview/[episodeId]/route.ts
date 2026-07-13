import { getSession, getEffectiveAccess } from "@/lib/access";
import { getViewerAudience, canViewTitle } from "@/lib/content-visibility";
import { prisma } from "@/lib/prisma";
import { resolveVideoUrl } from "@/lib/storage";
import { configuredMediaOrigins } from "@/lib/security/media-url-policy";
import { safeMediaFetch } from "@/lib/security/safe-media-fetch";

// Server-side preview gate. Non-subscribers stream video ONLY through here, and
// only the first `previewSec`-worth of bytes is ever served — the full media
// URL is never handed to the client, so the subscription can't be bypassed from
// devtools. Subscribers/staff stream the real (signed) URL directly and never
// hit this route. (Progressive mp4/webm with a front-loaded moov atom previews
// cleanly; HLS preview is intentionally not offered — non-subscribers get the
// paywall instead.)
const ABS_MAX_PREVIEW_BYTES = 8 * 1024 * 1024; // fallback cap when duration unknown

async function upstreamTotalLength(
  url: string,
  allowedOrigins: readonly string[],
): Promise<number> {
  try {
    const head = await safeMediaFetch(url, { method: "HEAD", allowedOrigins });
    const len = Number(head.headers.get("content-length") || 0);
    if (len > 0) return len;
  } catch {
    /* fall through to ranged probe */
  }
  try {
    const probe = await safeMediaFetch(url, {
      headers: { Range: "bytes=0-0" },
      allowedOrigins,
    });
    const cr = probe.headers.get("content-range"); // bytes 0-0/12345
    const total = cr ? Number(cr.split("/")[1]) : 0;
    return Number.isFinite(total) ? total : 0;
  } catch {
    return 0;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("unauthorized", { status: 401 });

  const { episodeId } = await params;
  const ep = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: {
      videoPath: true,
      durationSec: true,
      previewSec: true,
      title: {
        select: {
          published: true,
          visibility: true,
          orgAudience: { select: { organizationId: true } },
          hiddenBy: { select: { organizationId: true } },
          departmentAudience: { select: { departmentId: true } },
        },
      },
    },
  });
  if (!ep) return new Response("not found", { status: 404 });

  const role = (session.user as { role?: string | null }).role;
  const isStaff = role === "admin" || role === "platform_editor";
  if (!isStaff) {
    if (!ep.title.published) return new Response("not found", { status: 404 });
    const viewer = await getViewerAudience(session.user.id);
    if (!canViewTitle(ep.title, role, viewer)) {
      return new Response("not found", { status: 404 });
    }
  }

  const access = await getEffectiveAccess(session.user.id, role);
  const url = await resolveVideoUrl(ep.videoPath);
  if (!url || url.startsWith("/")) {
    // Local/relative assets are served statically by Next, not proxied.
    return new Response("unavailable", { status: 404 });
  }

  const isHls = /\.m3u8(\?|$)/i.test(url) || /\.m3u8$/i.test(ep.videoPath);
  if (!access.hasAccess) {
    if (isHls || ep.previewSec <= 0) {
      return new Response("forbidden", { status: 403 });
    }
  }

  const allowedOrigins = configuredMediaOrigins();
  const total = await upstreamTotalLength(url, allowedOrigins);

  // Bytes a non-subscriber may read: proportional to previewSec, with slack for
  // container headers; subscribers/staff get the whole file.
  let budget = total || ABS_MAX_PREVIEW_BYTES;
  if (!access.hasAccess) {
    if (total > 0 && ep.durationSec > 0) {
      budget = Math.min(
        total,
        Math.ceil((total * ep.previewSec) / ep.durationSec) + 128 * 1024,
      );
    } else {
      budget = Math.min(total || ABS_MAX_PREVIEW_BYTES, ABS_MAX_PREVIEW_BYTES);
    }
  }

  // Parse the client Range, clamped to the budget. We advertise `budget` as the
  // virtual total so the player never requests past the preview window.
  let start = 0;
  let end = budget - 1;
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (m) {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), budget - 1) : budget - 1;
    }
  }
  if (start >= budget || start < 0) {
    return new Response("range not satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${budget}` },
    });
  }
  if (end < start) end = budget - 1;

  let upstream: Response;
  try {
    upstream = await safeMediaFetch(url, {
      headers: { Range: `bytes=${start}-${end}` },
      allowedOrigins,
      signal: request.signal,
    });
  } catch {
    return new Response("upstream error", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("upstream error", { status: 502 });
  }

  const limit = end - start + 1;
  // If upstream honored the Range (206) the body already starts at `start`;
  // if it ignored it (200, full body) we skip to `start` ourselves. Either way
  // the stream is hard-capped at `limit` bytes, so the full file can never leak
  // even when the origin ignores Range.
  const skip = upstream.status === 206 ? 0 : start;
  const body = cappedStream(upstream.body, skip, limit);

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "video/mp4");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Length", String(limit));
  headers.set("Content-Range", `bytes ${start}-${end}/${budget}`);
  return new Response(body, { status: 206, headers });
}

/** Skips `skip` leading bytes, then emits at most `limit` bytes and stops. */
function cappedStream(
  src: ReadableStream<Uint8Array>,
  skip: number,
  limit: number,
): ReadableStream<Uint8Array> {
  const reader = src.getReader();
  let skipped = 0;
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (sent >= limit) {
        controller.close();
        await reader.cancel().catch(() => {});
        return;
      }
      const { done, value } = await reader.read();
      if (done || !value) {
        controller.close();
        return;
      }
      let chunk: Uint8Array = value;
      if (skipped < skip) {
        const toSkip = Math.min(skip - skipped, chunk.length);
        skipped += toSkip;
        chunk = chunk.subarray(toSkip);
        if (chunk.length === 0) return;
      }
      const remaining = limit - sent;
      if (chunk.length > remaining) chunk = chunk.subarray(0, remaining);
      sent += chunk.length;
      controller.enqueue(chunk);
      if (sent >= limit) {
        controller.close();
        await reader.cancel().catch(() => {});
      }
    },
    cancel() {
      return reader.cancel();
    },
  });
}
