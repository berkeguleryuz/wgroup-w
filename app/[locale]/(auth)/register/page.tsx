import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getSession } from "@/lib/access";
import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "./SignUpForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "register" });
  return { title: `${t("heading")} · Busyflix` };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already signed in — registration is pointless, go straight to the app.
  if (await getSession()) {
    redirect(localizedPath(locale, "/app"));
  }

  const t = await getTranslations("register");

  return (
    <AuthShell
      kicker={t("kicker")}
      heading={t("heading")}
      subheading={t("description")}
    >
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
