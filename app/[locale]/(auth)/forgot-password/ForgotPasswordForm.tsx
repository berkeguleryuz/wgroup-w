"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { localizedPath } from "@/lib/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { AlertIcon, MailIcon, Spinner } from "@/components/auth/AuthIcons";

export function ForgotPasswordForm() {
  const t = useTranslations("forgotPassword");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${origin}${localizedPath(locale, "/reset-password")}`,
    });
    setLoading(false);
    if (error) {
      setError(error.message || t("error"));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-6 rounded-11 border border-border/70 bg-background p-8">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-11 bg-primary/40 text-foreground">
          <MailIcon />
        </div>
        <div>
          <h2 className="font-display text-2xl">{t("sentTitle")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("sentBody", { email })}
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex text-sm text-foreground underline-offset-[6px] hover:underline"
        >
          ← {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-11 border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600">
            <AlertIcon />
            <span>{error}</span>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="dark"
          size="lg"
          className="w-full justify-center gap-2"
          disabled={loading}
        >
          {loading ? <Spinner /> : null}
          {loading ? t("sending") : t("submit")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="text-foreground underline-offset-[6px] hover:underline"
        >
          ← {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
