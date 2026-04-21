"use client";

import { useState } from "react";
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
  MailIcon,
  Spinner,
} from "@/components/auth/AuthIcons";

export function SignUpForm() {
  const t = useTranslations("register");
  const tc = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/app",
    });
    setLoading(false);
    if (error) {
      setError(error.message || t("error"));
      return;
    }
    setSent(true);
  }

  async function onGoogle() {
    setGoogleLoading(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/app" });
  }

  const busy = loading || googleLoading;

  if (sent) {
    return (
      <div className="space-y-6 rounded-11 border border-border/70 bg-background p-8">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-11 bg-primary/40 text-foreground">
          <MailIcon />
        </div>
        <div>
          <h2 className="font-display text-2xl">{t("checkEmailTitle")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("checkEmailBody", { email })}
          </p>
        </div>
        <Button
          type="button"
          variant="dark"
          size="lg"
          className="w-full justify-center"
          onClick={() => router.push("/login")}
        >
          {t("backToLogin")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={busy}
          />
        </div>

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
          <Label htmlFor="password">{t("password")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
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
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("passwordHint")}
          </p>
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

        <p className="text-center text-xs text-muted-foreground">
          {t.rich("terms", {
            terms: (c) => (
              <Link
                href="/"
                className="text-foreground underline-offset-[6px] hover:underline"
              >
                {c}
              </Link>
            ),
            privacy: (c) => (
              <Link
                href="/"
                className="text-foreground underline-offset-[6px] hover:underline"
              >
                {c}
              </Link>
            ),
          })}
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link
          href="/login"
          className="text-foreground underline-offset-[6px] hover:underline"
        >
          {t("login")}
        </Link>
      </p>
    </div>
  );
}
