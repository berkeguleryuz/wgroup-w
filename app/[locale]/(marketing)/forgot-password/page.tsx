import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forgotPassword" });
  return { title: `${t("heading")} · Businessflix` };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forgotPassword");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-6 py-16 md:py-24">
      <div>
        <span className="font-accent text-xl text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-2 text-4xl md:text-5xl">{t("heading")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
