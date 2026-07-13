"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { startCheckout } from "./actions";

export function SubscribeButton({
  plan,
}: {
  plan: "monthly" | "yearly";
}) {
  const t = useTranslations("subscription");
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="shine"
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const url = await startCheckout(plan);
          if (url) window.location.href = url;
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? t("preparing") : t("startSubscription")}
    </Button>
  );
}
