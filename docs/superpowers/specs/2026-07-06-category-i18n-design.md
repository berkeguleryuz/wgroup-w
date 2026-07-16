# Category name localization (tr/en/de)

Date: 2026-07-06
Status: Approved

## Problem

`Category.title` is a single Turkish string, but the site runs in 3 locales
(tr/en/de via next-intl). Subcategory filter pills on Discover, the
"SERIES · GİRİŞİMCİLİK" badges on cards, and several other surfaces always
show Turkish regardless of locale.

## Decision

Store translations as columns on `Category` (chosen over a JSON column and
over messages/*.json): editors may later manage categories from the panel,
and typed columns keep Prisma queries simple.

## Schema

Add to `Category` in `prisma/schema.prisma`:

- `titleEn String?`
- `titleDe String?`

`title` remains the Turkish source of truth. No migration history exists in
the repo; apply with `prisma db push` (additive, no data loss).

## Helper

New file `lib/i18n/category-title.ts`:

```ts
categoryTitle(cat: { title: string; titleEn?: string | null; titleDe?: string | null }, locale: Locale): string
```

- `tr` → `title`
- `en` → `titleEn ?? title`
- `de` → `titleDe ?? title`

Missing translations fall back to Turkish; nothing renders empty.

## Call sites to update

All places that render a category name pass through `categoryTitle`:

- `app/[locale]/app/discover/page.tsx` — subcategory pills; sort pills by
  localized name with `localeCompare` in JS (drop `orderBy: { title: "asc" }` reliance)
- `components/app/TitleCard.tsx` — category badge; remove wrong `lang="tr"`
- `components/marketing/FeaturedLibrary.tsx` — same badge pattern
- `app/[locale]/app/watch/[slug]/page.tsx` — remove `lang="tr"`
- `app/[locale]/app/page.tsx` — `categoryTitle: featured.category.title`
- `app/[locale]/app/organization/content/page.tsx` and `[id]/page.tsx`
- `app/[locale]/app/editor/page.tsx`, `editor/titles/page.tsx`,
  `editor/titles/[id]/page.tsx`, `editor/categories/page.tsx`

Components that only receive a precomputed string keep receiving a string —
localization happens where the category row is available together with the
locale.

## Seed

`prisma/seed.ts` gains `titleEn`/`titleDe` for every category (upsert update
block included, so running seed against the existing DB backfills):

| slug | tr | en | de |
|---|---|---|---|
| diziler | Diziler | Series | Serien |
| filmler | Filmler | Films | Filme |
| talent-management | Talent Management | Talent Management | Talent Management |
| liderlik | Liderlik | Leadership | Führung |
| girisimcilik | Girişimcilik | Entrepreneurship | Unternehmertum |
| pazarlama | Pazarlama | Marketing | Marketing |
| belgesel | Belgesel | Documentary | Dokumentation |
| masterclass | Masterclass | Masterclass | Masterclass |
| kariyer-gelisim | Kariyer Gelişim | Career Development | Karriereentwicklung |

## Out of scope

- Localizing content (`Title.title`, `Episode`, synopsis) — separate, larger effort.
- Category management UI in the editor panel.
