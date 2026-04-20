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

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <span className="font-accent text-xl text-muted-foreground">
        {t("kicker")}
      </span>
      <h1 className="mt-2 text-4xl md:text-6xl">{t("heading")}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{t("description")}</p>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        <PlanCard
          name={tt("monthly")}
          price={tt("monthlyPrice")}
          period={tt("monthlyPeriod")}
          cta={t("monthlyCta")}
          href="/register"
          bullets={[t("monthlyB1"), t("monthlyB2"), t("monthlyB3"), t("monthlyB4")]}
        />
        <PlanCard
          name={tt("yearly")}
          price={tt("yearlyPrice")}
          period={tt("yearlyPeriod")}
          cta={t("yearlyCta")}
          href="/register"
          highlight
          bullets={[t("yearlyB1"), t("yearlyB2"), t("yearlyB3"), t("yearlyB4")]}
        />
        <PlanCard
          name={t("businessName")}
          price={t("businessPrice")}
          period={t("businessPeriod")}
          cta={t("businessCta")}
          href="/business"
          dark
          bullets={[t("businessB1"), t("businessB2"), t("businessB3"), t("businessB4")]}
        />
      </div>

      <div className="mt-16 text-sm text-muted-foreground">
        {t("disclaimer")}
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  bullets,
  cta,
  href,
  highlight,
  dark,
}: {
  name: string;
  price: string;
  period: string;
  bullets: string[];
  cta: string;
  href: "/register" | "/business";
  highlight?: boolean;
  dark?: boolean;
}) {
  const bg = dark
    ? "bg-surface-dark text-surface-dark-foreground border-surface-dark"
    : highlight
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-background text-foreground border-border";
  return (
    <div className={`rounded-11 border p-8 ${bg}`}>
      <h2 className="font-display text-3xl">{name}</h2>
      <p className="mt-3">
        <span className="font-display text-5xl">{price}</span>
        <span className="ml-1 text-sm opacity-70">{period}</span>
      </p>
      <ul className="mt-6 space-y-2 text-sm opacity-85">
        {bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>
      <Link href={href} className="mt-8 block">
        <Button
          className="w-full"
          variant={dark ? "primary" : "dark"}
          size="lg"
        >
          {cta}
        </Button>
      </Link>
    </div>
  );
}
