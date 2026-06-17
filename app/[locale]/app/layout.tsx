import type { ReactNode } from "react";

import { requireSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AppTopbar } from "@/components/app/AppTopbar";
import { AppFooter } from "@/components/app/AppFooter";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const user = session.user as typeof session.user & { role?: string | null };

  const [ownerMembership, corporateMembership] = await Promise.all([
    prisma.member.findFirst({
      where: { userId: user.id, role: "owner" },
      select: { id: true },
    }),
    prisma.member.findFirst({
      where: {
        userId: user.id,
        organization: { companyProfile: { isNot: null } },
      },
      select: { id: true },
    }),
  ]);

  return (
    <QueryProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <AppTopbar
          userName={user.name || user.email}
          userEmail={user.email}
          role={user.role}
          orgOwner={!!ownerMembership}
          corporateMember={!!corporateMembership}
        />
        <main className="mx-auto w-full max-w-[1800px] flex-1 px-6 pb-16 pt-[104px] md:px-10 xl:px-16">
          {children}
        </main>
        <AppFooter />
      </div>
    </QueryProvider>
  );
}
