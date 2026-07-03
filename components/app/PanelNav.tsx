"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";

export type PanelNavItem = {
  href: string;
  label: string;
  /** Only highlight on an exact path match (panel root items). */
  exact?: boolean;
};

/**
 * Sidebar nav for the light-card panels (admin / editor). Highlights the
 * current section; sub-pages (e.g. /app/editor/titles/<id>) keep their parent
 * item active.
 */
export function PanelNav({ items }: { items: PanelNavItem[] }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block rounded-11 px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary font-medium text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
