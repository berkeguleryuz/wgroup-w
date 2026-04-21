import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";

export default async function EditorTitlesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, ta, titles] = await Promise.all([
    getTranslations("editor"),
    getTranslations("admin"),
    prisma.title.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: { category: true, episodes: { select: { id: true } } },
    }),
  ]);
  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <span className="font-accent text-lg text-muted-foreground">
            {t("kicker")}
          </span>
          <h1 className="mt-1 text-3xl md:text-5xl">{t("titles")}</h1>
        </div>
        <Link href="/app/editor/titles/new">
          <Button variant="dark">{t("newTitle")}</Button>
        </Link>
      </header>

      <div className="rounded-11 border border-border/60 bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">{t("titleLabel")}</th>
              <th className="px-5 py-3">{t("categoryLabel")}</th>
              <th className="px-5 py-3">{t("typeLabel")}</th>
              <th className="px-5 py-3">{t("episodes")}</th>
              <th className="px-5 py-3">{ta("status")}</th>
              <th className="px-5 py-3">{t("updatedLabel")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {titles.map((item) => (
              <tr key={item.id} className="hover:bg-muted">
                <td className="px-5 py-3 font-medium">
                  <Link href={`/app/editor/titles/${item.id}`}>
                    {item.title}
                  </Link>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {item.category.title}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {item.type === "SERIES"
                    ? t("formTypeSeries")
                    : t("formTypeMovie")}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {item.episodes.length}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-11 px-2 py-1 text-xs ${
                      item.published
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {item.published ? t("statusPublished") : t("statusDraft")}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {item.updatedAt.toLocaleDateString(dateLocale)}
                </td>
              </tr>
            ))}
            {titles.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
                  {t("empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
