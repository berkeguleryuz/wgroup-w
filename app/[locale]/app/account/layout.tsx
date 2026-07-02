import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { requireSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
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

  let roleKey = ROLE_KEYS[user.role ?? "individual"] ?? "roleIndividual";
  if ((user.role ?? "individual") === "individual") {
    const membership = await prisma.member.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { role: true },
    });
    if (membership) {
      roleKey = membership.role === "owner" ? "roleOrgOwner" : "roleOrgMember";
    }
  }

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
