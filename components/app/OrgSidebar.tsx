"use client";

import type { ReactNode } from "react";

import { Link, usePathname } from "@/lib/i18n/navigation";

export type OrgSidebarItem = {
  href: string;
  label: string;
  icon: "dashboard" | "members" | "departments" | "reports" | "invite" | "content";
};

type Props = {
  kicker: string;
  orgName: string;
  items: OrgSidebarItem[];
};

const ICONS: Record<OrgSidebarItem["icon"], ReactNode> = {
  dashboard: <DashboardIcon />,
  members: <MembersIcon />,
  departments: <DepartmentsIcon />,
  reports: <ReportsIcon />,
  invite: <InviteIcon />,
  content: <ContentIcon />,
};

export function OrgSidebar({ kicker, orgName, items }: Props) {
  const pathname = usePathname();

  return (
    <nav className="h-fit rounded-11 border border-white/10 bg-surface-dark p-4 text-surface-dark-foreground md:sticky md:top-24">
      <div className="px-2 pt-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-surface-dark-foreground/45">
          {kicker}
        </span>
        <p className="mt-1 truncate text-sm font-semibold">{orgName}</p>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/app/organization" &&
              pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-11 px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-surface-dark-foreground/75 hover:bg-white/[0.06] hover:text-surface-dark-foreground"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-11 ${
                    active ? "bg-primary-foreground/15" : "bg-white/[0.06]"
                  }`}
                >
                  {ICONS[item.icon]}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const iconProps = {
  viewBox: "0 0 20 20",
  className: "h-4 w-4",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function DashboardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="2.5" width="6.2" height="6.2" rx="1.5" />
      <rect x="11.3" y="2.5" width="6.2" height="6.2" rx="1.5" />
      <rect x="2.5" y="11.3" width="6.2" height="6.2" rx="1.5" />
      <rect x="11.3" y="11.3" width="6.2" height="6.2" rx="1.5" />
    </svg>
  );
}

function MembersIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="7" cy="7" r="2.6" />
      <path d="M2.5 16.5c0-2.5 2-4.2 4.5-4.2s4.5 1.7 4.5 4.2" />
      <path d="M13 7.2a2.4 2.4 0 1 0 .1-4.7" />
      <path d="M14 12.6c2 .3 3.5 1.8 3.5 3.9" />
    </svg>
  );
}

function DepartmentsIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6.8" y="2.5" width="6.4" height="4.4" rx="1.2" />
      <rect x="2" y="13.1" width="6.4" height="4.4" rx="1.2" />
      <rect x="11.6" y="13.1" width="6.4" height="4.4" rx="1.2" />
      <path d="M10 6.9v3M5.2 13.1v-1.7a1.5 1.5 0 0 1 1.5-1.5h6.6a1.5 1.5 0 0 1 1.5 1.5v1.7" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 17V3" />
      <path d="M3 17h14" />
      <path d="M6.5 13.5v-4M10.5 13.5V6M14.5 13.5V9" />
    </svg>
  );
}

function ContentIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <path d="M2.5 7h15M6 3.5 8 7M10.5 3.5l2 3.5" />
      <path d="m8.6 10.2 3.4 2-3.4 2z" />
    </svg>
  );
}

function InviteIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="m3.5 6 6.5 5 6.5-5" />
    </svg>
  );
}
