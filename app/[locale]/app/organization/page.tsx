import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";

export const dynamic = "force-dynamic";

export default async function CorporateDashboard({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { membership }] = await Promise.all([
    getTranslations("organization"),
    requireOrgOwner(),
  ]);
  const orgId = membership.organizationId;

  const [memberCount, pendingInvites, profile] = await Promise.all([
    prisma.member.count({ where: { organizationId: orgId } }),
    prisma.invitation.count({
      where: { organizationId: orgId, status: "pending" },
    }),
    membership.organization.companyProfile,
  ]);

  const seatCount = profile?.seatCount ?? 0;
  const remaining = Math.max(0, seatCount - memberCount);
  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">
          {membership.organization.name}
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("statSeats")} value={seatCount} />
        <Stat label={t("statActive")} value={memberCount} />
        <Stat label={t("statRemaining")} value={remaining} />
        <Stat label={t("statPending")} value={pendingInvites} />
      </section>

      <section className="rounded-11 border border-border/60 bg-background p-6 md:p-8">
        <h2 className="font-display text-2xl">{t("subscription")}</h2>
        {profile ? (
          <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <Field label={t("subscription")} value={profile.subscriptionStatus} />
            <Field
              label={t("subscriptionStart")}
              value={
                profile.subscriptionStartedAt?.toLocaleDateString(dateLocale) ??
                "-"
              }
            />
            <Field
              label={t("subscriptionEnd")}
              value={
                profile.subscriptionEndsAt?.toLocaleDateString(dateLocale) ?? "-"
              }
            />
            <Field label={t("billingEmail")} value={profile.billingEmail} />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("subscriptionEmpty")}
          </p>
        )}
      </section>

      <Link
        href="/app/organization/invite"
        className="inline-block rounded-11 bg-surface-dark px-5 py-3 text-sm font-medium text-surface-dark-foreground"
      >
        {t("inviteCta")}
      </Link>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  );
}
