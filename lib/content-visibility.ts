import { cache } from "react";
import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import { isStaff } from "./access";

export type ViewerAudience = {
  /** All orgs the user belongs to. */
  orgIds: string[];
  /** Orgs the user owns — owners see all of their org's content regardless of
      department targeting. */
  ownerOrgIds: string[];
  /** Departments the user is assigned to. */
  departmentIds: string[];
  /** Orgs where the user is a plain member (not owner) — org-level catalog
      hiding (OrganizationHiddenTitle) applies only to these. */
  memberOnlyOrgIds: string[];
};

/** The viewer's org/department memberships in one query (request-cached). */
export const getViewerAudience = cache(
  async (userId: string): Promise<ViewerAudience> => {
    const members = await prisma.member.findMany({
      where: { userId },
      select: { organizationId: true, role: true, departmentId: true },
    });
    return {
      orgIds: members.map((m) => m.organizationId),
      ownerOrgIds: members
        .filter((m) => m.role === "owner")
        .map((m) => m.organizationId),
      departmentIds: members
        .map((m) => m.departmentId)
        .filter((id): id is string => !!id),
      memberOnlyOrgIds: members
        .filter((m) => m.role !== "owner")
        .map((m) => m.organizationId),
    };
  },
);

/**
 * Title where-fragment restricting results to the audience the viewer may see:
 *  - staff (admin / platform_editor) → everything
 *  - everyone else → PUBLIC titles + ORG_ONLY titles assigned to one of the
 *    viewer's organizations. Department-targeted titles additionally require
 *    membership in one of the target departments (org owners bypass this).
 *
 * Combine via `AND: [audienceWhere(...)]` so it never collides with an
 * existing top-level `OR` (e.g. the discover search clause).
 */
export function audienceWhere(
  role: string | null | undefined,
  audience: ViewerAudience,
): Prisma.TitleWhereInput {
  if (isStaff(role)) return {};
  const { orgIds, ownerOrgIds, departmentIds, memberOnlyOrgIds } = audience;
  if (orgIds.length === 0) return { visibility: "PUBLIC" };
  // An org owner can hide individual PUBLIC titles from their members —
  // owners themselves (and staff) keep seeing everything.
  const publicBranch: Prisma.TitleWhereInput =
    memberOnlyOrgIds.length > 0
      ? {
          visibility: "PUBLIC",
          hiddenBy: {
            none: { organizationId: { in: memberOnlyOrgIds } },
          },
        }
      : { visibility: "PUBLIC" };
  return {
    OR: [
      publicBranch,
      ...(ownerOrgIds.length > 0
        ? [
            {
              visibility: "ORG_ONLY" as const,
              orgAudience: {
                some: { organizationId: { in: ownerOrgIds } },
              },
            },
          ]
        : []),
      {
        visibility: "ORG_ONLY",
        orgAudience: { some: { organizationId: { in: orgIds } } },
        OR: [
          { departmentAudience: { none: {} } },
          ...(departmentIds.length > 0
            ? [
                {
                  departmentAudience: {
                    some: { departmentId: { in: departmentIds } },
                  },
                },
              ]
            : []),
        ],
      },
    ],
  };
}

/** Whether a single title is visible to a viewer (for detail/player gating). */
export function canViewTitle(
  title: {
    visibility: string;
    orgAudience?: { organizationId: string }[];
    departmentAudience?: { departmentId: string }[];
    hiddenBy?: { organizationId: string }[];
  },
  role: string | null | undefined,
  audience: ViewerAudience,
): boolean {
  if (isStaff(role)) return true;
  if (title.visibility === "PUBLIC") {
    return !(title.hiddenBy ?? []).some((h) =>
      audience.memberOnlyOrgIds.includes(h.organizationId),
    );
  }
  const audienceOrgIds = title.orgAudience?.map((a) => a.organizationId) ?? [];
  if (audienceOrgIds.some((id) => audience.ownerOrgIds.includes(id))) {
    return true;
  }
  if (!audienceOrgIds.some((id) => audience.orgIds.includes(id))) return false;
  const deptIds = title.departmentAudience?.map((d) => d.departmentId) ?? [];
  return (
    deptIds.length === 0 ||
    deptIds.some((id) => audience.departmentIds.includes(id))
  );
}
