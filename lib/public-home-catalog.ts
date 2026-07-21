import "server-only";

import { Section, type Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";

import { getContentDateWindows, publishedAtWhere } from "./content-date-windows";
import type { ViewerAudience } from "./content-visibility";
import { audienceWhere } from "./content-visibility";
import { prisma } from "./prisma";

export const PUBLIC_CATALOG_TAG = "catalog:public";
export const FEATURED_TITLES_TAG = "featured-titles";

export function publicTitleCatalogTag(titleId: string): string {
  return `catalog:public:title:${titleId}`;
}

export const homeCatalogTitleInclude = {
  category: true,
  episodes: { select: { durationSec: true } },
  orgAudience: { select: { organizationId: true } },
  hiddenBy: { select: { organizationId: true } },
  departmentAudience: { select: { departmentId: true } },
} satisfies Prisma.TitleInclude;

export type HomeCatalogTitle = Prisma.TitleGetPayload<{
  include: typeof homeCatalogTitleInclude;
}>;

export type HomeCatalog = {
  featured: HomeCatalogTitle | null;
  newReleases: HomeCatalogTitle[];
  thisMonthReleases: HomeCatalogTitle[];
  series: HomeCatalogTitle[];
  movies: HomeCatalogTitle[];
  talent: HomeCatalogTitle[];
};

async function queryHomeCatalog(
  where: Prisma.TitleWhereInput,
): Promise<HomeCatalog> {
  const windows = getContentDateWindows(new Date());
  const baseWhere: Prisma.TitleWhereInput = {
    published: true,
    AND: [where],
  };

  const [featured, newReleases, thisMonthReleases, series, movies, talent] =
    await Promise.all([
      prisma.title.findFirst({
        where: baseWhere,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: homeCatalogTitleInclude,
      }),
      prisma.title.findMany({
        where: { ...baseWhere, ...publishedAtWhere(windows.week) },
        orderBy: { publishedAt: "desc" },
        take: 12,
        include: homeCatalogTitleInclude,
      }),
      prisma.title.findMany({
        where: { ...baseWhere, ...publishedAtWhere(windows.month) },
        orderBy: { publishedAt: "desc" },
        take: 12,
        include: homeCatalogTitleInclude,
      }),
      prisma.title.findMany({
        where: { ...baseWhere, category: { section: Section.SERIES } },
        orderBy: { publishedAt: "desc" },
        take: 12,
        include: homeCatalogTitleInclude,
      }),
      prisma.title.findMany({
        where: { ...baseWhere, category: { section: Section.MOVIE } },
        orderBy: { publishedAt: "desc" },
        take: 12,
        include: homeCatalogTitleInclude,
      }),
      prisma.title.findMany({
        where: { ...baseWhere, category: { section: Section.TALENT } },
        orderBy: { publishedAt: "desc" },
        take: 12,
        include: homeCatalogTitleInclude,
      }),
    ]);

  return {
    featured,
    newReleases,
    thisMonthReleases,
    series,
    movies,
    talent,
  };
}

export async function getPublicHomeCatalog(): Promise<HomeCatalog> {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  const catalog = await queryHomeCatalog({ visibility: "PUBLIC" });
  const titleTags = [
    catalog.featured,
    ...catalog.newReleases,
    ...catalog.thisMonthReleases,
    ...catalog.series,
    ...catalog.movies,
    ...catalog.talent,
  ]
    .filter((title): title is HomeCatalogTitle => title !== null)
    .map((title) => publicTitleCatalogTag(title.id));

  cacheTag(
    PUBLIC_CATALOG_TAG,
    FEATURED_TITLES_TAG,
    ...[...new Set(titleTags)].slice(0, 126),
  );

  return catalog;
}

const EMPTY_HOME_CATALOG: HomeCatalog = {
  featured: null,
  newReleases: [],
  thisMonthReleases: [],
  series: [],
  movies: [],
  talent: [],
};

export async function getSupplementalHomeCatalog(
  role: string | null | undefined,
  viewer: ViewerAudience,
): Promise<HomeCatalog> {
  const isStaff = role === "admin" || role === "platform_editor";
  if (!isStaff && viewer.orgIds.length === 0) return EMPTY_HOME_CATALOG;

  return queryHomeCatalog({
    visibility: "ORG_ONLY",
    AND: [audienceWhere(role, viewer)],
  });
}
