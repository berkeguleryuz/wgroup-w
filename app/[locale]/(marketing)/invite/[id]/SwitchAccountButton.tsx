"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";

/**
 * Signs the current (wrong) user out, then returns to the invite link. The
 * invite page re-runs while logged out and forwards them to the right auth
 * screen with the invited email locked in — so they can land on the correct
 * account in one step instead of manually logging out.
 */
export function SwitchAccountButton({ invitePath }: { invitePath: string }) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSwitch() {
    setLoading(true);
    await authClient.signOut();
    router.push(invitePath);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="dark"
      size="md"
      className="mt-5 w-full"
      onClick={onSwitch}
      disabled={loading}
    >
      {loading ? t("processing") : t("switchAccount")}
    </Button>
  );
}
