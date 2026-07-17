"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { routing } from "@/lib/i18n/routing";
import {
  activateBusyflixLoading,
  reloadAfterBusyflixLoadingPaint,
} from "@/lib/busyflix-loading";
import { Flag } from "@/components/Flags";

// Full document reload on purpose: a soft locale switch re-renders the root
// layout in place, which remounts the inline theme-init <script> and triggers
// React's dev warning ("Encountered a script tag while rendering"). With
// localePrefix "never" the locale lives in the NEXT_LOCALE cookie, so set it
// directly and reload. The theme script re-runs natively and the correct
// theme comes from localStorage.
function applyLocaleAndReload(next: string) {
  activateBusyflixLoading("locale");
  document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
  reloadAfterBusyflixLoadingPaint();
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("localeSwitcher");
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const change = (next: string) => {
    if (next === locale) {
      setOpen(false);
      return;
    }
    setOpen(false);
    setIsPending(true);
    applyLocaleAndReload(next);
  };

  return (
    <div ref={wrapperRef} className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={t("label")}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-11 bg-transparent transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:opacity-50"
      >
        <Flag locale={locale} className="h-4 w-6 rounded-[5px]" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 flex min-w-[10rem] flex-col overflow-hidden rounded-11 border border-border bg-background py-1 shadow-[0_10px_40px_-20px_rgb(var(--shadow-rgb)/0.35)]"
        >
          {routing.locales.map((l) => {
            const active = l === locale;
            return (
              <li key={l} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => change(l)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                    active ? "font-semibold" : ""
                  }`}
                >
                  <Flag locale={l} className="h-4 w-6 shrink-0 rounded-[5px]" />
                  <span>{t(l)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
