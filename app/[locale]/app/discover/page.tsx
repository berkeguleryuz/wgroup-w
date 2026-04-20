import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { Section, TitleType } from "@prisma/client";
import { TitleCard } from "@/components/app/TitleCard";

export const dynamic = "force-dynamic";

type SearchParams = {
  section?: string;
  type?: string;
  category?: string;
  q?: string;
};

function toSection(val?: string): Section | undefined {
  if (val === "SERIES" || val === "MOVIE" || val === "TALENT") return val;
  return undefined;
}

function toType(val?: string): TitleType | undefined {
  if (val === "SERIES" || val === "MOVIE") return val;
  return undefined;
}

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const section = toSection(sp.section);
  const type = toType(sp.type);
  const q = sp.q?.trim();

  const [t, tNav, topCategories, subCategories, titles] = await Promise.all([
    getTranslations("discover"),
    getTranslations("nav"),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
    }),
    section
      ? prisma.category.findMany({
          where: { section, parentId: { not: null } },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
    prisma.title.findMany({
      where: {
        published: true,
        ...(section ? { category: { section } } : {}),
        ...(type ? { type } : {}),
        ...(sp.category ? { categoryId: sp.category } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { synopsis: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { category: true, episodes: { select: { durationSec: true } } },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-4xl md:text-6xl">{t("heading")}</h1>
        {q ? (
          <p className="mt-2 text-muted-foreground">
            {t("searchResults", { q })}
          </p>
        ) : null}
      </header>

      <nav className="flex flex-wrap gap-2">
        <FilterPill href="/app/discover" active={!section}>
          {t("all")}
        </FilterPill>
        {topCategories.map((c) => (
          <FilterPill
            key={c.id}
            href={`/app/discover?section=${c.section}`}
            active={section === c.section}
          >
            {c.section === "SERIES"
              ? tNav("series")
              : c.section === "MOVIE"
                ? tNav("films")
                : tNav("talentManagement")}
          </FilterPill>
        ))}
      </nav>

      {subCategories.length > 0 ? (
        <nav className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <FilterPill
            href={`/app/discover?section=${section}`}
            active={!sp.category}
            small
          >
            {t("allSub")}
          </FilterPill>
          {subCategories.map((c) => (
            <FilterPill
              key={c.id}
              href={`/app/discover?section=${section}&category=${c.id}`}
              active={sp.category === c.id}
              small
            >
              {c.title}
            </FilterPill>
          ))}
        </nav>
      ) : null}

      {titles.length === 0 ? (
        <div className="rounded-11 border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {titles.map((title, i) => (
            <TitleCard key={title.id} title={title} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
  small,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-11 border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-surface-dark text-surface-dark-foreground border-surface-dark"
          : "bg-background text-foreground border-border hover:bg-muted"
      } ${small ? "text-xs py-1" : ""}`}
    >
      {children}
    </Link>
  );
}
