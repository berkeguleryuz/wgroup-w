"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function SignUpForm() {
  const t = useTranslations("register");
  const tc = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/app" });
  }

  if (sent) {
    return (
      <div className="rounded-11 border border-border bg-background p-8 text-sm">
        <h2 className="font-display text-xl">{t("checkEmailTitle")}</h2>
        <p className="mt-3 text-muted-foreground">
          {t("checkEmailBody", { email })}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-6 w-full"
          onClick={() => router.push("/login")}
        >
          {t("backToLogin")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-11 border border-border bg-background p-8">
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
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
          <Label htmlFor="password">{t("password")}</Label>
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
        {t("haveAccount")}{" "}
        <Link
          href="/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          {t("login")}
        </Link>
      </p>
    </div>
  );
}
