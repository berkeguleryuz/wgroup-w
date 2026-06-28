import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";

export default async function CorporateReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ dept?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { membership }] = await Promise.all([
    getTranslations("organization"),
    requireOrgOwner(),
  ]);
  const orgId = membership.organizationId;
  const sp = searchParams ? await searchParams : undefined;
  const deptFilter = sp?.dept || null;

  const [departments, members] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    }),
    prisma.member.findMany({
      where: {
        organizationId: orgId,
        ...(deptFilter ? { departmentId: deptFilter } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const userIds = members.map((m) => m.userId);
  const progress =
    userIds.length > 0
      ? await prisma.progress.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, completedAt: true, updatedAt: true },
        })
      : [];

  // Aggregate per member: completed lessons, in-progress, last activity.
  const stats = new Map<
    string,
    { completed: number; inProgress: number; last: Date | null }
  >();
  for (const p of progress) {
    const s = stats.get(p.userId) ?? { completed: 0, inProgress: 0, last: null };
    if (p.completedAt) s.completed += 1;
    else s.inProgress += 1;
    if (!s.last || p.updatedAt > s.last) s.last = p.updatedAt;
    stats.set(p.userId, s);
  }

  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  const totalCompleted = members.reduce(
    (sum, m) => sum + (stats.get(m.userId)?.completed ?? 0),
    0,
  );
  const activeLearners = members.filter(
    (m) => (stats.get(m.userId)?.completed ?? 0) + (stats.get(m.userId)?.inProgress ?? 0) > 0,
  ).length;

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("reports")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("reportsBody")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("statTeamSize")} value={members.length} />
        <Stat label={t("statActiveLearners")} value={activeLearners} />
        <Stat label={t("statCompletedLessons")} value={totalCompleted} />
      </section>

      {departments.length > 0 ? (
        <nav className="flex flex-wrap gap-2">
          <FilterPill href="/app/organization/reports" active={!deptFilter}>
            {t("allDepartments")}
          </FilterPill>
          {departments.map((d) => (
            <FilterPill
              key={d.id}
              href={`/app/organization/reports?dept=${d.id}`}
              active={deptFilter === d.id}
            >
              {d.name}
            </FilterPill>
          ))}
        </nav>
      ) : null}

      <section className="overflow-x-auto rounded-11 border border-border/60 bg-background">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("colUser")}</th>
              <th className="px-4 py-3">{t("colDepartment")}</th>
              <th className="px-4 py-3 text-right">{t("colCompleted")}</th>
              <th className="px-4 py-3 text-right">{t("colInProgress")}</th>
              <th className="px-4 py-3">{t("colLastActivity")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {members.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-muted-foreground"
                  colSpan={5}
                >
                  {t("noMembersYet")}
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const s = stats.get(m.userId);
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.user.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {s?.completed ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {s?.inProgress ?? 0}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s?.last ? s.last.toLocaleDateString(dateLocale) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-11 border border-border/60 bg-background p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-11 border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-surface-dark bg-surface-dark text-surface-dark-foreground"
          : "border-border bg-background text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </Link>
  );
}
