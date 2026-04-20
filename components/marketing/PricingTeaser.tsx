import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";

export function PricingTeaser() {
  const t = useTranslations("pricingTeaser");

  return (
    <section className="border-b border-border/60 bg-surface-dark text-surface-dark-foreground">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <span className="font-accent text-xl opacity-70">
              {t("sectionTag")}
            </span>
            <h2 className="mt-2 text-3xl md:text-5xl font-display">
              {t("headingLine1")}
              <br />
              {t("headingLine2")}
            </h2>
            <p className="mt-5 max-w-md text-sm opacity-80">
              {t("description")}
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/pricing">
                <Button size="lg" variant="primary">
                  {t("ctaPlans")}
                </Button>
              </Link>
              <Link href="/business">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-surface-dark-foreground hover:bg-white/10"
                >
                  {t("ctaSales")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <PlanCard
              name={t("monthly")}
              price={t("monthlyPrice")}
              period={t("monthlyPeriod")}
              bullets={[t("monthlyB1"), t("monthlyB2"), t("monthlyB3")]}
            />
            <PlanCard
              name={t("yearly")}
              price={t("yearlyPrice")}
              period={t("yearlyPeriod")}
              highlight
              bullets={[t("yearlyB1"), t("yearlyB2"), t("yearlyB3")]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  period,
  bullets,
  highlight,
}: {
  name: string;
  price: string;
  period: string;
  bullets: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-11 p-6 border ${
        highlight
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-2xl">{name}</h3>
        <p>
          <span className="font-display text-3xl">{price}</span>
          <span className="text-sm opacity-70">{period}</span>
        </p>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm opacity-80">
        {bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>
    </div>
  );
}
