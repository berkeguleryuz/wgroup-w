import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";

export function MarketingFooter() {
  const t = useTranslations();
  return (
    <footer className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl"
          >
            {t("common.appName").toLowerCase()}
          </Link>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("footer.explore")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/#library">{t("nav.library")}</Link></li>
            <li><Link href="/pricing">{t("nav.pricing")}</Link></li>
            <li><Link href="/business">{t("nav.business")}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("footer.account")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/login">{t("common.login")}</Link></li>
            <li><Link href="/register">{t("common.getStarted")}</Link></li>
            <li><Link href="/business">{t("footer.talkToSales")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {t("common.appName").toLowerCase()}
      </div>
    </footer>
  );
}
