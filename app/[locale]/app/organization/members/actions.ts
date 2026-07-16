"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { resolvePublicAppUrl } from "@/lib/app-url";
import {
  requireOrgOwner,
  withOrganizationMutationLock,
} from "@/lib/corporate";
import { localizedPath } from "@/lib/i18n/routing";
import { sendOrganizationInviteEmail } from "@/lib/email";

const APP_URL = resolvePublicAppUrl();

async function back(query = "") {
  const locale = await getLocale();
  redirect(localizedPath(locale, `/app/organization/members${query}`));
}

export async function setMemberDepartment(formData: FormData) {
  const { membership } = await requireOrgOwner();
  const memberId = String(formData.get("memberId"));
  const departmentId = String(formData.get("departmentId") || "") || null;

  if (departmentId) {
    const dep = await prisma.department.findFirst({
      where: { id: departmentId, organizationId: membership.organizationId },
      select: { id: true },
    });
    if (!dep) return back();
  }
  await prisma.member.updateMany({
    where: { id: memberId, organizationId: membership.organizationId },
    data: { departmentId },
  });
  await back();
}

export async function updateMemberRole(formData: FormData) {
  const { membership } = await requireOrgOwner();
  const memberId = String(formData.get("memberId"));
  const role = String(formData.get("role") || "");
  if (role !== "owner" && role !== "member") return back();

  const outcome = await withOrganizationMutationLock(
    membership.organizationId,
    async (tx) => {
      const actorStillOwner = await tx.member.count({
        where: {
          id: membership.id,
          organizationId: membership.organizationId,
          role: "owner",
        },
      });
      if (actorStillOwner !== 1) return "unauthorized";

      const target = await tx.member.findFirst({
        where: { id: memberId, organizationId: membership.organizationId },
      });
      if (!target) return "missing";

      if (target.role === "owner" && role === "member") {
        const owners = await tx.member.count({
          where: { organizationId: membership.organizationId, role: "owner" },
        });
        if (owners <= 1) return "last-owner";
      }
      await tx.member.updateMany({
        where: { id: memberId, organizationId: membership.organizationId },
        data: { role },
      });
      return "updated";
    },
  );
  if (outcome === "last-owner") {
    return back("?err=lastowner");
  }
  await back();
}

export async function removeMember(formData: FormData) {
  const { session, membership } = await requireOrgOwner();
  const memberId = String(formData.get("memberId"));

  const outcome = await withOrganizationMutationLock(
    membership.organizationId,
    async (tx) => {
      const actorStillOwner = await tx.member.count({
        where: {
          id: membership.id,
          userId: session.user.id,
          organizationId: membership.organizationId,
          role: "owner",
        },
      });
      if (actorStillOwner !== 1) return "unauthorized";

      const target = await tx.member.findFirst({
        where: { id: memberId, organizationId: membership.organizationId },
      });
      if (!target) return "missing";
      if (target.userId === session.user.id) return "self";

      if (target.role === "owner") {
        const owners = await tx.member.count({
          where: { organizationId: membership.organizationId, role: "owner" },
        });
        if (owners <= 1) return "last-owner";
      }
      await tx.member.delete({ where: { id: memberId } });
      return "removed";
    },
  );

  if (outcome === "self") return back("?err=self");
  if (outcome === "last-owner") return back("?err=lastowner");
  await back();
}

export async function cancelInvitation(formData: FormData) {
  const { membership } = await requireOrgOwner();
  const id = String(formData.get("invitationId"));
  await prisma.invitation.updateMany({
    where: { id, organizationId: membership.organizationId, status: "pending" },
    data: { status: "canceled" },
  });
  await back();
}

export async function resendInvitation(formData: FormData) {
  const { session, membership } = await requireOrgOwner();
  const id = String(formData.get("invitationId"));
  const invite = await prisma.invitation.findFirst({
    where: { id, organizationId: membership.organizationId, status: "pending" },
  });
  if (!invite) return back();

  // Refresh the expiry window and re-send the email.
  await prisma.invitation.update({
    where: { id },
    data: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  const ok = await sendOrganizationInviteEmail({
    to: invite.email,
    organizationName: membership.organization.name,
    inviterName: session.user.name || session.user.email,
    inviteUrl: `${APP_URL}/invite/${id}`,
    locale: await getLocale(),
  });
  await back(ok ? "?resent=1" : "?err=email");
}
