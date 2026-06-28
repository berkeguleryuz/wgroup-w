/**
 * Seed deterministic TEST users (idempotent). Re-run after a DB reset.
 *   npx tsx scripts/seed-test-users.ts
 *
 * Passwords are hashed with better-auth's own hasher (via auth.$context) so
 * the credential accounts log in normally. All users are email-verified.
 *
 *   admin@busyflix.com        → admin            (admin panel)
 *   editor@busyflix.com       → platform_editor  (editor panel)
 *   user@busyflix.com         → individual + active subscription
 *   company@busyflix.com      → org OWNER  (Kurumsal Admin)
 *   companyuser@busyflix.com  → org MEMBER (Kurumsal Kullanıcı)
 *   (company + companyuser share org "Test Şirket", active corporate plan)
 *
 * Password for all: Test123456!
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";

import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

const PASSWORD = "Test123456!";

async function upsertUser(
  email: string,
  name: string,
  role: string,
  hash: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  const id = existing?.id ?? randomUUID();

  await prisma.user.upsert({
    where: { email },
    create: { id, email, name, role, emailVerified: true },
    update: { name, role, emailVerified: true },
  });

  // Credential (email+password) account.
  const account = await prisma.account.findFirst({
    where: { userId: id, providerId: "credential" },
  });
  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hash },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: id,
        providerId: "credential",
        accountId: id,
        password: hash,
      },
    });
  }
  console.log(`  ✓ ${email} (${role})`);
  return id;
}

async function main() {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(PASSWORD);

  console.log("Test kullanıcıları:");
  await upsertUser("admin@busyflix.com", "Admin", "admin", hash);
  await upsertUser("editor@busyflix.com", "Editor", "platform_editor", hash);
  const userId = await upsertUser("user@busyflix.com", "Bireysel Kullanıcı", "individual", hash);
  const ownerId = await upsertUser("company@busyflix.com", "Kurumsal Admin", "individual", hash);
  const memberId = await upsertUser("companyuser@busyflix.com", "Kurumsal Kullanıcı", "individual", hash);

  // Active individual subscription for user@ (test the full watch experience).
  const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await prisma.individualSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: "test_cus_user",
      stripeSubscriptionId: "test_sub_user",
      plan: "monthly",
      status: "active",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
    update: { status: "active", currentPeriodEnd: periodEnd },
  });
  console.log("  ✓ user@ → aktif bireysel abonelik");

  // Corporate org + active plan + owner/member memberships.
  const org = await prisma.organization.upsert({
    where: { slug: "test-co" },
    create: { id: randomUUID(), name: "Test Şirket", slug: "test-co" },
    update: { name: "Test Şirket" },
  });
  await prisma.companyProfile.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      billingEmail: "company@busyflix.com",
      contactName: "Kurumsal Admin",
      seatCount: 25,
      subscriptionStatus: "active",
      subscriptionStartedAt: new Date(),
      subscriptionEndsAt: periodEnd,
    },
    update: { subscriptionStatus: "active", seatCount: 25, subscriptionEndsAt: periodEnd },
  });
  for (const [uid, role] of [
    [ownerId, "owner"],
    [memberId, "member"],
  ] as const) {
    await prisma.member.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: uid } },
      create: { id: randomUUID(), organizationId: org.id, userId: uid, role },
      update: { role },
    });
  }
  console.log('  ✓ "Test Şirket" (aktif plan, 25 koltuk) → company@ owner, companyuser@ member');

  console.log("\nHepsi hazır. Şifre: Test123456!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
