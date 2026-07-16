import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import {
  Cormorant_Garamond,
  Fraunces,
  Geist,
  Geist_Mono,
  Patrick_Hand_SC,
} from "next/font/google";

import "../globals.css";
import { resolvePublicAppUrl } from "@/lib/app-url";
import { routing, type Locale } from "@/lib/i18n/routing";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeInitScript } from "@/components/providers/ThemeInitScript";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const patrickHandSC = Patrick_Hand_SC({
  variable: "--font-patrick-hand-sc",
  // latin-ext carries the Turkish glyphs (İ, ı, ş, ğ, ç) used in accent labels.
  subsets: ["latin", "latin-ext"],
  weight: "400",
});
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const APP_URL = resolvePublicAppUrl();
const DESCRIPTION =
  "The Netflix of business education. Leadership, entrepreneurship and talent development as streaming series.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Busyflix", template: "%s · Busyflix" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Busyflix",
    title: "Busyflix",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Busyflix",
    description: DESCRIPTION,
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale as Locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${patrickHandSC.variable} ${fraunces.variable} ${cormorant.variable} h-screen overflow-hidden antialiased`}
    >
      <body className="h-screen overflow-hidden bg-surface-dark text-foreground">
        {/* First child of <body> on purpose: it still executes before any body
            content paints (anti-FOUC), and unlike <head> — where Next appends
            a fresh copy of head children on every locale switch, remounting
            the script and logging the React dev warning — body children are
            reconciled normally, so the constant element never remounts. */}
        <ThemeInitScript />
        {/* The page frame (inset rounded card) lives in the (marketing)/(auth)
            layouts; /app uses a full-screen shell. This root only sets up the
            providers so each section can choose its own chrome. */}
        <ThemeProvider>
          <Suspense fallback={null}>
            <NextIntlClientProvider>{children}</NextIntlClientProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
