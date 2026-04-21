import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";

export function PricingTeaser() {
  const t = useTranslations("pricingTeaser");

  return (
    <section className="relative overflow-hidden rounded-11 border-b border-black/40 bg-surface-dark text-surface-dark-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 85% 15%, #edddb9 0%, transparent 60%), radial-gradient(50% 45% at 10% 90%, #5b4630 0%, transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-24 md:grid-cols-[1.05fr_1fr] md:gap-16 md:py-28 md:px-10 xl:px-16">
        <div className="flex flex-col">
          <span className="font-accent text-xl opacity-70">
            {t("sectionTag")}
          </span>
          <h2 className="mt-3 font-display text-4xl leading-[1.05] md:text-6xl">
            {t("headingLine1")}
            <br />
            <span className="text-primary">{t("headingLine2")}</span>
          </h2>
          <p className="mt-6 max-w-md text-sm opacity-75 md:text-base">
            {t("description")}
          </p>

          <ul className="mt-8 space-y-3 text-sm opacity-85">
            <HighlightRow>{t("highlight1")}</HighlightRow>
            <HighlightRow>{t("highlight2")}</HighlightRow>
            <HighlightRow>{t("highlight3")}</HighlightRow>
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/pricing">
              <Button size="lg" variant="primary" className="group">
                {t("ctaPlans")}
                <ArrowIcon />
              </Button>
            </Link>
            <Link href="/business">
              <Button
                size="lg"
                variant="ghost"
                className="border border-white/15 bg-white/5 text-surface-dark-foreground hover:bg-white/10"
              >
                {t("ctaSales")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 self-center">
          <PlanCard
            name={t("monthly")}
            price={t("monthlyPrice")}
            period={t("monthlyPeriod")}
            bullets={[t("bullet1"), t("bullet2"), t("bullet3")]}
          />
          <PlanCard
            name={t("yearly")}
            price={t("yearlyPrice")}
            period={t("yearlyPeriod")}
            strikePrice={t("yearlyStrikePrice")}
            savings={t("yearlySavings")}
            highlight
            badge={t("yearlyBadge")}
            bullets={[t("bullet1"), t("bullet2"), t("bullet3")]}
          />
        </div>
      </div>
    </section>
  );
}

function HighlightRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-11 bg-primary/15 text-primary">
        <CheckIcon />
      </span>
      {children}
    </li>
  );
}

function PlanCard({
  name,
  price,
  period,
  bullets,
  highlight,
  badge,
  strikePrice,
  savings,
}: {
  name: string;
  price: string;
  period: string;
  bullets: string[];
  highlight?: boolean;
  badge?: string;
  strikePrice?: string;
  savings?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-11 border p-7 transition-colors md:p-8 ${
        highlight
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
      }`}
    >
      {highlight && badge ? (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-11 border border-primary-foreground/20 bg-primary-foreground/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground">
          <SparkIcon />
          {badge}
        </span>
      ) : null}

      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-2xl md:text-3xl">{name}</h3>
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-5xl leading-none md:text-6xl">
          {price}
        </span>
        <span className={`text-sm ${highlight ? "opacity-70" : "opacity-60"}`}>
          {period}
        </span>
      </div>

      {strikePrice && savings ? (
        <div
          className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${
            highlight ? "text-primary-foreground/75" : "text-white/60"
          }`}
        >
          <span className="line-through">{strikePrice}</span>
          <span
            className={`rounded-11 border px-2 py-0.5 font-mono uppercase tracking-[0.18em] ${
              highlight
                ? "border-primary-foreground/25 text-primary-foreground"
                : "border-white/20 text-white/80"
            }`}
          >
            {savings}
          </span>
        </div>
      ) : null}

      <div
        className={`my-6 h-px w-full ${
          highlight ? "bg-primary-foreground/15" : "bg-white/10"
        }`}
      />

      <ul className="space-y-2.5 text-sm">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2.5">
            <CheckIcon
              className={highlight ? "text-primary-foreground" : "text-primary"}
            />
            <span className={highlight ? "opacity-90" : "opacity-80"}>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10.5 L8.5 15 L16 6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <span
      aria-hidden
      className="inline-flex transition-transform duration-200 group-hover:translate-x-0.5"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 10 H16" />
        <path d="M12 5 L17 10 L12 15" />
      </svg>
    </span>
  );
}

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M10 2 L11.8 7.2 L17 9 L11.8 10.8 L10 16 L8.2 10.8 L3 9 L8.2 7.2 Z" />
    </svg>
  );
}
