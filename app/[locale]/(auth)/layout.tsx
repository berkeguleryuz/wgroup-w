import type { ReactNode } from "react";
import { getSession } from "@/lib/access";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  const user = session
    ? {
        name: session.user.name || session.user.email,
        image: session.user.image ?? null,
      }
    : null;
  return (
    // Framed "card" chrome, same as the public site.
    <div className="fixed inset-2 overflow-hidden rounded-11 bg-background">
      <div className="h-full w-full overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full flex-col">
          <MarketingHeader user={user} />
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </div>
    </div>
  );
}
