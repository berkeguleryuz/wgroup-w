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
  GoogleIcon,
  Spinner,
  SuccessIcon,
} from "@/components/auth/AuthIcons";

export function SignInForm() {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const resetSuccess = params.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: next,
    });
    setLoading(false);
    if (error) {
      setError(error.message || t("error"));
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onGoogle() {
    setGoogleLoading(true);
    await authClient.signIn.social({ provider: "google", callbackURL: next });
  }

  const busy = loading || googleLoading;

  return (
    <div className="space-y-5">
      {resetSuccess ? (
        <div className="flex items-start gap-3 rounded-11 border border-primary/50 bg-primary/30 px-4 py-3 text-sm">
          <SuccessIcon />
          <span>{t("resetSuccess")}</span>
        </div>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full justify-center gap-3 border-foreground/15 bg-background hover:bg-muted"
        onClick={onGoogle}
        disabled={busy}
      >
        {googleLoading ? <Spinner /> : <GoogleIcon />}
        {t("googleCta")}
      </Button>

      <div className="flex items-center gap-4 text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
        <div className="h-px flex-1 bg-foreground/10" />
        <span>{tc("or")}</span>
        <div className="h-px flex-1 bg-foreground/10" />
      </div>

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
            disabled={busy}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="mb-0">
              {t("password")}
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-[6px] transition hover:text-foreground hover:underline"
            >
              {t("forgot")}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
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
          disabled={busy}
        >
          {loading ? <Spinner /> : null}
          {loading ? tc("loading") : t("submit")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="text-foreground underline-offset-[6px] hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}

