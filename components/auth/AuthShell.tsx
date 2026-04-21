import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

export async function AuthShell({
  kicker,
  heading,
  subheading,
  children,
}: {
  kicker: string;
  heading: string;
  subheading?: string;
  children: ReactNode;
}) {
  const t = await getTranslations("authShell");

  return (
    <div className="grid flex-1 md:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-surface-dark text-surface-dark-foreground md:flex md:flex-col md:justify-between md:p-12 lg:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <span className="relative font-mono text-[11px] uppercase tracking-[0.22em] opacity-60">
          {t("sideTag")}
        </span>

        <div className="relative max-w-lg">
          <h2 className="font-display text-4xl leading-[1.05] tracking-[-0.01em] md:text-5xl lg:text-6xl">
            {t("headingLine1")}
            <br />
            <span className="text-primary">{t("headingLine2")}</span>
          </h2>
          <p className="mt-6 max-w-md text-sm opacity-75 md:text-base">
            {t("description")}
          </p>
        </div>

        <div aria-hidden />
      </aside>

      <main className="relative flex flex-1 flex-col justify-center px-6 pb-12 pt-24 md:px-12 md:pb-16 md:pt-28 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10">
            <span className="font-accent text-xl text-muted-foreground">
              {kicker}
            </span>
            <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.01em] md:text-5xl">
              {heading}
            </h1>
            {subheading ? (
              <p className="mt-3 text-sm text-muted-foreground">{subheading}</p>
            ) : null}
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
