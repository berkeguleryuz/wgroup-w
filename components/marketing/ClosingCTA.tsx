import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";
import LightRays from "@/components/marketing/LightRays";
import GradientDotMesh from "@/components/pixel-perfect/gradient-dot-mesh";

export function ClosingCTA() {
  const t = useTranslations("closing");
  return (
    <section className="relative overflow-hidden rounded-11 bg-surface-dark text-surface-dark-foreground">
      <GradientDotMesh patternColor="rgba(255,255,255,0.12)" />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#edddb9"
          raysSpeed={1}
          lightSpread={0.7}
          rayLength={1.8}
          followMouse
          mouseInfluence={0.1}
          noiseAmount={0.05}
        />
      </div>
      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
        <span className="font-accent text-xl opacity-80">{t("kicker")}</span>
        <h2 className="mt-3 text-4xl md:text-7xl font-display leading-[1.05]">
          {t("headingLine1")}
          <br />
          {t("headingLine2")}
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-sm md:text-base opacity-85">
          {t("description")}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg" variant="primary">
              {t("ctaPrimary")}
            </Button>
          </Link>
          <Link href="/business">
            <Button
              size="lg"
              variant="ghost"
              className="text-surface-dark-foreground hover:bg-white/10"
            >
              {t("ctaSecondary")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
