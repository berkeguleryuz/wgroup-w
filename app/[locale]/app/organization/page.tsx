import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";
import { getOrgStorageUsage, formatBytes } from "@/lib/storage-usage";
import { cleanupStorageRefs } from "@/lib/storage-cleanup";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";

async function updateOrgLogo(formData: FormData) {
  "use server";
  const { membership } = await requireOrgOwner();
  const logo = String(formData.get("logo") || "").trim() || null;

  const before = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: { logo: true },
  });
  await prisma.organization.update({
    where: { id: membership.organizationId },
    data: { logo },
  });
  if (before && before.logo !== logo) {
    await cleanupStorageRefs([before.logo]);
  }
  // The logo also renders in cached layout segments (org sidebar, my-company
  // band) — invalidate the layout tree so it shows up without a hard refresh.
  revalidatePath("/", "layout");
  const locale = await getLocale();
  redirect(localizedPath(locale, "/app/organization?toast=saved"));
}

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

  const [memberCount, pendingInvites, profile, storageUsage] =
    await Promise.all([
      prisma.member.count({ where: { organizationId: orgId } }),
      prisma.invitation.count({
        where: { organizationId: orgId, status: "pending" },
      }),
      membership.organization.companyProfile,
      getOrgStorageUsage(orgId),
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <Stat label={t("statStorage")} value={formatBytes(storageUsage)} />
      </section>

      <section className="rounded-11 border border-border/60 bg-background p-6 md:p-8">
        <h2 className="font-display text-2xl">{t("companyLogo")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("companyLogoBody")}
        </p>
        <form
          action={updateOrgLogo}
          className="mt-4 flex flex-wrap items-end gap-4"
        >
          <div className="min-w-[280px] flex-1">
            <Label>{t("companyLogo")}</Label>
            <ImageUpload
              name="logo"
              defaultValue={membership.organization.logo ?? ""}
              shape="avatar"
              endpoint="/api/account/avatar-upload"
            />
          </div>
          <Button type="submit" variant="secondary">
            {t("saveCompanyLogo")}
          </Button>
        </form>
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

      <div className="flex flex-wrap gap-3">
        <Link
          href="/app/organization/billing"
          className="inline-block rounded-11 border border-border bg-background px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          {hasStripeSub ? t("manageBilling") : t("billingTitle")} →
        </Link>
        <Link
          href="/app/organization/invite"
          className="inline-block rounded-11 bg-surface-dark px-5 py-3 text-sm font-medium text-surface-dark-foreground"
        >
          {t("inviteCta")}
        </Link>
      </div>
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
