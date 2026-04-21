import type { ReactNode } from "react";

import { requireSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const user = session.user as typeof session.user & { role?: string | null };

  const ownerMembership = await prisma.member.findFirst({
    where: { userId: user.id, role: "owner" },
    select: { id: true },
  });

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar role={user.role} orgOwner={!!ownerMembership} />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppTopbar userName={user.name || user.email} />
        <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
