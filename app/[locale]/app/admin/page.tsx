import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, users, companies, pendingLeads, activeSubs, publishedTitles] =
    await Promise.all([
      getTranslations("admin"),
      prisma.user.count(),
      prisma.companyProfile.count({ where: { subscriptionStatus: "active" } }),
      prisma.corporateLead.count({ where: { status: "new" } }),
      prisma.individualSubscription.count({ where: { status: "active" } }),
      prisma.title.count({ where: { published: true } }),
    ]);

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("dashboard")}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={t("users")} value={users} />
        <Stat label={t("activeIndividual")} value={activeSubs} />
        <Stat label={t("companies")} value={companies} />
        <Stat
          label={t("newRequests")}
          value={pendingLeads}
          href="/app/admin/companies"
        />
        <Stat label={t("publishedContent")} value={publishedTitles} />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const body = (
    <div className="rounded-11 border border-border/60 bg-background p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
