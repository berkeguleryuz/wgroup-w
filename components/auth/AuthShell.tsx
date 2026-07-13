import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import LightRays from "@/components/marketing/LightRays";
import GradientDotMesh from "@/components/pixel-perfect/gradient-dot-mesh";

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
        <GradientDotMesh patternColor="rgb(var(--white-rgb) / 0.12)" />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <LightRays
            raysOrigin="top-center"
            raysColor="var(--primary)"
            raysSpeed={0.9}
            lightSpread={0.8}
            rayLength={1.6}
            followMouse
            mouseInfluence={0.1}
            noiseAmount={0.05}
          />
        </div>

        <div aria-hidden />

        <div className="relative max-w-lg">
          <Image
            src="/logo-transparent.webp"
            alt=""
            aria-hidden
            width={86}
            height={120}
            className="mb-8 h-28 w-auto"
          />
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

      <main className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 pb-12 pt-24 md:px-12 md:pb-16 md:pt-28 lg:px-20">
        <GradientDotMesh className="[mask-image:radial-gradient(ellipse_80%_70%_at_50%_40%,black_30%,transparent_100%)]" />
        <div className="relative mx-auto w-full max-w-md">
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
