"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
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
  return (
    <div className="space-y-2">
      <Button
        variant="dark"
        disabled={state === "busy" || state === "done"}
        onClick={async () => {
          setState("busy");
          const res = await upgradeCorporatePlan().catch(() => ({ ok: false }));
          setState(res.ok ? "done" : "error");
          // Webhook flips the plan asynchronously; refresh shortly after.
          if (res.ok) setTimeout(() => router.refresh(), 3000);
        }}
      >
        {state === "busy" ? t("upgrading") : t("upgradeCta")}
      </Button>
      {state === "done" ? (
        <p className="text-sm text-muted-foreground">{t("upgradeDone")}</p>
      ) : null}
      {state === "error" ? (
        <p className="text-sm text-red-600">{t("upgradeFailed")}</p>
      ) : null}
    </div>
  );
}
