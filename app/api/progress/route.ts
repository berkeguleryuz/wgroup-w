import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  position: z.number().int().nonnegative(),
  completed: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { episodeId, position, completed } = parsed.data;
  const userId = session.user.id;

  await prisma.progress.upsert({
    where: { userId_episodeId: { userId, episodeId } },
    create: {
      userId,
      episodeId,
      positionSec: position,
      completedAt: completed ? new Date() : null,
    },
    update: {
      positionSec: position,
      completedAt: completed ? new Date() : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
