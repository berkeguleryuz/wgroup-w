import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import { requireRole } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["admin"]);
  const t = await getTranslations("admin");

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <nav className="rounded-11 border border-border/60 bg-background p-4 h-fit">
        <p className="mb-3 px-2 text-xs uppercase tracking-wide text-muted-foreground">
          {t("kicker")}
        </p>
        <ul className="space-y-1">
          <NavItem href="/app/admin">{t("dashboard")}</NavItem>
          <NavItem href="/app/admin/users">{t("users")}</NavItem>
          <NavItem href="/app/admin/companies">{t("companies")}</NavItem>
          <NavItem href="/app/admin/subscribers">
            {t("subscribersHeading")}
          </NavItem>
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
