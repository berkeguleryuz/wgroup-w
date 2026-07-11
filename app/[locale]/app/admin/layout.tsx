import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/lib/access";
import { PanelNav, type PanelNavItem } from "@/components/app/PanelNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["admin"]);
  const t = await getTranslations("admin");

  const items: PanelNavItem[] = [
    { href: "/app/admin", label: t("dashboard"), exact: true },
    { href: "/app/admin/users", label: t("users") },
    { href: "/app/admin/companies", label: t("companies") },
    { href: "/app/admin/subscribers", label: t("subscribersHeading") },
    { href: "/app/admin/billing", label: t("billingHeading") },
    { href: "/app/admin/storage", label: t("storageHeading") },
    // Instructor management lives in the editor area; admins have access to
    // it, so surface a direct shortcut here.
    { href: "/app/editor/instructors", label: t("instructors") },
  ];

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <nav className="rounded-11 border border-border/60 bg-background p-4 h-fit">
        <p className="mb-3 px-2 text-xs uppercase tracking-wide text-muted-foreground">
          {t("kicker")}
        </p>
        <PanelNav items={items} />
      </nav>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
