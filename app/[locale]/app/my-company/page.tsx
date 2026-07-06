import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/access";
import { TitleCard } from "@/components/app/TitleCard";

export default async function MyCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ org?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, session, sp] = await Promise.all([
    getTranslations("myCompany"),
    requireSession(),
    searchParams,
  ]);
  const userId = session.user.id;

  // All corporate memberships (orgs with a company profile). The ?org param
  // only ever selects among the user's OWN memberships — a foreign org id
  // never resolves, so it can't expose another company's page.
  const memberships = await prisma.member.findMany({
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
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    redirect(localizedPath(locale, "/app"));
  }

  const membership =
    memberships.length === 1
      ? memberships[0]
      : memberships.find((m) => m.organizationId === sp?.org);

  // Multiple companies and no (valid) selection → pick one first.
  if (!membership) {
    return (
      <div className="space-y-8">
        <header>
          <span className="font-accent text-lg text-muted-foreground">
            {t("kicker")}
          </span>
          <h1 className="mt-1 text-3xl md:text-5xl">{t("chooseTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("chooseBody")}
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {memberships.map((m) => (
            <Link
              key={m.id}
              href={`/app/my-company?org=${m.organizationId}`}
              className="group flex items-center gap-4 rounded-11 border border-border bg-muted/40 p-5 transition-colors hover:border-foreground/25 hover:bg-muted"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-xl ${
                  m.organization.logo ? "" : "bg-primary text-primary-foreground"
                }`}
              >
                {m.organization.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.organization.logo}
                    alt={m.organization.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  m.organization.name.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-lg">
                  {m.organization.name}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(m.role === "owner" ? "roleOwner" : "roleMember")} ·{" "}
                  {t("teamSizeValue", { count: m.organization._count.members })}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const org = membership.organization;
  const profile = org.companyProfile!;
  const orgId = org.id;

  // Department-targeted titles only reach members of those departments;
  // untargeted titles reach the whole company. Owners see everything.
  const isOwner = membership.role === "owner";
  const exclusiveTitles = await prisma.title.findMany({
    where: {
      published: true,
      visibility: "ORG_ONLY",
      orgAudience: { some: { organizationId: orgId } },
      ...(isOwner
        ? {}
        : {
            OR: [
              { departmentAudience: { none: {} } },
              ...(membership.departmentId
                ? [
                    {
                      departmentAudience: {
                        some: { departmentId: membership.departmentId },
                      },
                    },
                  ]
                : []),
            ],
          }),
    },
    orderBy: { publishedAt: "desc" },
    take: 24,
    include: { category: true, episodes: { select: { durationSec: true } } },
  });

  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";
  const statusActive = profile.subscriptionStatus === "active";

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-accent text-lg text-muted-foreground">
            {t("kicker")}
          </span>
          <h1 className="mt-1 text-3xl md:text-5xl">{org.name}</h1>
          {memberships.length > 1 ? (
            <Link
              href="/app/my-company"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              <SwitchIcon />
              {t("switchCompany")}
            </Link>
          ) : null}
        </div>
        {isOwner ? (
          <Link
            href="/app/organization"
            className="inline-flex h-11 items-center gap-2 rounded-11 border border-surface-dark bg-surface-dark px-5 text-sm font-medium text-surface-dark-foreground transition-colors hover:bg-surface-dark/90 dark:border-border dark:bg-muted dark:text-foreground dark:hover:bg-muted/70"
          >
            <PanelIcon />
            {t("managePanel")}
          </Link>
        ) : null}
      </header>

      {/* Company band: identity + subscription on the left, membership stats
          on the right — one rich dark surface instead of four flat boxes. */}
      {/* In dark mode --surface-dark nearly matches the page background, so
          the band lifts onto the standard elevated card tone (--muted) with
          the shared --border token — same border color/weight as every other
          card in the app. */}
      <section className="rounded-11 border border-white/10 bg-surface-dark p-6 text-surface-dark-foreground md:p-8 dark:border-border dark:bg-muted/50">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-2xl ${
                org.logo ? "" : "bg-primary text-primary-foreground"
              }`}
            >
              {org.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logo}
                  alt={org.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                org.name.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{org.name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                <span
                  className={`rounded-11 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                    statusActive
                      ? "border-primary/30 bg-primary/15 text-primary"
                      : "border-white/15 bg-white/[0.06] text-surface-dark-foreground/70"
                  }`}
                >
                  {t(`statusLabel.${profile.subscriptionStatus}`)}
                </span>
                {profile.subscriptionEndsAt ? (
                  <span className="text-xs text-surface-dark-foreground/55">
                    {t("renewsOn", {
                      date: profile.subscriptionEndsAt.toLocaleDateString(
                        dateLocale,
                      ),
                    })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-10">
            <Stat
              icon={<RoleIcon />}
              label={t("yourRole")}
              value={t(membership.role === "owner" ? "roleOwner" : "roleMember")}
            />
            <Stat
              icon={<DepartmentIcon />}
              label={t("yourDepartment")}
              value={membership.department?.name ?? t("noDepartment")}
            />
            <Stat
              icon={<TeamIcon />}
              label={t("teamSize")}
              value={t("teamSizeValue", { count: org._count.members })}
            />
          </dl>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl md:text-3xl">
              {t("exclusiveTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("exclusiveBody")}
            </p>
          </div>
          {exclusiveTitles.length > 0 ? (
            <span className="rounded-11 bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {t("exclusiveCount", { count: exclusiveTitles.length })}
            </span>
          ) : null}
        </div>
        {exclusiveTitles.length === 0 ? (
          <div className="rounded-11 border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
            {t("noExclusive")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {exclusiveTitles.map((title, i) => (
              <TitleCard key={title.id} title={title} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-11 bg-white/[0.06] text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-surface-dark-foreground/50">
          {label}
        </dt>
        <dd className="mt-0.5 truncate font-display text-lg capitalize">
          {value}
        </dd>
      </div>
    </div>
  );
}

const iconProps = {
  viewBox: "0 0 20 20",
  className: "h-[18px] w-[18px]",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function SwitchIcon() {
  return (
    <svg {...iconProps} className="h-3.5 w-3.5">
      <path d="M13.5 4.5 16 7l-2.5 2.5M16 7H6.5A3.5 3.5 0 0 0 3 10.5" />
      <path d="M6.5 15.5 4 13l2.5-2.5M4 13h9.5a3.5 3.5 0 0 0 3.5-3.5" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg {...iconProps} className="h-4 w-4">
      <rect x="2.5" y="2.5" width="15" height="15" rx="2" />
      <path d="M7.5 2.5v15M2.5 7h5" />
    </svg>
  );
}

function RoleIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="6.5" r="3" />
      <path d="M4 17c.6-3 3-4.7 6-4.7s5.4 1.7 6 4.7" />
    </svg>
  );
}

function DepartmentIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6.8" y="2.5" width="6.4" height="4.4" rx="1.2" />
      <rect x="2" y="13.1" width="6.4" height="4.4" rx="1.2" />
      <rect x="11.6" y="13.1" width="6.4" height="4.4" rx="1.2" />
      <path d="M10 6.9v3M5.2 13.1v-1.7a1.5 1.5 0 0 1 1.5-1.5h6.6a1.5 1.5 0 0 1 1.5 1.5v1.7" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="7" cy="7" r="2.6" />
      <path d="M2.5 16.5c0-2.5 2-4.2 4.5-4.2s4.5 1.7 4.5 4.2" />
      <path d="M13 7.2a2.4 2.4 0 1 0 .1-4.7" />
      <path d="M14 12.6c2 .3 3.5 1.8 3.5 3.9" />
    </svg>
  );
}
