"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";

import { localizedPath } from "@/lib/i18n/routing";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { isNextRedirect } from "@/lib/utils";

/** Refresh the companies page and flash a one-shot toast (`?toast=<key>`). */
async function backToCompanies(toast: string, emsg?: string) {
  revalidatePath("/", "layout");
  const locale = await getLocale();
  const q = emsg ? `&emsg=${encodeURIComponent(emsg)}` : "";
  redirect(localizedPath(locale, `/app/admin/companies?toast=${toast}${q}`));
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function markLeadContacted(formData: FormData) {
  await requireRole(["admin"]);
  const id = String(formData.get("id"));
  await prisma.corporateLead.update({
    where: { id },
    data: { status: "contacted" },
  });
  await backToCompanies("saved");
}

export async function activateCompany(formData: FormData) {
  await requireRole(["admin"]);
  try {

  const companyName = String(formData.get("companyName") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const ownerEmail = String(formData.get("ownerEmail") || "").trim().toLowerCase();
  const ownerName = String(formData.get("ownerName") || "").trim();
  const billingEmail = String(formData.get("billingEmail") || "").trim();
  const seatCount = Number(formData.get("seatCount") || 0);
  const endsAtRaw = String(formData.get("endsAt") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  const leadId = String(formData.get("leadId") || "").trim() || null;

  if (!companyName || !slug || !ownerEmail || !billingEmail || seatCount < 1) {
    throw new Error("Eksik alan");
  }
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

  // 1) Ensure the OWNER user exists. We provision one when missing so that the
  //    org owner-member is always the intended owner — never the admin running
  //    this action.
  let owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  let provisioned = false;
  if (!owner) {
    try {
      await auth.api.createUser({
        headers: await headers(),
        body: {
          email: ownerEmail,
          password: `${crypto.randomUUID()}Aa1!`,
          name: ownerName || ownerEmail,
          // role omitted → admin plugin applies defaultRole ("individual").
        },
      });
    } catch (e) {
      throw new Error(
        `Owner kullanıcısı oluşturulamadı: ${(e as Error).message}`,
      );
    }
    owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    provisioned = true;
  }
  if (!owner) throw new Error("Owner kullanıcısı bulunamadı");

  // Admin-provisioned owners skip the e-mail verification gate.
  if (provisioned && !owner.emailVerified) {
    await prisma.user.update({
      where: { id: owner.id },
      data: { emailVerified: true },
    });
  }

  // 2) Resolve the organization. Reuse an org that already has this slug (so a
  //    retry after a partial failure completes instead of colliding); only a
  //    fully-activated company (slug already has a CompanyProfile) is rejected.
  //    A fresh org is created via the system-action path (NO request headers +
  //    body.userId) so the OWNER — not the admin — becomes the owner-member.
  const existingOrg = await prisma.organization.findUnique({
    where: { slug },
    include: { companyProfile: { select: { organizationId: true } } },
  });
  if (existingOrg?.companyProfile) {
    throw new Error(`"${slug}" slug'ı zaten aktif bir şirkete ait.`);
  }

  let orgId: string;
  if (existingOrg) {
    orgId = existingOrg.id;
    await prisma.member.upsert({
      where: {
        organizationId_userId: { organizationId: orgId, userId: owner.id },
      },
      create: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: owner.id,
        role: "owner",
      },
      update: { role: "owner" },
    });
  } else {
    let org: { id: string } | null = null;
    try {
      org = (await auth.api.createOrganization({
        body: { name: companyName, slug, userId: owner.id },
      })) as { id: string } | null;
    } catch (e) {
      throw new Error(
        `Organizasyon oluşturulamadı: ${(e as Error).message}`,
      );
    }
    if (!org) throw new Error("Organizasyon oluşturulamadı");
    orgId = org.id;
  }

  // 3) Avoid violating the unique lead link if this lead is already linked.
  let linkLeadId = leadId;
  if (linkLeadId) {
    const linked = await prisma.companyProfile.findUnique({
      where: { leadId: linkLeadId },
      select: { organizationId: true },
    });
    if (linked && linked.organizationId !== orgId) linkLeadId = null;
  }

  // 4) Billing / seat profile — idempotent so a retry completes the activation.
  await prisma.companyProfile.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      billingEmail,
      contactName: ownerName,
      seatCount,
      subscriptionStatus: "active",
      subscriptionStartedAt: new Date(),
      subscriptionEndsAt: endsAt,
      notes,
      leadId: linkLeadId,
    },
    update: {
      billingEmail,
      contactName: ownerName,
      seatCount,
      subscriptionStatus: "active",
      subscriptionEndsAt: endsAt,
      notes,
      ...(linkLeadId ? { leadId: linkLeadId } : {}),
    },
  });

  // 5) Close the originating lead.
  if (linkLeadId) {
    await prisma.corporateLead
      .update({ where: { id: linkLeadId }, data: { status: "converted" } })
      .catch(() => {});
  }

  // 6) Provisioned owners get a set-password e-mail (also their first sign-in).
  if (provisioned) {
    await auth.api
      .requestPasswordReset({
        body: { email: ownerEmail, redirectTo: `${APP_URL}/reset-password` },
      })
      .catch(() => {});
  }

  } catch (e) {
    if (isNextRedirect(e)) throw e;
    // Business errors (slug taken, owner provisioning failed, …) surface as
    // an error toast instead of the generic error page.
    await backToCompanies("error", (e as Error).message);
  }
  await backToCompanies("created");
}

export async function updateCompany(formData: FormData) {
  await requireRole(["admin"]);
  const organizationId = String(formData.get("organizationId"));
  const billingEmail = String(formData.get("billingEmail") || "").trim();
  const seatCount = Number(formData.get("seatCount") || 0);
  const subscriptionStatus = String(formData.get("subscriptionStatus") || "").trim();
  const endsAtRaw = String(formData.get("endsAt") || "").trim();
  const selfServeContent = formData.get("selfServeContent") === "on";

  if (!billingEmail || seatCount < 0) throw new Error("Eksik alan");
  const allowed = new Set(["pending", "active", "grace", "expired"]);
  if (!allowed.has(subscriptionStatus)) throw new Error("Geçersiz durum");

  await prisma.companyProfile.update({
    where: { organizationId },
    data: {
      billingEmail,
      seatCount,
      subscriptionStatus,
      subscriptionEndsAt: endsAtRaw ? new Date(endsAtRaw) : null,
      selfServeContent,
    },
  });
  await backToCompanies("saved");
}

export async function deactivateCompany(formData: FormData) {
  await requireRole(["admin"]);
  const organizationId = String(formData.get("organizationId"));
  await prisma.companyProfile.update({
    where: { organizationId },
    data: { subscriptionStatus: "expired" },
  });
  await backToCompanies("saved");
}

export async function reactivateCompany(formData: FormData) {
  await requireRole(["admin"]);
  const organizationId = String(formData.get("organizationId"));
  await prisma.companyProfile.update({
    where: { organizationId },
    data: { subscriptionStatus: "active" },
  });
  await backToCompanies("saved");
}
