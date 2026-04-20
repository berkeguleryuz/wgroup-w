import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, subs] = await Promise.all([
    getTranslations("admin"),
    prisma.individualSubscription.findMany({
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-8">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("subscribersHeading")}</h1>
      </header>

      <div className="rounded-11 border border-border/60 bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("colNameEmail")}</th>
              <th className="px-4 py-3">{t("plan")}</th>
              <th className="px-4 py-3">{t("status")}</th>
              <th className="px-4 py-3">{t("periodEnd")}</th>
              <th className="px-4 py-3">{t("stripe")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {subs.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-muted-foreground"
                  colSpan={5}
                >
                  —
                </td>
              </tr>
            ) : (
              subs.map((s) => (
                <tr key={s.userId}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {s.plan}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-11 bg-muted px-2 py-1 text-xs">
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.currentPeriodEnd.toLocaleDateString(dateLocale)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {s.stripeSubscriptionId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
