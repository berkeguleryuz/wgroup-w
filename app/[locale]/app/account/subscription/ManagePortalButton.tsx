"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { openBillingPortal } from "./actions";

export function ManagePortalButton() {
  const t = useTranslations("subscription");
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const url = await openBillingPortal();
          if (url) window.location.href = url;
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? t("opening") : t("managePortal")}
    </Button>
  );
}
