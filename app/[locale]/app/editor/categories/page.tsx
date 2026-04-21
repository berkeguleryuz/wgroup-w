import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";

export default async function EditorCategoriesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, categories] = await Promise.all([
    getTranslations("editor"),
    prisma.category.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      include: { children: true, parent: true, titles: { select: { id: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("categories")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("categoriesBody")}
        </p>
      </header>

      <div className="rounded-11 border border-border/60 bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">{t("categories")}</th>
              <th className="px-5 py-3">{t("typeLabel")}</th>
              <th className="px-5 py-3">{t("parent")}</th>
              <th className="px-5 py-3">{t("content")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-3 font-medium">{c.title}</td>
                <td className="px-5 py-3 text-muted-foreground">{c.section}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {c.parent ? c.parent.title : t("parentTop")}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {c.titles.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
