import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "verify" });
  return { title: `${t("heading")} · Businessflix` };
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("verify");

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <span className="font-accent text-xl text-muted-foreground">
        {t("kicker")}
      </span>
      <h1 className="mt-2 text-4xl">{t("heading")}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );
}
