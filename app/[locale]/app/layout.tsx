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
    // Full-screen shell for the app — no inset frame / rounding (unlike the
    // public site), so content runs edge-to-edge.
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div className="h-full w-full overflow-y-auto overflow-x-hidden">
        <QueryProvider>
          <div className="flex min-h-full flex-col bg-background">
            <AppTopbar
              userName={user.name || user.email}
              userEmail={user.email}
              role={user.role}
              orgOwner={!!ownerMembership}
              corporateMember={!!corporateMembership}
            />
            <main className="w-full flex-1 px-4 pb-16 pt-[104px] md:px-6 lg:px-8">
              {children}
            </main>
            <AppFooter />
          </div>
        </QueryProvider>
      </div>
    </div>
  );
}
