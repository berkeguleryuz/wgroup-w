"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function AppTopbar({ userName }: { userName: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

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

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <form onSubmit={onSearch} className="flex-1 max-w-lg">
          <Input
            placeholder={t("common.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 items-center gap-2 rounded-11 border border-border bg-background px-3 text-sm hover:bg-muted"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xs">
                {userName.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden md:inline">{userName}</span>
            </button>

            {open ? (
              <div className="absolute right-0 mt-2 w-52 rounded-11 border border-border bg-background p-2 shadow-lg">
                <Link
                  href="/app/account"
                  className="block rounded-11 px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {t("nav.settings")}
                </Link>
                <Link
                  href="/app/account/subscription"
                  className="block rounded-11 px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {t("nav.subscription")}
                </Link>
                <div className="my-1 h-px bg-border" />
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={onSignOut}
                >
                  {t("common.logout")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
