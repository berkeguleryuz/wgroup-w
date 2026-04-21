import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { MailIcon } from "@/components/auth/AuthIcons";

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
    <AuthShell kicker={t("kicker")} heading={t("heading")}>
      <div className="space-y-6 rounded-11 border border-border/70 bg-background p-8">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-11 bg-primary/40 text-foreground">
          <MailIcon />
        </div>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Link
          href="/login"
          className="inline-flex text-sm text-foreground underline-offset-[6px] hover:underline"
        >
          ← {t("backToLogin")}
        </Link>
      </div>
    </AuthShell>
  );
}
