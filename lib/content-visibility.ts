import { cache } from "react";
import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import { isStaff } from "./access";

/** Organization ids the user is a member of (request-cached). */
export const getMembershipOrgIds = cache(
  async (userId: string): Promise<string[]> => {
    const members = await prisma.member.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return members.map((m) => m.organizationId);
  },
);

/**
 * Title where-fragment restricting results to the audience the viewer may see:
 *  - staff (admin / platform_editor) → everything
 *  - everyone else → PUBLIC titles + ORG_ONLY titles assigned to one of the
 *    viewer's organizations.
 *
 * Combine via `AND: [audienceWhere(...)]` so it never collides with an
 * existing top-level `OR` (e.g. the discover search clause).
 */
export function audienceWhere(
  role: string | null | undefined,
  orgIds: string[],
): Prisma.TitleWhereInput {
  if (isStaff(role)) return {};
  if (orgIds.length === 0) return { visibility: "PUBLIC" };
  return {
    OR: [
      { visibility: "PUBLIC" },
      {
        visibility: "ORG_ONLY",
        orgAudience: { some: { organizationId: { in: orgIds } } },
      },
    ],
  };
}

/** Whether a single title is visible to a viewer (for detail/player gating). */
export function canViewTitle(
  title: { visibility: string; orgAudience?: { organizationId: string }[] },
  role: string | null | undefined,
  orgIds: string[],
): boolean {
  if (isStaff(role)) return true;
  if (title.visibility === "PUBLIC") return true;
  const audienceOrgIds = title.orgAudience?.map((a) => a.organizationId) ?? [];
  return audienceOrgIds.some((id) => orgIds.includes(id));
}
