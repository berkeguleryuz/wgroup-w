"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/editor/ConfirmButton";
import {
  startCorporateCheckout,
  openCorporateBillingPortal,
  upgradeCorporatePlan,
} from "./actions";

export function CorporateSubscribeButton({ pkg }: { pkg: "small" | "large" }) {
  const t = useTranslations("organization");
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="dark"
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const url = await startCorporateCheckout(pkg);
          if (url) window.location.href = url;
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? t("preparing") : t("choosePlan")}
    </Button>
  );
}

export function CorporateManageButton() {
  const t = useTranslations("organization");
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const url = await openCorporateBillingPortal();
          if (url) window.location.href = url;
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? t("opening") : t("manageBilling")}
    </Button>
  );
}

export function CorporateUpgradeButton() {
  const t = useTranslations("organization");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const run = async () => {
    setState("busy");
    const res = await upgradeCorporatePlan().catch(() => ({ ok: false }));
    setState(res.ok ? "done" : "error");
    if (res.ok) router.refresh();
  };

  return (
    <div className="space-y-2">
      {/* Upgrading charges the company's saved card immediately — never a
          single accidental click: a confirmation dialog stands in between. */}
      <ConfirmButton
        tone="primary"
        confirmTitle={t("upgradeCta")}
        confirmText={t("upgradeConfirmBody")}
        confirmLabel={t("upgradeConfirmCta")}
        onConfirm={() => void run()}
        disabled={state === "busy" || state === "done"}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-11 border border-surface-dark bg-surface-dark px-5 text-sm font-medium text-surface-dark-foreground transition-colors hover:bg-surface-dark/90 disabled:pointer-events-none disabled:opacity-50 dark:border-foreground dark:bg-foreground dark:text-background dark:hover:bg-foreground/90"
      >
        {state === "busy" ? t("upgrading") : t("upgradeCta")}
      </ConfirmButton>
      {state === "done" ? (
        <p className="text-sm text-muted-foreground">{t("upgradeDone")}</p>
      ) : null}
      {state === "error" ? (
        <p className="text-sm text-red-600">{t("upgradeFailed")}</p>
      ) : null}
    </div>
  );
}
