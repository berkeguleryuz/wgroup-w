import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { requireSession } from "@/lib/access";
import { Button } from "@/components/ui/Button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: `${t("heading")} · Businessflix` };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc, session] = await Promise.all([
    getTranslations("account"),
    getTranslations("common"),
    requireSession(),
  ]);
  const user = session.user as typeof session.user & { role?: string | null };

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-4xl md:text-6xl">{t("heading")}</h1>
      </header>

      <section className="rounded-11 border border-border/60 bg-background p-6 md:p-8">
        <h2 className="font-display text-2xl">{t("profile")}</h2>
        <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
          <Field label={t("name")} value={user.name || "-"} />
          <Field label={t("email")} value={user.email} />
          <Field label={t("role")} value={user.role || "individual"} />
          <Field
            label={t("verified")}
            value={user.emailVerified ? tc("yes") : tc("no")}
          />
        </dl>
      </section>

      <section className="rounded-11 border border-border/60 bg-background p-6 md:p-8">
        <h2 className="font-display text-2xl">{t("subscription")}</h2>
        <Link href="/app/account/subscription" className="mt-4 inline-block">
          <Button variant="dark">{t("manage")}</Button>
        </Link>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
