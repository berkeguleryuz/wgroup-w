import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "./SignInForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return { title: `${t("heading")} · Businessflix` };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("login");

  return (
    <AuthShell
      kicker={t("kicker")}
      heading={t("heading")}
      subheading={t("subheading")}
    >
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
