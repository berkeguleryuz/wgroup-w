import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import {
  Fraunces,
  Geist,
  Geist_Mono,
  Patrick_Hand_SC,
} from "next/font/google";

import "../globals.css";
import { routing, type Locale } from "@/lib/i18n/routing";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const patrickHandSC = Patrick_Hand_SC({
  variable: "--font-patrick-hand-sc",
  subsets: ["latin"],
  weight: "400",
});
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "Businessflix",
  description:
    "The Netflix of business education. Leadership, entrepreneurship and talent development as streaming series.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${patrickHandSC.variable} ${fraunces.variable} h-screen overflow-hidden antialiased`}
    >
      <body className="h-screen overflow-hidden bg-surface-dark text-foreground">
        <div className="fixed inset-2 overflow-hidden rounded-11 bg-background">
          <div className="h-full w-full overflow-y-auto overflow-x-hidden">
            <NextIntlClientProvider>{children}</NextIntlClientProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
