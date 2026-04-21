import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-full flex-col">
      <MarketingHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
