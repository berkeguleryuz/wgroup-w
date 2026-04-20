"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function ResetPasswordForm() {
  const t = useTranslations("resetPassword");
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const tokenError = params.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (tokenError || !token) {
    return (
      <div className="rounded-11 border border-border bg-background p-8 text-sm">
        <h2 className="font-display text-xl">{t("invalidTitle")}</h2>
        <p className="mt-3 text-muted-foreground">{t("invalidBody")}</p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm text-foreground underline-offset-4 hover:underline"
        >
          {t("requestNew")}
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(t("errorLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("errorMatch"));
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });
    setLoading(false);
    if (error) {
      setError(error.message || t("errorGeneric"));
      return;
    }
    router.push("/login?reset=1");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-11 border border-border bg-background p-8"
    >
      <div>
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("passwordHint")}
        </p>
      </div>
      <div>
        <Label htmlFor="confirm">{t("confirm")}</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
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
        {loading ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
