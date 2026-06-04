import { getSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { resolveVideoUrl } from "@/lib/storage";

// Same-origin proxy for storage-backed (R2 / Supabase) WebVTT files, so the
// player's <track> elements never hit a cross-origin / CORS wall. Local
// `/subtitles/...` paths are served directly by Next and never reach here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("unauthorized", { status: 401 });

  const { id } = await params;
  const sub = await prisma.subtitle.findUnique({ where: { id } });
  if (!sub) return new Response("not found", { status: 404 });

  const url = await resolveVideoUrl(sub.vttPath);
  if (!url || url.startsWith("/")) {
    return new Response("unavailable", { status: 404 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) return new Response("upstream error", { status: 502 });

  const body = await upstream.text();
  return new Response(body, {
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
