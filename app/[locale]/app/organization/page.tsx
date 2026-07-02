import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";
import {
  CorporateSubscribeButton,
  CorporateManageButton,
  CorporateUpgradeButton,
} from "./billing/BillingButtons";

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
  const unlimitedSeats = profile?.plan === "corp_large";
  const remaining = Math.max(0, seatCount - memberCount);
  const hasStripeSub =
    !!profile?.stripeSubscriptionId &&
    (profile.subscriptionStatus === "active" ||
      profile.subscriptionStatus === "grace");
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
        <Stat
          label={t("statSeats")}
          value={unlimitedSeats ? t("seatsUnlimited") : seatCount}
        />
        <Stat label={t("statActive")} value={memberCount} />
        <Stat
          label={t("statRemaining")}
          value={unlimitedSeats ? t("seatsUnlimited") : remaining}
        />
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

      <section className="rounded-11 border border-border/60 bg-background p-6 md:p-8">
        <h2 className="font-display text-2xl">{t("billingTitle")}</h2>
        {hasStripeSub ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("currentPlan")}:{" "}
              </span>
              <span className="font-medium">
                {profile?.plan === "corp_large"
                  ? t("pkgLargeName")
                  : t("pkgSmallName")}
              </span>
            </p>
            <div className="flex flex-wrap items-start gap-3">
              <CorporateManageButton />
              {profile?.plan === "corp_small" ? <CorporateUpgradeButton /> : null}
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("billingBody")}
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <PlanCard
                name={t("pkgSmallName")}
                seats={t("pkgSmallSeats")}
                price="€399,95"
                perYear={t("perYear")}
                action={<CorporateSubscribeButton pkg="small" />}
              />
              <PlanCard
                name={t("pkgLargeName")}
                seats={t("pkgLargeSeats")}
                price="€749,95"
                perYear={t("perYear")}
                action={<CorporateSubscribeButton pkg="large" />}
              />
            </div>
          </>
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

function PlanCard({
  name,
  seats,
  price,
  perYear,
  action,
}: {
  name: string;
  seats: string;
  price: string;
  perYear: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-11 border border-border/60 bg-muted/40 p-6">
      <div>
        <h3 className="font-display text-xl">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{seats}</p>
      </div>
      <p className="font-display text-3xl">
        {price}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          {perYear}
        </span>
      </p>
      {action}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
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
