import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // Framed "card" chrome, same as the public site.
    <div className="fixed inset-2 overflow-hidden rounded-11 bg-background">
      <div className="h-full w-full overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full flex-col">
          <MarketingHeader />
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </div>
    </div>
  );
}
