import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    // Framed "card" chrome for the public site (8px inset, rounded).
    <div className="fixed inset-2 overflow-hidden rounded-11 bg-background">
      <div className="h-full w-full overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full flex-col">
          <MarketingHeader />
          <main className="flex-1">{children}</main>
          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}
