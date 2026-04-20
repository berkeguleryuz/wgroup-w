import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function MarketingHeader() {
  const t = useTranslations();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-40 px-4 md:top-6 md:px-6">
      <div className="pointer-events-auto mx-auto flex h-12 max-w-7xl items-center justify-between rounded-11 border border-border/60 bg-background/95 pl-5 pr-1.5 shadow-[0_10px_40px_-20px_rgba(16,13,8,0.25)] backdrop-blur md:h-[50px] md:pl-6 md:pr-2">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl"
        >
          {t("common.appName").toLowerCase()}
        </Link>

        <nav className="hidden items-center gap-8 md:flex lg:gap-10">
          <Link
            href="/#library"
            className="text-sm font-semibold text-foreground transition-colors hover:text-foreground/70"
          >
            {t("nav.library")}
          </Link>
          <Link
            href="/business"
            className="text-sm font-semibold text-foreground transition-colors hover:text-foreground/70"
          >
            {t("nav.business")}
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-semibold text-foreground transition-colors hover:text-foreground/70"
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href="/#faq"
            className="text-sm font-semibold text-foreground transition-colors hover:text-foreground/70"
          >
            {t("nav.faq")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:block">
            <LocaleSwitcher />
          </div>
          <Link
            href="/login"
            className="hidden h-9 items-center rounded-11 px-3 text-sm font-semibold text-foreground transition-colors hover:text-foreground/70 md:inline-flex"
          >
            {t("common.login")}
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-11 bg-surface-dark px-4 text-sm font-semibold text-surface-dark-foreground transition-colors hover:bg-surface-dark/90"
          >
            {t("common.getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}
