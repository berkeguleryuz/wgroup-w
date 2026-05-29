"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

type Props = {
  userName: string;
  userEmail: string;
  role: string | null | undefined;
  orgOwner: boolean;
};

export function AppTopbar({ userName, userEmail, role, orgOwner }: Props) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const isHome = pathname === "/app";
  const onDiscover = pathname === "/app/discover";
  const section = searchParams.get("section");

  const segs = pathname.split("/").filter(Boolean);
  const isTitleDetail =
    segs[0] === "app" && segs[1] === "watch" && segs.length === 3;
  const heroPage = isHome || isTitleDetail;

  useEffect(() => {
    if (!heroPage) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [heroPage]);

  const navItems = [
    { href: "/app", label: t("home"), active: isHome },
    {
      href: "/app/discover?section=SERIES",
      label: t("series"),
      active: onDiscover && section === "SERIES",
    },
    {
      href: "/app/discover?section=MOVIE",
      label: t("films"),
      active: onDiscover && section === "MOVIE",
    },
    {
      href: "/app/discover?section=TALENT",
      label: t("talentManagement"),
      active: onDiscover && section === "TALENT",
    },
    { href: "/app/discover", label: t("discover"), active: onDiscover && !section },
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

  async function onSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/app/discover?q=${encodeURIComponent(q.trim())}`);
  }

  const dark = heroPage;
  const overlay = heroPage && !scrolled;

  const headerBg = overlay
    ? "bg-gradient-to-b from-black/80 via-black/35 to-transparent"
    : dark
      ? "bg-surface-dark shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]"
      : "bg-background border-b border-border/60 shadow-[0_8px_30px_-16px_rgba(16,13,8,0.35)]";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${headerBg}`}
    >
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-7 px-6 md:px-10">
        <Link href="/app" className="flex shrink-0 items-center">
          <span
            className={`font-display text-xl font-semibold tracking-tight ${
              dark ? "text-surface-dark-foreground" : "text-foreground"
            }`}
          >
            {tc("appName").toLowerCase()}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors ${
                dark
                  ? item.active
                    ? "font-semibold text-surface-dark-foreground"
                    : "text-surface-dark-foreground/65 hover:text-surface-dark-foreground"
                  : item.active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden max-w-xs flex-1 md:block">
          <input
            placeholder={tc("search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`h-9 w-full rounded-11 border px-3 text-sm transition-colors focus:outline-none ${
              dark
                ? "border-white/15 bg-white/10 text-surface-dark-foreground placeholder:text-surface-dark-foreground/45 focus:border-white/35"
                : "border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-foreground/35"
            }`}
          />
        </form>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <LocaleSwitcher />

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={`flex items-center gap-2 text-sm transition-opacity hover:opacity-80 ${
                dark ? "text-surface-dark-foreground" : "text-foreground"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-xs text-primary-foreground">
                {userName.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-[120px] truncate md:inline">
                {userName}
              </span>
              <svg
                viewBox="0 0 20 20"
                className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 7.5 L10 12.5 L15 7.5" />
              </svg>
            </button>

            {open ? (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-11 border border-border bg-background text-foreground shadow-[0_20px_50px_-20px_rgba(16,13,8,0.35)]">
                  <div className="border-b border-border/60 px-4 py-3">
                    <p className="truncate text-sm font-medium">{userName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>

                  {staffItems.length > 0 ? (
                    <div className="border-b border-border/60 py-1.5">
                      {staffItems.map((s) => (
                        <Link
                          key={s.href}
                          href={s.href}
                          className="block px-4 py-2 text-sm hover:bg-muted"
                          onClick={() => setOpen(false)}
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  <div className="py-1.5">
                    <Link
                      href="/app/account"
                      className="block px-4 py-2 text-sm hover:bg-muted"
                      onClick={() => setOpen(false)}
                    >
                      {t("settings")}
                    </Link>
                    <Link
                      href="/app/account/subscription"
                      className="block px-4 py-2 text-sm hover:bg-muted"
                      onClick={() => setOpen(false)}
                    >
                      {t("subscription")}
                    </Link>
                  </div>

                  <div className="border-t border-border/60 py-1.5">
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-muted"
                    >
                      {tc("logout")}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
