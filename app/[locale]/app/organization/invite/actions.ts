"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";
import { localizedPath } from "@/lib/i18n/routing";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const SPLIT_RE = /[\s,;]+/;

function parseEmails(raw: string): string[] {
  return raw
    .split(SPLIT_RE)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_RE.test(e));
}

async function assertSeatCapacity(orgId: string, incoming: number) {
  const t = await getTranslations("organization");
  const profile = await prisma.companyProfile.findUnique({
    where: { organizationId: orgId },
  });
  if (!profile) throw new Error(t("errNoProfile"));
  // corp_large has no seat cap; every other plan (corp_small, manual) is
  // limited by seatCount. Exceeding it requires a package upgrade.
  if (profile.plan === "corp_large") return;
  const [members, pending] = await Promise.all([
    prisma.member.count({ where: { organizationId: orgId } }),
    prisma.invitation.count({
      // Only invitations that are still live consume a seat; expired ones are
      // reclaimed (and swept by the expire-corporate cron).
      where: {
        organizationId: orgId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    }),
  ]);
  const used = members + pending;
  if (used + incoming > profile.seatCount) {
    // The upgrade hint only makes sense on the small Stripe package; manually
    // activated companies negotiate seats with sales instead.
    throw new Error(
      t(profile.plan === "corp_small" ? "errSeatsUpgrade" : "errSeats", {
        remaining: Math.max(0, profile.seatCount - used),
        requested: incoming,
      }),
    );
  }
}

async function invitePath() {
  const locale = await getLocale();
  return localizedPath(locale, "/app/organization/invite");
}

export async function inviteSingle(formData: FormData) {
  const { membership } = await requireOrgOwner();
  const base = await invitePath();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    redirect(`${base}?err=${encodeURIComponent("Invalid email")}`);
  }

  try {
    await assertSeatCapacity(membership.organizationId, 1);
    await auth.api.createInvitation({
      headers: await headers(),
      body: {
        email,
        role: "member",
        organizationId: membership.organizationId,
      },
    });
  } catch (e) {
    redirect(`${base}?err=${encodeURIComponent((e as Error).message)}`);
  }
  redirect(`${base}?sent=1`);
}

export async function inviteBulk(formData: FormData) {
  const { membership } = await requireOrgOwner();
  const base = await invitePath();
  const emails = parseEmails(String(formData.get("emails") || ""));
  if (emails.length === 0) {
    redirect(`${base}?err=${encodeURIComponent("No valid emails")}`);
  }

  try {
    await assertSeatCapacity(membership.organizationId, emails.length);
  } catch (e) {
    redirect(`${base}?err=${encodeURIComponent((e as Error).message)}`);
  }

  const h = await headers();
  let ok = 0;
  for (const email of emails) {
    try {
      await auth.api.createInvitation({
        headers: h,
        body: {
          email,
          role: "member",
          organizationId: membership.organizationId,
        },
      });
      ok++;
    } catch (e) {
      console.error(`[invite] failed for ${email}:`, (e as Error).message);
    }
  }
  redirect(`${base}?sent=${ok}`);
}
