import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { HeroSlider } from "@/components/marketing/HeroSlider";
import { LogoStrip } from "@/components/marketing/LogoStrip";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { CategoryShowcase } from "@/components/marketing/CategoryShowcase";
import { FeaturedLibrary } from "@/components/marketing/FeaturedLibrary";
import { FeaturedLibrarySkeleton } from "@/components/marketing/FeaturedLibrarySkeleton";
import { PricingTeaser } from "@/components/marketing/PricingTeaser";
import { CorporateCTA } from "@/components/marketing/CorporateCTA";
import { FAQ } from "@/components/marketing/FAQ";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const title = t("homeTitle");
  const description = t("homeDescription");
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, url: "/" },
    twitter: { title, description },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Suspense fallback={null}>
        <HeroSlider />
      </Suspense>
      <LogoStrip />
      <FeatureGrid />
      <CategoryShowcase />
      <Suspense fallback={<FeaturedLibrarySkeleton />}>
        <FeaturedLibrary />
      </Suspense>
      <PricingTeaser />
      <CorporateCTA />
      <FAQ />
      <ClosingCTA />
    </>
  );
}
