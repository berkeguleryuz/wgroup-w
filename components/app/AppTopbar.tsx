"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/Wordmark";

type Props = {
  userName: string;
  userEmail: string;
  role: string | null | undefined;
  orgOwner: boolean;
  corporateMember?: boolean;
};

export function AppTopbar({
  userName,
  userEmail,
  role,
  orgOwner,
  corporateMember,
}: Props) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  const isHome = pathname === "/app";
  const onDiscover = pathname === "/app/discover";
  const section = searchParams.get("section");

  const segs = pathname.split("/").filter(Boolean);
  const isTitleDetail =
    segs[0] === "app" && segs[1] === "watch" && segs.length === 3;
  const isPlayer =
    segs[0] === "app" && segs[1] === "watch" && segs.length === 4;
  const heroPage = isHome || isTitleDetail;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);
      // Hide while scrolling down past the bar, reveal on any upward scroll.
      // The 4px dead zone filters out trackpad jitter; near the top the bar
      // is always visible.
      if (y < 80) setHidden(false);
      else if (y > lastY.current + 4) setHidden(true);
      else if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Never leave the bar hidden after a navigation.
  useEffect(() => setHidden(false), [pathname]);

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
    // Talent Lab is hidden from the nav for now (page stays reachable at
    // /app/talent-lab); re-add the item when the feature launches.
  ];

  // Anyone who belongs to a company gets a quick link to their company space
  // (company-exclusive trainings + info) — owners too, alongside the org panel.
  if (corporateMember) {
    navItems.push({
      href: "/app/my-company",
      label: t("myCompany"),
      active: pathname === "/app/my-company",
    });
  }

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

  const overlay = heroPage && !scrolled;
  // Player page: transparent at the top so it merges with the page, then the
  // same solid light bar once scrolled.
  const transparentLight = isPlayer && !scrolled;

  // Theme-aware everywhere: the tokens flip with .dark, so the hero overlay
  // fades from the page background (cream in light, warm-dark in dark) instead
  // of hardcoded black — the hero top no longer starts pitch black in light.
  const headerBg = overlay
    ? "bg-gradient-to-b from-[#feffff]/95 via-[#feffff]/40 to-transparent dark:from-background/90 dark:via-background/40"
    : transparentLight
      ? "bg-transparent"
      : "bg-background border-b border-border/60 shadow-[0_8px_30px_-16px_rgba(16,13,8,0.35)]";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[transform,background-color,border-color,box-shadow] duration-300 ${headerBg} ${
        hidden && !open ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex h-16 w-full items-center gap-7 px-4 md:px-6 lg:px-8">
        <Wordmark href="/app" className="shrink-0" />

        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors ${
                item.active
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={onSearch}
          role="search"
          className="ml-auto hidden max-w-xs flex-1 md:block"
        >
          <input
            placeholder={tc("search")}
            aria-label={tc("search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-full rounded-11 border border-border bg-background px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-foreground/35 focus:outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <ThemeToggle />
          <LocaleSwitcher />

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-foreground transition-opacity hover:opacity-80"
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
