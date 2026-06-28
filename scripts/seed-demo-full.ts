/**
 * Full demo dataset (idempotent). Run after db:seed + wire-real-episodes +
 * seed-demo-extras:
 *   npx tsx scripts/seed-demo-full.ts
 *
 * Adds, on top of the base catalog:
 *  - Real users at every level (2nd editor, instructor, sub-less / trialing /
 *    expired individuals).
 *  - Two SEPARATE companies (Acme, Globex) with in-company permission levels
 *    (owner + co-admin + members), departments, and member→department mapping.
 *  - Company-exclusive (ORG_ONLY) content per company → tenant isolation demo.
 *  - Team learning progress so the owner reports page has real data.
 *
 * All passwords: Test123456!  (email-verified)
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";

import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

const PASSWORD = "Test123456!";
const YEAR = 365 * 24 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const SAMPLE_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

async function main() {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(PASSWORD);

  async function user(email: string, name: string, role: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    const id = existing?.id ?? randomUUID();
    await prisma.user.upsert({
      where: { email },
      create: { id, email, name, role, emailVerified: true },
      update: { name, role, emailVerified: true },
    });
    const acc = await prisma.account.findFirst({
      where: { userId: id, providerId: "credential" },
    });
    if (acc) await prisma.account.update({ where: { id: acc.id }, data: { password: hash } });
    else
      await prisma.account.create({
        data: { id: randomUUID(), userId: id, providerId: "credential", accountId: id, password: hash },
      });
    return id;
  }

  async function sub(userId: string, key: string, status: string, endMs: number) {
    await prisma.individualSubscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: `test_cus_${key}`,
        stripeSubscriptionId: `test_sub_${key}`,
        plan: "monthly",
        status,
        currentPeriodEnd: new Date(Date.now() + endMs),
        cancelAtPeriodEnd: status === "canceled",
      },
      update: { status, currentPeriodEnd: new Date(Date.now() + endMs) },
    });
  }

  async function org(slug: string, name: string, billing: string, seats: number) {
    const o = await prisma.organization.upsert({
      where: { slug },
      create: { id: randomUUID(), name, slug },
      update: { name },
    });
    await prisma.companyProfile.upsert({
      where: { organizationId: o.id },
      create: {
        organizationId: o.id,
        billingEmail: billing,
        contactName: name,
        seatCount: seats,
        subscriptionStatus: "active",
        subscriptionStartedAt: new Date(),
        subscriptionEndsAt: new Date(Date.now() + YEAR),
      },
      update: { seatCount: seats, subscriptionStatus: "active", subscriptionEndsAt: new Date(Date.now() + YEAR) },
    });
    return o.id;
  }

  async function dept(orgId: string, name: string) {
    const d = await prisma.department.upsert({
      where: { organizationId_name: { organizationId: orgId, name } },
      create: { id: randomUUID(), organizationId: orgId, name },
      update: {},
    });
    return d.id;
  }

  async function member(orgId: string, userId: string, role: string, departmentId?: string) {
    await prisma.member.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      create: { id: randomUUID(), organizationId: orgId, userId, role, departmentId: departmentId ?? null },
      update: { role, departmentId: departmentId ?? null },
    });
  }

  async function orgOnlyTitle(
    slug: string,
    title: string,
    synopsis: string,
    categorySlug: string,
    videoPath: string,
    durationSec: number,
    orgIds: string[],
  ) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!cat) throw new Error(`category ${categorySlug} not found`);
    const t = await prisma.title.upsert({
      where: { slug },
      create: {
        slug,
        type: "SERIES",
        title,
        synopsis,
        categoryId: cat.id,
        published: true,
        publishedAt: new Date(),
        visibility: "ORG_ONLY",
      },
      update: { title, synopsis, visibility: "ORG_ONLY", published: true },
    });
    const ep = await prisma.episode.upsert({
      where: { titleId_seasonNumber_episodeNumber: { titleId: t.id, seasonNumber: 1, episodeNumber: 1 } },
      create: { titleId: t.id, seasonNumber: 1, episodeNumber: 1, name: "Bölüm 1", videoPath, durationSec, previewSec: 30 },
      update: { videoPath, durationSec },
    });
    for (const organizationId of orgIds) {
      await prisma.titleOrganization.upsert({
        where: { titleId_organizationId: { titleId: t.id, organizationId } },
        create: { titleId: t.id, organizationId },
        update: {},
      });
    }
    for (const tr of [
      { lang: "tr", label: "Türkçe", vttPath: "/subtitles/demo-tr.vtt" },
      { lang: "en", label: "English", vttPath: "/subtitles/demo-en.vtt" },
    ]) {
      await prisma.subtitle.upsert({
        where: { episodeId_lang: { episodeId: ep.id, lang: tr.lang } },
        create: { episodeId: ep.id, ...tr },
        update: tr,
      });
    }
    return ep.id;
  }

  async function progress(userId: string, episodeId: string, positionSec: number, completed: boolean) {
    await prisma.progress.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      create: { userId, episodeId, positionSec, completedAt: completed ? new Date() : null },
      update: { positionSec, completedAt: completed ? new Date() : null },
    });
  }

  // ---- Platform users (varied levels) ----
  await user("editor2@busyflix.com", "İkinci Editör", "platform_editor");
  const instructorId = await user("instructor@busyflix.com", "Eğitmen Kullanıcı", "instructor");
  const user2 = await user("user2@busyflix.com", "Abonesiz Kullanıcı", "individual"); // no sub → paywall
  const trialU = await user("trial@busyflix.com", "Deneme Kullanıcı", "individual");
  const expiredU = await user("expired@busyflix.com", "Süresi Dolmuş", "individual");
  void user2;
  await sub(trialU, "trial", "trialing", 14 * DAY);
  await sub(expiredU, "expired", "canceled", -3 * DAY);

  // Link instructor user to an existing Instructor profile.
  const anyInstructor = await prisma.instructor.findFirst({ where: { userId: null } });
  if (anyInstructor) {
    await prisma.instructor.update({ where: { id: anyInstructor.id }, data: { userId: instructorId } });
  }

  // ---- Company A: Acme Holding (reuse the existing test-co org) ----
  const acme = await org("test-co", "Acme Holding", "company@busyflix.com", 25);
  const acmeSatis = await dept(acme, "Satış");
  const acmePazarlama = await dept(acme, "Pazarlama");
  const acmeIK = await dept(acme, "İK");
  const acmeYonetim = await dept(acme, "Yönetim");

  const acmeOwner = await user("company@busyflix.com", "Kurumsal Admin", "individual");
  const acmeCoAdmin = await user("acme.admin@busyflix.com", "Acme Co-Admin", "individual");
  const acmeU1 = await user("companyuser@busyflix.com", "Kurumsal Kullanıcı", "individual");
  const acmeU2 = await user("acme.uye2@busyflix.com", "Acme Üye 2", "individual");
  const acmeU3 = await user("acme.uye3@busyflix.com", "Acme Üye 3", "individual");

  await member(acme, acmeOwner, "owner", acmeYonetim);
  await member(acme, acmeCoAdmin, "owner", acmeYonetim); // 2nd Kurumsal Admin (co-admin)
  await member(acme, acmeU1, "member", acmeSatis);
  await member(acme, acmeU2, "member", acmePazarlama);
  await member(acme, acmeU3, "member", acmeIK);

  // ---- Company B: Globex (separate tenant) ----
  const globex = await org("globex", "Globex A.Ş.", "globex.owner@busyflix.com", 10);
  const gxOps = await dept(globex, "Operasyon");
  const gxFinans = await dept(globex, "Finans");
  const gxOwner = await user("globex.owner@busyflix.com", "Globex Admin", "individual");
  const gxU1 = await user("globex.uye1@busyflix.com", "Globex Üye 1", "individual");
  const gxU2 = await user("globex.uye2@busyflix.com", "Globex Üye 2", "individual");
  await member(globex, gxOwner, "owner", gxOps);
  await member(globex, gxU1, "member", gxOps);
  await member(globex, gxU2, "member", gxFinans);

  // ---- Company-exclusive content (tenant isolation) ----
  await orgOnlyTitle(
    "acme-ozel-liderlik",
    "Acme'ye Özel: Liderlik Programı",
    "Yalnızca Acme Holding çalışanlarına açık iç eğitim programı.",
    "liderlik",
    "/hls/lider-dogmaz-olusur-4/master.m3u8",
    90,
    [acme],
  );
  await orgOnlyTitle(
    "globex-ozel-onboarding",
    "Globex'e Özel: Oryantasyon",
    "Globex yeni çalışan oryantasyon serisi — şirkete özel.",
    "kariyer-gelisim",
    SAMPLE_MP4,
    120,
    [globex],
  );

  // ---- Team learning progress (for the owner reports page) ----
  const lider = await prisma.title.findUnique({
    where: { slug: "lider-dogmaz-olusur" },
    include: { episodes: { orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }] } },
  });
  if (lider && lider.episodes.length >= 2) {
    const [e1, e2] = lider.episodes;
    await progress(acmeOwner, e1.id, e1.durationSec, true);
    await progress(acmeOwner, e2.id, Math.floor(e2.durationSec / 2), false);
    await progress(acmeU1, e1.id, e1.durationSec, true);
    await progress(acmeU1, e2.id, Math.floor(e2.durationSec / 3), false);
    await progress(acmeU2, e1.id, e1.durationSec, true);
    await progress(acmeU3, e1.id, Math.floor(e1.durationSec / 4), false);
  }

  console.log("✓ Full demo dataset seeded.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
