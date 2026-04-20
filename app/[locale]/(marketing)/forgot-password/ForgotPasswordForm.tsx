"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { localizedPath } from "@/lib/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

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
      <div className="rounded-11 border border-border bg-background p-8 text-sm">
        <h2 className="font-display text-xl">{t("sentTitle")}</h2>
        <p className="mt-3 text-muted-foreground">
          {t("sentBody", { email })}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-foreground underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-11 border border-border bg-background p-8"
    >
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button
        type="submit"
        variant="dark"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? t("sending") : t("submit")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
