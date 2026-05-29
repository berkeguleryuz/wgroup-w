import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { requireSession } from "@/lib/access";
import { SettingsSidebar } from "@/components/app/SettingsSidebar";

const ROLE_KEYS: Record<string, string> = {
  individual: "roleIndividual",
  platform_editor: "rolePlatformEditor",
  admin: "roleAdmin",
  instructor: "roleInstructor",
};

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [session, t] = await Promise.all([
    requireSession(),
    getTranslations("account"),
  ]);
  const user = session.user as typeof session.user & { role?: string | null };
  const roleKey = ROLE_KEYS[user.role ?? "individual"] ?? "roleIndividual";

  return (
    <div className="flex gap-6">
      <SettingsSidebar
        userName={user.name || user.email}
        userEmail={user.email}
        roleLabel={t(roleKey)}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
