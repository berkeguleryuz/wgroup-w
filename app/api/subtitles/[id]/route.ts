import { getSession } from "@/lib/access";
import { getMembershipOrgIds, canViewTitle } from "@/lib/content-visibility";
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
  const sub = await prisma.subtitle.findUnique({
    where: { id },
    include: {
      episode: {
        include: {
          title: {
            include: { orgAudience: { select: { organizationId: true } } },
          },
        },
      },
    },
  });
  if (!sub) return new Response("not found", { status: 404 });

  // Entitlement gate: never leak transcripts for unpublished or company-only
  // titles the viewer can't see. 404 (not 403) so we don't confirm the id.
  const title = sub.episode.title;
  const role = (session.user as { role?: string | null }).role;
  const isStaff = role === "admin" || role === "platform_editor";
  if (!isStaff) {
    if (!title.published) return new Response("not found", { status: 404 });
    const orgIds = await getMembershipOrgIds(session.user.id);
    if (!canViewTitle(title, role, orgIds)) {
      return new Response("not found", { status: 404 });
    }
  }

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
      "Cache-Control": "private, max-age=300",
    },
  });
}
