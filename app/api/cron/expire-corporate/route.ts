import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { GRACE_PERIOD_DAYS } from "@/lib/company";

/**
 * Lifecycle sweep for corporate subscriptions + invitations:
 *  - subscriptions past (end date + grace) → "expired"
 *  - subscriptions past end date but within grace → "grace"
 *  - pending invitations past their expiry → "expired" (frees the seat)
 *
 * Triggered by Vercel Cron (see vercel.json). Access is also derived from the
 * end date + grace at request time (lib/company.ts), so correctness does not
 * depend on this job running on time — it only keeps the labels tidy.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const graceThreshold = new Date(
    now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );

  const [expired, grace, staleInvites] = await prisma.$transaction([
    // Past the grace window → fully expired (covers active or grace labels).
    prisma.companyProfile.updateMany({
      where: {
        subscriptionStatus: { in: ["active", "grace"] },
        subscriptionEndsAt: { lt: graceThreshold },
      },
      data: { subscriptionStatus: "expired" },
    }),
    // Recently ended → grace window.
    prisma.companyProfile.updateMany({
      where: {
        subscriptionStatus: "active",
        subscriptionEndsAt: { lt: now, gte: graceThreshold },
      },
      data: { subscriptionStatus: "grace" },
    }),
    // Expired pending invitations no longer hold a seat.
    prisma.invitation.updateMany({
      where: { status: "pending", expiresAt: { lt: now } },
      data: { status: "expired" },
    }),
  ]);

  return NextResponse.json({
    expired: expired.count,
    grace: grace.count,
    staleInvites: staleInvites.count,
  });
}
