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
 * Upload-route check (no redirect): true when the user owns an org whose
 * self-serve content studio is enabled.
 */
export async function canSelfServeContent(userId: string): Promise<boolean> {
  const membership = await prisma.member.findFirst({
    where: {
      userId,
      role: "owner",
      organization: { companyProfile: { selfServeContent: true } },
    },
    select: { id: true },
  });
  return !!membership;
}
