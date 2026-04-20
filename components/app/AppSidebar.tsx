import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";

type SidebarProps = {
  role: string | null | undefined;
  orgOwner: boolean;
};

export function AppSidebar({ role, orgOwner }: SidebarProps) {
  const t = useTranslations("nav");
  const ta = useTranslations("common");

  const mainItems = [
    { href: "/app", label: t("home") },
    { href: "/app/discover", label: t("discover") },
  ];
  const categoryItems = [
    { href: "/app/discover?section=SERIES", label: t("series") },
    { href: "/app/discover?section=MOVIE", label: t("films") },
    { href: "/app/discover?section=TALENT", label: t("talentManagement") },
  ];

  const staffItems: { href: string; label: string }[] = [];
  if (role === "platform_editor" || role === "admin") {
    staffItems.push({ href: "/app/editor", label: t("editorPanel") });
  }
  if (role === "admin") {
    staffItems.push({ href: "/app/admin", label: t("adminPanel") });
  }
  if (orgOwner) {
    staffItems.push({ href: "/app/organization", label: t("organizationPanel") });
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-background px-4 py-6 md:block">
      <Link href="/app" className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-11 bg-surface-dark text-surface-dark-foreground font-display text-lg">
          B
        </span>
        <span className="font-display text-lg font-semibold">
          {ta("appName")}
        </span>
      </Link>

      <nav className="space-y-8">
        <SidebarGroup title={t("home")} items={mainItems} />
        <SidebarGroup title={t("categories")} items={categoryItems} />

        {staffItems.length > 0 ? (
          <SidebarGroup title={t("adminPanel")} items={staffItems} />
        ) : null}

        <div>
          <p className="px-2 text-xs uppercase tracking-wide text-muted-foreground">
            {t("settings")}
          </p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/app/account"
                className="block rounded-11 px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                {t("settings")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/account/subscription"
                className="block rounded-11 px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                {t("subscription")}
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
}

function SidebarGroup({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="px-2 text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="block rounded-11 px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
