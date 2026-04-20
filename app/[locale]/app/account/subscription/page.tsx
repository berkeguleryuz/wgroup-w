import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { requireSession, getEffectiveAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { SubscribeButton } from "./SubscribeButton";
import { ManagePortalButton } from "./ManagePortalButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "subscription" });
  return { title: `${t("heading")} · Businessflix` };
}

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  const user = session.user as typeof session.user & { role?: string | null };

  const [t, tp, access, individual] = await Promise.all([
    getTranslations("subscription"),
    getTranslations("subscription.plans"),
    getEffectiveAccess(user.id, user.role),
    prisma.individualSubscription.findUnique({ where: { userId: user.id } }),
  ]);

  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-4xl md:text-6xl">{t("heading")}</h1>
      </header>

      {access.reason === "corporate" ? (
        <section className="rounded-11 border border-border/60 bg-primary/50 p-6 md:p-8">
          <h2 className="font-display text-2xl">{t("corporateTitle")}</h2>
          <p className="mt-2 text-sm">
            {t("corporateBody", {
              billing: access.company?.billingEmail ?? "—",
            })}
          </p>
        </section>
      ) : null}

      {individual ? (
        <section className="rounded-11 border border-border/60 bg-background p-6 md:p-8">
          <h2 className="font-display text-2xl">{t("activeTitle")}</h2>
          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-3">
            <Field
              label={t("plan")}
              value={
                individual.plan === "yearly" ? tp("yearly") : tp("monthly")
              }
            />
            <Field label={t("status")} value={individual.status} />
            <Field
              label={t("periodEnd")}
              value={individual.currentPeriodEnd.toLocaleDateString(dateLocale)}
            />
          </dl>
          <div className="mt-6">
            <ManagePortalButton />
          </div>
        </section>
      ) : access.reason !== "corporate" ? (
        <section className="grid gap-4 md:grid-cols-2">
          <PlanOption
            name={tp("monthly")}
            price={tp("monthlyPrice")}
            bullets={[tp("monthlyB1"), tp("monthlyB2")]}
            plan="monthly"
          />
          <PlanOption
            name={tp("yearly")}
            price={tp("yearlyPrice")}
            bullets={[tp("yearlyB1"), tp("yearlyB2")]}
            plan="yearly"
            highlight
          />
        </section>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  );
}

function PlanOption({
  name,
  price,
  bullets,
  plan,
  highlight,
}: {
  name: string;
  price: string;
  bullets: string[];
  plan: "monthly" | "yearly";
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-11 p-6 border ${
        highlight
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border"
      }`}
    >
      <h3 className="font-display text-2xl">{name}</h3>
      <p className="mt-2 font-display text-3xl">{price}</p>
      <ul className="mt-4 space-y-1 text-sm opacity-85">
        {bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>
      <div className="mt-6">
        <SubscribeButton plan={plan} highlight={highlight} />
      </div>
    </div>
  );
}
