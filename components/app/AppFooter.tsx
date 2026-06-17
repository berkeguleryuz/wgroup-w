import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { Wordmark } from "@/components/Wordmark";

export function AppFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto grid max-w-[1800px] gap-10 px-6 py-12 md:grid-cols-4 md:px-10 xl:px-16">
        <div className="md:col-span-2">
          <Wordmark href="/app" />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("footer.explore")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/app/discover?section=SERIES"
                className="transition-colors hover:text-foreground"
              >
                {t("nav.series")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/discover?section=MOVIE"
                className="transition-colors hover:text-foreground"
              >
                {t("nav.films")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/discover?section=TALENT"
                className="transition-colors hover:text-foreground"
              >
                {t("nav.talentManagement")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/discover"
                className="transition-colors hover:text-foreground"
              >
                {t("nav.discover")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("footer.account")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/app/account"
                className="transition-colors hover:text-foreground"
              >
                {t("nav.settings")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/account/subscription"
                className="transition-colors hover:text-foreground"
              >
                {t("nav.subscription")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 px-6 py-4 text-center text-xs text-muted-foreground">
        © {year} {t("common.appName").toLowerCase()}
      </div>
    </footer>
  );
}
