import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import { requireSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CorporateAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();
  const userId = session.user.id;

  const [t, ownerMembership] = await Promise.all([
    getTranslations("organization"),
    prisma.member.findFirst({
      where: { userId, role: "owner" },
      include: { organization: { include: { companyProfile: true } } },
    }),
  ]);
  if (!ownerMembership) redirect("/app");

  return (
    <div className="grid gap-8 md:grid-cols-[240px_1fr]">
      <nav className="rounded-11 border border-border/60 bg-background p-4 h-fit">
        <p className="mb-1 px-2 text-xs uppercase tracking-wide text-muted-foreground">
          {t("kicker")}
        </p>
        <p className="px-2 mb-3 text-sm font-semibold">
          {ownerMembership.organization.name}
        </p>
        <ul className="space-y-1">
          <NavItem href="/app/organization">{t("dashboard")}</NavItem>
          <NavItem href="/app/organization/members">{t("members")}</NavItem>
          <NavItem href="/app/organization/invite">{t("inviteHeading")}</NavItem>
        </ul>
      </nav>
      <section>{children}</section>
    </div>
  );
}

function NavItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="block rounded-11 px-3 py-2 text-sm hover:bg-muted">
        {children}
      </Link>
    </li>
  );
}
