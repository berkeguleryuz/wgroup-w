import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";

export function CorporateCTA() {
  const t = useTranslations("corporateCTA");
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="rounded-11 border border-border bg-primary/60 p-10 md:p-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-end">
            <div>
              <span className="font-accent text-xl">{t("sectionTag")}</span>
              <h2 className="mt-2 text-3xl md:text-5xl font-display">
                {t("heading")}
              </h2>
              <p className="mt-5 max-w-md text-sm text-foreground/80">
                {t("description")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <Link href="/business">
                <Button size="lg" variant="dark">
                  {t("ctaPrimary")}
                </Button>
              </Link>
              <Link
                href="/business#how-it-works"
                className="text-sm underline-offset-4 hover:underline"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
