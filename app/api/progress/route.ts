import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  episodeId: z.string().min(1),
  position: z.number().int().nonnegative(),
  completed: z.boolean().optional().default(false),
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
