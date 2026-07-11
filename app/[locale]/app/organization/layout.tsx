import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { requireOrgOwner } from "@/lib/corporate";
import { OrgSidebar, type OrgSidebarItem } from "@/components/app/OrgSidebar";

export default async function CorporateAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [t, { membership: ownerMembership }] = await Promise.all([
    getTranslations("organization"),
    requireOrgOwner(),
  ]);

  const items: OrgSidebarItem[] = [
    { href: "/app/organization", label: t("dashboard"), icon: "dashboard" },
    { href: "/app/organization/members", label: t("members"), icon: "members" },
    ...(ownerMembership.organization.companyProfile?.selfServeContent
      ? [
          {
            href: "/app/organization/content",
            label: t("contentStudio"),
            icon: "content",
          } as OrgSidebarItem,
        ]
      : []),
    {
      href: "/app/organization/catalog",
      label: t("catalogHeading"),
      icon: "content",
    },
    {
      href: "/app/organization/departments",
      label: t("departments"),
      icon: "departments",
    },
    { href: "/app/organization/reports", label: t("reports"), icon: "reports" },
    {
      href: "/app/organization/billing",
      label: t("billingTitle"),
      icon: "billing",
    },
    {
      href: "/app/organization/invite",
      label: t("inviteHeading"),
      icon: "invite",
    },
  ];

  return (
    <div className="grid gap-8 md:grid-cols-[256px_1fr]">
      <OrgSidebar
        kicker={t("kicker")}
        orgName={ownerMembership.organization.name}
        items={items}
      />
      <section className="min-w-0">{children}</section>
    </div>
  );
}
