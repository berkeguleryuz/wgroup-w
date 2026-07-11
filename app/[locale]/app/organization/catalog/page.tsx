import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";
import { toggleTitleHidden } from "./actions";
import { Button } from "@/components/ui/Button";

export default async function OrgCatalogPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { membership }] = await Promise.all([
    getTranslations("organization"),
    requireOrgOwner(),
  ]);
  const organizationId = membership.organizationId;

  const [titles, hidden] = await Promise.all([
    prisma.title.findMany({
      where: { published: true, visibility: "PUBLIC" },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        category: { select: { title: true, titleEn: true, titleDe: true } },
        _count: { select: { episodes: true } },
      },
      take: 500,
    }),
    prisma.organizationHiddenTitle.findMany({
      where: { organizationId },
      select: { titleId: true },
    }),
  ]);
  const hiddenIds = new Set(hidden.map((h) => h.titleId));

  return (
    <div className="space-y-8">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("catalogHeading")}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {t("catalogHint")}
        </p>
      </header>

      <div className="overflow-x-auto rounded-11 border border-border/60 bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("catalogTitleCol")}</th>
              <th className="px-4 py-3">{t("catalogCategoryCol")}</th>
              <th className="px-4 py-3">{t("catalogEpisodesCol")}</th>
              <th className="px-4 py-3">{t("catalogVisibilityCol")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {titles.map((title) => {
              const isHidden = hiddenIds.has(title.id);
              return (
                <tr key={title.id}>
                  <td className="px-4 py-3 font-medium">{title.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {locale === "en"
                      ? title.category.titleEn || title.category.title
                      : locale === "de"
                        ? title.category.titleDe || title.category.title
                        : title.category.title}
                  </td>
                  <td className="px-4 py-3">{title._count.episodes}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-11 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                        isHidden
                          ? "border-red-500/30 bg-red-500/10 text-red-600"
                          : "border-primary/40 bg-primary/15 text-foreground"
                      }`}
                    >
                      {isHidden ? t("catalogHidden") : t("catalogVisible")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={toggleTitleHidden}>
                      <input type="hidden" name="titleId" value={title.id} />
                      <input
                        type="hidden"
                        name="hide"
                        value={isHidden ? "0" : "1"}
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        {isHidden ? t("catalogShowAction") : t("catalogHideAction")}
                      </Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
