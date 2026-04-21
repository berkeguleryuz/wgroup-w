import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricingPage" });
  return { title: `${t("kicker")} · Businessflix` };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricingPage");
  const tt = await getTranslations("pricingTeaser");

  const personalFeatures = [
    t("featureLibrary"),
    t("featureAllAccess"),
    t("feature4k"),
    t("featureDevices"),
    t("featureCancel"),
    t("featurePrioritySupport"),
  ];

  const businessFeatures = [
    t("businessIncludesPersonal"),
    t("businessB1"),
    t("businessB2"),
    t("businessB3"),
    t("businessB4"),
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="flex items-end justify-between gap-6 border-b border-foreground/15 pb-6">
        <div>
          <span className="font-accent text-xl text-muted-foreground">
            {t("kicker")}
          </span>
          <h1 className="mt-2 text-4xl md:text-6xl">{t("heading")}</h1>
        </div>
        <span className="hidden whitespace-nowrap font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground md:block">
          01 / {t("kicker")}
        </span>
      </div>
      <p className="mt-6 max-w-2xl text-muted-foreground">{t("description")}</p>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        <PlanCard
          name={tt("monthly")}
          cadenceLabel={t("cadenceMonthly")}
          price={tt("monthlyPrice")}
          period={tt("monthlyPeriod")}
          cta={t("monthlyCta")}
          href="/register"
          bullets={personalFeatures}
        />
        <PlanCard
          name={tt("yearly")}
          cadenceLabel={t("cadenceYearly")}
          price={tt("yearlyPrice")}
          period={tt("yearlyPeriod")}
          strikePrice={t("yearlyStrikePrice")}
          savings={t("yearlySavings")}
          badge={t("yearlyBadge")}
          cta={t("yearlyCta")}
          href="/register"
          highlight
          bullets={personalFeatures}
        />
        <PlanCard
          name={t("businessName")}
          cadenceLabel={t("cadenceBusiness")}
          price={t("businessPrice")}
          period={t("businessPeriod")}
          cta={t("businessCta")}
          href="/business"
          dark
          bullets={businessFeatures}
        />
      </div>

      <div className="mt-14 border-t border-foreground/10 pt-6 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
        {t("disclaimer")}
      </div>
    </div>
  );
}

function PlanCard({
  name,
  cadenceLabel,
  price,
  period,
  strikePrice,
  savings,
  badge,
  bullets,
  cta,
  href,
  highlight,
  dark,
}: {
  name: string;
  cadenceLabel: string;
  price: string;
  period: string;
  strikePrice?: string;
  savings?: string;
  badge?: string;
  bullets: string[];
  cta: string;
  href: "/register" | "/business";
  highlight?: boolean;
  dark?: boolean;
}) {
  const shell = dark
    ? "bg-surface-dark text-surface-dark-foreground border-surface-dark"
    : highlight
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-background text-foreground border-border";

  const dividerColor = dark
    ? "bg-white/10"
    : highlight
      ? "bg-primary-foreground/15"
      : "bg-foreground/10";

  const microColor = dark
    ? "text-surface-dark-foreground/60"
    : highlight
      ? "text-primary-foreground/70"
      : "text-muted-foreground";

  const checkColor = dark
    ? "text-primary"
    : highlight
      ? "text-primary-foreground"
      : "text-foreground";

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-11 border ${shell}`}
    >
      <div className="flex items-center justify-between border-b border-current/10 px-7 pt-6 pb-5 md:px-8">
        <span
          className={`font-mono text-[11px] uppercase tracking-[0.22em] ${microColor}`}
        >
          {cadenceLabel}
        </span>
        {highlight && badge ? (
          <span className="inline-flex items-center gap-1.5 rounded-11 border border-primary-foreground/20 bg-primary-foreground/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground">
            <SparkIcon />
            {badge}
          </span>
        ) : null}
      </div>

      <div className="px-7 pt-6 md:px-8">
        <h2 className="font-display text-3xl md:text-4xl">{name}</h2>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="font-display text-5xl leading-none md:text-6xl">
            {price}
          </span>
          <span className={`text-sm ${microColor}`}>{period}</span>
        </div>

        {strikePrice && savings ? (
          <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${microColor}`}>
            <span className="line-through">{strikePrice}</span>
            <span className={`rounded-11 border px-2 py-0.5 font-mono uppercase tracking-[0.18em] ${
              highlight
                ? "border-primary-foreground/25 text-primary-foreground"
                : "border-foreground/20 text-foreground"
            }`}>
              {savings}
            </span>
          </div>
        ) : (
          <div className="mt-3 h-[22px]" aria-hidden />
        )}
      </div>

      <div className={`mx-7 my-6 h-px md:mx-8 ${dividerColor}`} />

      <ul className="flex-1 space-y-3 px-7 pb-8 text-sm md:px-8">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <span className={`mt-0.5 ${checkColor}`}>
              <CheckIcon />
            </span>
            <span className={dark ? "opacity-85" : highlight ? "opacity-90" : "opacity-80"}>
              {b}
            </span>
          </li>
        ))}
      </ul>

      <div className="px-7 pb-7 md:px-8 md:pb-8">
        <Link href={href} className="block">
          <Button
            className="w-full"
            variant={dark ? "primary" : "dark"}
            size="lg"
          >
            {cta}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
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

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3 w-3"
      fill="currentColor"
      aria-hidden
    >
      <path d="M10 2 L11.8 7.2 L17 9 L11.8 10.8 L10 16 L8.2 10.8 L3 9 L8.2 7.2 Z" />
    </svg>
  );
}
