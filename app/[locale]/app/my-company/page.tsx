import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/access";
import { TitleCard } from "@/components/app/TitleCard";

export default async function MyCompanyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, session] = await Promise.all([
    getTranslations("myCompany"),
    requireSession(),
  ]);
  const userId = session.user.id;

  // The user's corporate membership (org with a company profile).
  const membership = await prisma.member.findFirst({
    where: { organization: { companyProfile: { isNot: null } }, userId },
    include: {
      department: { select: { name: true } },
      organization: {
        include: {
          companyProfile: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!membership || !membership.organization.companyProfile) {
    redirect(localizedPath(locale, "/app"));
  }

  const org = membership.organization;
  const profile = org.companyProfile!;
  const orgId = org.id;

  const exclusiveTitles = await prisma.title.findMany({
    where: {
      published: true,
      visibility: "ORG_ONLY",
      orgAudience: { some: { organizationId: orgId } },
    },
    orderBy: { publishedAt: "desc" },
    take: 24,
    include: { category: true, episodes: { select: { durationSec: true } } },
  });

  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{org.name}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label={t("yourRole")} value={t(membership.role === "owner" ? "roleOwner" : "roleMember")} />
        <Info
          label={t("yourDepartment")}
          value={membership.department?.name ?? t("noDepartment")}
        />
        <Info label={t("teamSize")} value={String(org._count.members)} />
        <Info
          label={t("status")}
          value={t(`statusLabel.${profile.subscriptionStatus}`)}
        />
      </section>

      {profile.subscriptionEndsAt ? (
        <p className="text-sm text-muted-foreground">
          {t("renewsOn", {
            date: profile.subscriptionEndsAt.toLocaleDateString(dateLocale),
          })}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl">
            {t("exclusiveTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("exclusiveBody")}
          </p>
        </div>
        {exclusiveTitles.length === 0 ? (
          <div className="rounded-11 border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
            {t("noExclusive")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {exclusiveTitles.map((title, i) => (
              <TitleCard key={title.id} title={title} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-11 border border-border/60 bg-background p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-xl capitalize">{value}</p>
    </div>
  );
}
