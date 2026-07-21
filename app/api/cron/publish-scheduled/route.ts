import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  FEATURED_TITLES_TAG,
  PUBLIC_CATALOG_TAG,
} from "@/lib/public-home-catalog";

/**
 * Publishes titles whose scheduled time has passed. Triggered by Vercel Cron
 * (see vercel.json) or manually with `Authorization: Bearer <CRON_SECRET>`.
 * Vercel sends its cron requests with the CRON_SECRET bearer automatically
 * when the env var is set.
 */
export async function GET(request: Request) {
  // Fail closed: without a configured secret the endpoint is not callable.
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await prisma.title.updateMany({
    where: { published: false, scheduledFor: { lte: now } },
    data: { published: true, publishedAt: now, scheduledFor: null },
  });

  if (result.count > 0) {
    try {
      revalidateTag(FEATURED_TITLES_TAG, "max");
      revalidateTag(PUBLIC_CATALOG_TAG, "max");
    } catch (error) {
      console.error("catalog cache invalidation failed", {
        tags: [FEATURED_TITLES_TAG, PUBLIC_CATALOG_TAG],
        error,
      });
    }
  }

  return NextResponse.json({ published: result.count });
}
