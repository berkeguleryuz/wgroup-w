import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/access";
import { getMembershipOrgIds, canViewTitle } from "@/lib/content-visibility";
import { prisma } from "@/lib/prisma";

// Per-title progress map for the watch page (consumed by TanStack Query).
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({}, { status: 401 });

  const titleId = new URL(request.url).searchParams.get("titleId");
  if (!titleId) {
    return NextResponse.json({ error: "titleId required" }, { status: 400 });
  }

  const rows = await prisma.progress.findMany({
    where: { userId: session.user.id, episode: { titleId } },
    select: { episodeId: true, positionSec: true, completedAt: true },
  });

  const map: Record<string, { completed: boolean; positionSec: number }> = {};
  for (const r of rows) {
    map[r.episodeId] = { completed: !!r.completedAt, positionSec: r.positionSec };
  }
  return NextResponse.json(map);
}

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  // Optional: periodic "mark completed/unwatched" calls carry no position.
  position: z.number().int().nonnegative().optional(),
  // Tri-state: true -> mark completed now, false -> clear (mark unwatched),
  // undefined -> leave completion untouched (used by periodic position reports).
  completed: z.boolean().optional(),
});

export async function POST(request: Request) {
  const sessionPromise = getSession();
  const jsonPromise = request.json().catch(() => null);

  const session = await sessionPromise;
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = payloadSchema.safeParse(await jsonPromise);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { episodeId, position, completed } = parsed.data;
  const userId = session.user.id;

  // Entitlement gate: never seed progress for unpublished or company-only
  // content the caller can't see.
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: {
      title: {
        select: {
          published: true,
          visibility: true,
          orgAudience: { select: { organizationId: true } },
        },
      },
    },
  });
  if (!episode) return NextResponse.json({ ok: false }, { status: 404 });
  const role = (session.user as { role?: string | null }).role;
  const isStaff = role === "admin" || role === "platform_editor";
  if (!isStaff) {
    if (!episode.title.published) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    const orgIds = await getMembershipOrgIds(userId);
    if (!canViewTitle(episode.title, role, orgIds)) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
  }

  // undefined => leave completedAt as-is; null => unwatched; Date => completed.
  const completedAt =
    completed === true ? new Date() : completed === false ? null : undefined;

  await prisma.progress.upsert({
    where: { userId_episodeId: { userId, episodeId } },
    create: {
      userId,
      episodeId,
      positionSec: position ?? 0,
      completedAt: completed === true ? new Date() : null,
    },
    update: {
      ...(position !== undefined ? { positionSec: position } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

const removeSchema = z.object({ titleId: z.string().min(1) });

// Remove a title from "continue watching": drop the user's in-progress rows
// for that title. Completed episodes (completedAt set) are kept as history.
export async function DELETE(request: Request) {
  const sessionPromise = getSession();
  const jsonPromise = request.json().catch(() => null);

  const session = await sessionPromise;
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = removeSchema.safeParse(await jsonPromise);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.progress.deleteMany({
    where: {
      userId: session.user.id,
      completedAt: null,
      episode: { titleId: parsed.data.titleId },
    },
  });

  return NextResponse.json({ ok: true });
}
