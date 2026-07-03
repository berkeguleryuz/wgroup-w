import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/lib/access";
import { PanelNav, type PanelNavItem } from "@/components/app/PanelNav";

export default async function EditorLayout({ children }: { children: ReactNode }) {
  await requireRole(["platform_editor", "admin"]);
  const t = await getTranslations("editor");

  const items: PanelNavItem[] = [
    { href: "/app/editor", label: t("dashboard"), exact: true },
    { href: "/app/editor/categories", label: t("categories") },
    { href: "/app/editor/titles", label: t("titles") },
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
