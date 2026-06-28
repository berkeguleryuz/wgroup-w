"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { useTheme } from "@/components/providers/ThemeProvider";
import { ThemeToggleIcon } from "@/components/icons/ThemeToggleIcon";

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
        {mounted ? <ThemeToggleIcon isDark={isDark} /> : null}
      </span>
    </button>
  );
}
