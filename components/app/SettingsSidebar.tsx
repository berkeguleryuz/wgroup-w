"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";

type Props = {
  userName: string;
  userEmail: string;
  roleLabel: string;
};

export function SettingsSidebar({ userName, userEmail, roleLabel }: Props) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  const items = [
    { href: "/app/account", label: t("settings"), icon: <GearIcon /> },
    {
      href: "/app/account/subscription",
      label: t("subscription"),
      icon: <CardIcon />,
    },
  ];

  async function onSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden md:block md:w-64 md:shrink-0">
      <div className="sticky top-24 flex h-[calc(100vh-8rem)] flex-col rounded-11 border border-white/10 bg-surface-dark p-4 text-surface-dark-foreground">
        <div className="px-2 pt-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-surface-dark-foreground/45">
            {t("settings")}
          </span>
        </div>

        <nav className="mt-3 flex flex-col gap-1.5">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
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
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/app"
          className="mt-1.5 flex items-center gap-3 rounded-11 px-3 py-2.5 text-sm text-surface-dark-foreground/60 transition-colors hover:bg-white/[0.06] hover:text-surface-dark-foreground"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-11 bg-white/[0.06]">
            <BackIcon />
          </span>
          <span className="font-medium">{t("home")}</span>
        </Link>

        <div className="mt-auto rounded-11 border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm text-primary-foreground">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-surface-dark-foreground/55">
                {userEmail}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="rounded-11 border border-primary/30 bg-primary/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              {roleLabel}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              aria-label={tc("logout")}
              className="flex h-8 w-8 items-center justify-center rounded-11 bg-white/[0.06] text-surface-dark-foreground/70 transition-colors hover:bg-white/[0.12] hover:text-surface-dark-foreground"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 1.5v2.4M10 16.1v2.4M3.5 3.5l1.7 1.7M14.8 14.8l1.7 1.7M1.5 10h2.4M16.1 10h2.4M3.5 16.5l1.7-1.7M14.8 5.2l1.7-1.7" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M2.5 8.5h15M5.5 12.5h3" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 10H4" />
      <path d="M8 5 3 10l5 5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3H8" />
      <path d="M13 14l4-4-4-4" />
      <path d="M17 10H8" />
    </svg>
  );
}
