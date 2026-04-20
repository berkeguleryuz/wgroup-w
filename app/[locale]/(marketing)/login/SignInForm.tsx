"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function SignInForm() {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const resetSuccess = params.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    await authClient.signIn.social({ provider: "google", callbackURL: next });
  }

  return (
    <div className="rounded-11 border border-border bg-background p-8">
      {resetSuccess ? (
        <p className="mb-4 rounded-11 border border-primary bg-primary/40 px-3 py-2 text-sm">
          {t("resetSuccess")}
        </p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={onGoogle}
        disabled={loading}
      >
        {t("googleCta")}
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>{tc("or")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
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
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("password")}</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
            >
              {t("forgot")}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? tc("loading") : t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="text-foreground underline-offset-4 hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
