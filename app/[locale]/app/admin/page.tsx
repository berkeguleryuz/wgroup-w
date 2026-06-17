import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";

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
    prisma.title.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        episodes: {
          select: { progress: { select: { userId: true } } },
        },
      },
    }),
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
      titlesWithViewers,
    ],
  ] = await Promise.all([getTranslations("admin"), loadStats()]);

  const watchHours = Math.round(
    (watchAgg._sum.positionSec ?? 0) / 3600,
  );
  const completionRate =
    totalProgress > 0 ? Math.round((completedCount / totalProgress) * 100) : 0;
  const corporateSeats = seatAgg._sum.seatCount ?? 0;

  const topTitles = titlesWithViewers
    .map((title) => ({
      id: title.id,
      title: title.title,
      viewers: new Set(
        title.episodes.flatMap((e) => e.progress.map((p) => p.userId)),
      ).size,
    }))
    .filter((x) => x.viewers > 0)
    .sort((a, b) => b.viewers - a.viewers)
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("dashboard")}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={t("users")} value={users} sub={t("recentSignups", { count: recentSignups })} />
        <Stat label={t("activeIndividual")} value={activeSubs} />
        <Stat
          label={t("companies")}
          value={companies}
          sub={t("corporateSeats", { count: corporateSeats })}
          href="/app/admin/companies"
        />
        <Stat
          label={t("newRequests")}
          value={pendingLeads}
          href="/app/admin/companies"
        />
        <Stat label={t("publishedContent")} value={publishedTitles} />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("watchHours")} value={watchHours} />
        <Stat label={t("completedEpisodes")} value={completedCount} />
        <Stat
          label={t("completionRate")}
          value={completionRate}
          suffix="%"
        />
      </section>

      <section className="rounded-11 border border-border/60 bg-background">
        <h2 className="border-b border-border/60 px-5 py-4 font-display text-xl">
          {t("topTitles")}
        </h2>
        {topTitles.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            {t("noViewsYet")}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">{t("titleCol")}</th>
                <th className="px-5 py-3 text-right">{t("uniqueViewers")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {topTitles.map((x) => (
                <tr key={x.id}>
                  <td className="px-5 py-3 font-medium">{x.title}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    {x.viewers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  suffix,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  suffix?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-11 border border-border/60 bg-background p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl">
        {value}
        {suffix}
      </p>
      {sub ? (
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
