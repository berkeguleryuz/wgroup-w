import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import { requireRole } from "@/lib/access";

export default async function EditorLayout({ children }: { children: ReactNode }) {
  await requireRole(["platform_editor", "admin"]);
  const t = await getTranslations("editor");

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <nav className="rounded-11 border border-border/60 bg-background p-4 h-fit">
        <p className="mb-3 px-2 text-xs uppercase tracking-wide text-muted-foreground">
          {t("kicker")}
        </p>
        <ul className="space-y-1">
          <NavItem href="/app/editor">{t("dashboard")}</NavItem>
          <NavItem href="/app/editor/categories">{t("categories")}</NavItem>
          <NavItem href="/app/editor/titles">{t("titles")}</NavItem>
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
