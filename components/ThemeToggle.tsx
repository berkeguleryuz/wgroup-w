"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { useTheme } from "@/components/providers/ThemeProvider";

const emptySubscribe = () => () => {};

export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("themeToggle");
  // Theme is resolved on the client (stored / OS preference), so the icon can
  // differ from the server render. Hold the icon until mounted to keep the
  // button's footprint stable without risking a hydration mismatch.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? (isDark ? t("toLight") : t("toDark")) : t("label")}
      title={mounted ? (isDark ? t("toLight") : t("toDark")) : t("label")}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-11 bg-transparent transition-colors focus:outline-none focus-visible:ring-2 ${
        onDark
          ? "text-surface-dark-foreground hover:bg-white/10 focus-visible:ring-white/30"
          : "text-foreground hover:bg-muted focus-visible:ring-foreground/20"
      }`}
    >
      <span className="relative h-5 w-5">
        {mounted ? isDark ? <MoonIcon /> : <SunIcon /> : null}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
