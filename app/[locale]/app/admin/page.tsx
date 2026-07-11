import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import DashboardBoard from "@/components/admin/DashboardBoard";

async function loadStats() {
  // cacheComponents: reading the current time requires request-scoped data
  // access first — connection() marks this scope per-request.
  await connection();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return Promise.all([
    prisma.user.count(),
    prisma.companyProfile.count({ where: { subscriptionStatus: "active" } }),
    prisma.corporateLead.count({ where: { status: "new" } }),
    prisma.individualSubscription.count({ where: { status: "active" } }),
    prisma.title.count({ where: { published: true } }),
    prisma.progress.aggregate({ _sum: { positionSec: true } }),
    prisma.progress.count({ where: { completedAt: { not: null } } }),
    prisma.progress.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.companyProfile.aggregate({
      _sum: { seatCount: true },
      where: { subscriptionStatus: "active" },
    }),
    // Top titles by unique viewers — aggregated in Postgres (distinct-count,
    // sort, limit) instead of loading every Progress row into memory.
    prisma.$queryRaw<Array<{ id: string; title: string; viewers: bigint }>>`
      SELECT t.id, t.title, COUNT(DISTINCT p."userId") AS viewers
      FROM "Title" t
      JOIN "Episode" e ON e."titleId" = t.id
      JOIN "Progress" p ON p."episodeId" = e.id
      WHERE t.published = true
      GROUP BY t.id, t.title
      ORDER BY viewers DESC
      LIMIT 5
    `,
  ]);
}

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [
    t,
    [
      users,
      companies,
      pendingLeads,
      activeSubs,
      publishedTitles,
      watchAgg,
      completedCount,
      totalProgress,
      recentSignups,
      seatAgg,
      topTitlesRaw,
    ],
  ] = await Promise.all([getTranslations("admin"), loadStats()]);

  const watchHours = Math.round(
    (watchAgg._sum.positionSec ?? 0) / 3600,
  );
  const completionRate =
    totalProgress > 0 ? Math.round((completedCount / totalProgress) * 100) : 0;
  const corporateSeats = seatAgg._sum.seatCount ?? 0;

  const topTitles = topTitlesRaw
    .map((t) => ({ id: t.id, title: t.title, viewers: Number(t.viewers) }))
    .filter((x) => x.viewers > 0);

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("dashboard")}</h1>
      </header>

      <DashboardBoard
        hero={{
          pulse: t("platformPulse"),
          label: t("users"),
          value: users,
          sub: t("recentSignups", { count: recentSignups }),
        }}
        cells={[
          { label: t("activeIndividual"), value: activeSubs, icon: "play" },
          {
            label: t("companies"),
            value: companies,
            sub: t("corporateSeats", { count: corporateSeats }),
            href: "/app/admin/companies",
            icon: "building",
          },
          {
            label: t("newRequests"),
            value: pendingLeads,
            href: "/app/admin/companies",
            alert: pendingLeads > 0,
            icon: "bell",
          },
          {
            label: t("publishedContent"),
            value: publishedTitles,
            tone: "dark",
            icon: "clapper",
          },
        ]}
        hours={{ label: t("watchHours"), value: watchHours }}
        completed={{ label: t("completedEpisodes"), value: completedCount }}
        rate={{ label: t("completionRate"), value: completionRate }}
        topTitles={{
          heading: t("topTitles"),
          empty: t("noViewsYet"),
          viewersLabel: t("uniqueViewers"),
          items: topTitles,
        }}
      />
    </div>
  );
}
