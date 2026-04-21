"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  AlertIcon,
  EyeIcon,
  EyeOffIcon,
  Spinner,
} from "@/components/auth/AuthIcons";

export function ResetPasswordForm() {
  const t = useTranslations("resetPassword");
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const tokenError = params.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (tokenError || !token) {
    return (
      <div className="space-y-5 rounded-11 border border-border/70 bg-background p-8">
        <div className="flex items-start gap-3 rounded-11 border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600">
          <AlertIcon />
          <span>{t("invalidBody")}</span>
        </div>
        <div>
          <h2 className="font-display text-2xl">{t("invalidTitle")}</h2>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex text-sm text-foreground underline-offset-[6px] hover:underline"
        >
          → {t("requestNew")}
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
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">{t("newPassword")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              disabled={loading}
              className="pr-11"
            />
            <button
              type="button"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-11 text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              tabIndex={-1}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("passwordHint")}
          </p>
        </div>

        <div>
          <Label htmlFor="confirm">{t("confirm")}</Label>
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
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
          {loading ? t("submitting") : t("submit")}
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
