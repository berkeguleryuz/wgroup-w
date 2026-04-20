"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";

export async function markLeadContacted(formData: FormData) {
  await requireRole(["admin"]);
  const id = String(formData.get("id"));
  await prisma.corporateLead.update({
    where: { id },
    data: { status: "contacted" },
  });
  revalidatePath("/app/admin/companies");
}

export async function activateCompany(formData: FormData) {
  await requireRole(["admin"]);

  const companyName = String(formData.get("companyName") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const ownerEmail = String(formData.get("ownerEmail") || "").trim();
  const ownerName = String(formData.get("ownerName") || "").trim();
  const billingEmail = String(formData.get("billingEmail") || "").trim();
  const seatCount = Number(formData.get("seatCount") || 0);
  const endsAtRaw = String(formData.get("endsAt") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!companyName || !slug || !ownerEmail || !billingEmail || seatCount < 1) {
    throw new Error("Eksik alan");
  }

  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

  const org = await auth.api.createOrganization({
    headers: await headers(),
    body: {
      name: companyName,
      slug,
      userId: (
        await prisma.user.findUnique({ where: { email: ownerEmail } })
      )?.id,
    },
  });

  if (!org) throw new Error("Organizasyon oluşturulamadı");

  await prisma.companyProfile.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      billingEmail,
      contactName: ownerName,
      seatCount,
      subscriptionStatus: "active",
      subscriptionStartedAt: new Date(),
      subscriptionEndsAt: endsAt,
      notes,
    },
    update: {
      billingEmail,
      contactName: ownerName,
      seatCount,
      subscriptionStatus: "active",
      subscriptionStartedAt: new Date(),
      subscriptionEndsAt: endsAt,
      notes,
    },
  });

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingOwner) {
    await prisma.member.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: existingOwner.id },
      },
      create: { id: crypto.randomUUID(), organizationId: org.id, userId: existingOwner.id, role: "owner" },
      update: { role: "owner" },
    });
  } else {
    await auth.api.createInvitation({
      headers: await headers(),
      body: { email: ownerEmail, role: "owner", organizationId: org.id },
    });
  }

  revalidatePath("/app/admin/companies");
}
