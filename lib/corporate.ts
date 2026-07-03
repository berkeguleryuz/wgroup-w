import { redirect } from "next/navigation";
import { requireSession } from "./access";
import { prisma } from "./prisma";

export async function requireOrgOwner() {
  const session = await requireSession();
  const userId = session.user.id;
  const ownerMembership = await prisma.member.findFirst({
    where: { userId, role: "owner" },
    // Deterministic pick for multi-org owners so the layout header, page
    // bodies, and mutations all resolve to the same organization.
    orderBy: { createdAt: "asc" },
    include: { organization: { include: { companyProfile: true } } },
  });
  if (!ownerMembership) redirect("/app");
  return { session, membership: ownerMembership };
}

/** Org owner + the company's self-serve content studio must be enabled. */
export async function requireOrgContentStudio() {
  const ctx = await requireOrgOwner();
  if (!ctx.membership.organization.companyProfile?.selfServeContent) {
    redirect("/app/organization");
  }
  return ctx;
}

/**
 * Upload-route check (no redirect): the org id when the user owns an org
 * whose self-serve content studio is enabled, else null. Uploads from that
 * org land under an org-scoped key prefix so per-company storage usage can
 * be measured straight from the bucket.
 */
export async function getSelfServeOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.member.findFirst({
    where: {
      userId,
      role: "owner",
      organization: { companyProfile: { selfServeContent: true } },
    },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

export async function canSelfServeContent(userId: string): Promise<boolean> {
  return (await getSelfServeOrgId(userId)) !== null;
}
