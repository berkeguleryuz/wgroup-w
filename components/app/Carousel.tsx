import type { ReactNode } from "react";

export function Carousel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="-mx-2 overflow-x-auto pb-2">
        <div className="flex gap-4 px-2 min-w-max">{children}</div>
      </div>
    </section>
  );
}
