"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";

export function AcceptInviteButton({ invitationId }: { invitationId: string }) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    setLoading(true);
    setError(null);
    const { error } = await authClient.organization.acceptInvitation({
      invitationId,
    });
    setLoading(false);
    if (error) {
      setError(error.message || t("acceptError"));
      return;
    }
    router.push("/app");
    router.refresh();
  }

  async function onReject() {
    setLoading(true);
    setError(null);
    const { error } = await authClient.organization.rejectInvitation({
      invitationId,
    });
    setLoading(false);
    if (error) {
      setError(error.message || t("rejectError"));
      return;
    }
    router.push("/app");
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button
        type="button"
        variant="dark"
        size="lg"
        className="w-full"
        onClick={onAccept}
        disabled={loading}
      >
        {loading ? t("processing") : t("accept")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="md"
        className="w-full"
        onClick={onReject}
        disabled={loading}
      >
        {t("reject")}
      </Button>
    </div>
  );
}
