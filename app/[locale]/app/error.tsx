"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-3xl md:text-4xl">{t("errorTitle")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t("errorBody")}</p>
      <Button variant="dark" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
