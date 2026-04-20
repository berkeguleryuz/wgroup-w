import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";

export function ClosingCTA() {
  const t = useTranslations("closing");
  return (
    <section className="relative overflow-hidden bg-surface-dark text-surface-dark-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 10%, #edddb9 0%, transparent 40%), radial-gradient(circle at 90% 80%, #5b4630 0%, transparent 40%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
        <span className="font-accent text-xl opacity-80">{t("kicker")}</span>
        <h2 className="mt-3 text-4xl md:text-7xl font-display leading-[1.05]">
          {t("headingLine1")}
          <br />
          {t("headingLine2")}
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-sm md:text-base opacity-85">
          {t("description")}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg" variant="primary">
              {t("ctaPrimary")}
            </Button>
          </Link>
          <Link href="/business">
            <Button
              size="lg"
              variant="ghost"
              className="text-surface-dark-foreground hover:bg-white/10"
            >
              {t("ctaSecondary")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
