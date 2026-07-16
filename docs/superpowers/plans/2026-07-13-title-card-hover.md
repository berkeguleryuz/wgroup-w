# Title Card Hover and Date Rails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current project directory. Do not create a worktree, commit, stage, push, or open a pull request.

**Goal:** Add a rich anchored hover preview to standard content cards, a compact hover variant to weekly and monthly discovery cards, and real `publishedAt` date filtering in the Europe/Berlin time zone.

**Architecture:** Keep the homepage and Prisma queries server-side. Add a pure date-window module for deterministic Berlin calendar boundaries. Make `TitleCard` the client interaction boundary, and render Variant A through a fixed portal so the horizontal carousel cannot clip it. Variant B stays inside the card and uses a lighter hover reveal.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-intl, Prisma, Tailwind CSS v4, Node test runner.

---

## File Map

- Create `lib/content-date-windows.ts`: DST-aware weekly and monthly publication windows.
- Create `tests/content-date-windows.test.ts`: deterministic date boundary and overlap tests.
- Create `components/app/TitleCardArtwork.tsx`: shared optimized artwork and token-based fallback.
- Create `lib/title-card-behavior.ts`: pure variant and trailer eligibility rules.
- Create `tests/title-card-behavior.test.ts`: variant and media fallback contract tests.
- Create `components/app/ExpandedTitlePreview.tsx`: portal positioning, hover/focus lifecycle, preview actions, and trailer fallback.
- Modify `components/app/TitleCard.tsx`: explicit `expanded` and `compact` variants and shared card presentation.
- Modify `components/app/ContinueWatchingCard.tsx`: move removal into Variant A actions.
- Modify `app/[locale]/app/page.tsx`: weekly and monthly `publishedAt` queries and variant mapping.
- Modify `messages/tr.json`, `messages/en.json`, `messages/de.json`: monthly rail labels.
- Modify `app/globals.css`: preview entrance motion with reduced-motion override.

### Task 1: Berlin publication windows

**Files:**

- Create: `tests/content-date-windows.test.ts`
- Create: `lib/content-date-windows.ts`

- [ ] **Step 1: Write the failing date-window tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  getContentDateWindows,
  isPublishedInWindow,
  publishedAtWhere,
} from "../lib/content-date-windows";

test("uses Monday through the next Monday for a Berlin calendar week", () => {
  const windows = getContentDateWindows(new Date("2026-07-13T10:00:00.000Z"));

  assert.equal(windows.week.start.toISOString(), "2026-07-12T22:00:00.000Z");
  assert.equal(windows.week.end.toISOString(), "2026-07-19T22:00:00.000Z");
});

test("uses the current Berlin calendar month", () => {
  const windows = getContentDateWindows(new Date("2026-07-13T10:00:00.000Z"));

  assert.equal(windows.month.start.toISOString(), "2026-06-30T22:00:00.000Z");
  assert.equal(windows.month.end.toISOString(), "2026-07-31T22:00:00.000Z");
});

test("keeps March daylight saving boundaries DST-aware", () => {
  const windows = getContentDateWindows(new Date("2026-03-30T10:00:00.000Z"));

  assert.equal(windows.week.start.toISOString(), "2026-03-29T22:00:00.000Z");
  assert.equal(windows.month.start.toISOString(), "2026-02-28T23:00:00.000Z");
  assert.equal(windows.month.end.toISOString(), "2026-03-31T22:00:00.000Z");
});

test("keeps October daylight saving boundaries DST-aware", () => {
  const windows = getContentDateWindows(new Date("2026-10-26T10:00:00.000Z"));

  assert.equal(windows.week.start.toISOString(), "2026-10-25T23:00:00.000Z");
  assert.equal(windows.month.start.toISOString(), "2026-09-30T22:00:00.000Z");
  assert.equal(windows.month.end.toISOString(), "2026-10-31T23:00:00.000Z");
});

test("uses an exclusive upper boundary and permits week-month overlap", () => {
  const windows = getContentDateWindows(new Date("2026-07-13T10:00:00.000Z"));
  const inBoth = new Date("2026-07-15T12:00:00.000Z");

  assert.equal(isPublishedInWindow(inBoth, windows.week), true);
  assert.equal(isPublishedInWindow(inBoth, windows.month), true);
  assert.equal(isPublishedInWindow(windows.week.end, windows.week), false);
  assert.equal(isPublishedInWindow(null, windows.month), false);
});

test("builds the Prisma publishedAt range from the same boundaries", () => {
  const { week } = getContentDateWindows(new Date("2026-07-13T10:00:00.000Z"));

  assert.deepEqual(publishedAtWhere(week), {
    publishedAt: { gte: week.start, lt: week.end },
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx tsx --test tests/content-date-windows.test.ts
```

Expected: FAIL because `lib/content-date-windows.ts` does not exist.

- [ ] **Step 3: Implement the pure Berlin window helper**

```ts
const CONTENT_TIME_ZONE = "Europe/Berlin";

type CalendarDate = { year: number; month: number; day: number };
type CalendarDateTime = CalendarDate & {
  hour: number;
  minute: number;
  second: number;
};

export type ContentDateWindow = { start: Date; end: Date };
export type ContentDateWindows = {
  week: ContentDateWindow;
  month: ContentDateWindow;
};

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CONTENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = parts.find((part) => part.type === type)?.value;
  if (!value) throw new Error(`Missing ${type} from zoned date`);
  return Number(value);
}

function zonedParts(date: Date): CalendarDateTime {
  const parts = zonedFormatter.formatToParts(date);
  return {
    year: readPart(parts, "year"),
    month: readPart(parts, "month"),
    day: readPart(parts, "day"),
    hour: readPart(parts, "hour"),
    minute: readPart(parts, "minute"),
    second: readPart(parts, "second"),
  };
}

function addCalendarDays(date: CalendarDate, amount: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + amount));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function berlinMidnight(date: CalendarDate): Date {
  const targetProjection = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0);
  let guess = targetProjection;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(new Date(guess));
    const actualProjection = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    guess += targetProjection - actualProjection;
  }

  return new Date(guess);
}

export function getContentDateWindows(now = new Date()): ContentDateWindows {
  const current = zonedParts(now);
  const today = { year: current.year, month: current.month, day: current.day };
  const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const weekStartDate = addCalendarDays(today, -daysSinceMonday);
  const monthStartDate = { year: today.year, month: today.month, day: 1 };
  const nextMonthDate =
    today.month === 12
      ? { year: today.year + 1, month: 1, day: 1 }
      : { year: today.year, month: today.month + 1, day: 1 };

  return {
    week: {
      start: berlinMidnight(weekStartDate),
      end: berlinMidnight(addCalendarDays(weekStartDate, 7)),
    },
    month: {
      start: berlinMidnight(monthStartDate),
      end: berlinMidnight(nextMonthDate),
    },
  };
}

export function publishedAtWhere(window: ContentDateWindow) {
  return { publishedAt: { gte: window.start, lt: window.end } } as const;
}

export function isPublishedInWindow(
  publishedAt: Date | null,
  window: ContentDateWindow,
) {
  return (
    publishedAt !== null &&
    publishedAt.getTime() >= window.start.getTime() &&
    publishedAt.getTime() < window.end.getTime()
  );
}
```

- [ ] **Step 4: Run the date tests and verify GREEN**

Run:

```bash
npx tsx --test tests/content-date-windows.test.ts
```

Expected: 6 tests pass, 0 fail.

### Task 2: Real weekly and monthly homepage rails

**Files:**

- Modify: `app/[locale]/app/page.tsx`
- Modify: `messages/tr.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

- [ ] **Step 1: Add localized monthly rail labels**

Add these keys inside each `appHome` object while preserving the existing keys:

```json
// messages/tr.json
"thisMonth": "Bu ay eklenenler",
"thisMonthSub": "Bu ay yayınlananlar"
```

```json
// messages/en.json
"thisMonth": "Added this month",
"thisMonthSub": "Published this month"
```

```json
// messages/de.json
"thisMonth": "Diesen Monat hinzugefügt",
"thisMonthSub": "Diesen Monat veröffentlicht"
```

- [ ] **Step 2: Add the date windows before the homepage query batch**

Import the helper and calculate one shared clock value so both queries use identical boundaries:

```ts
import {
  getContentDateWindows,
  publishedAtWhere,
} from "@/lib/content-date-windows";

const contentWindows = getContentDateWindows(new Date());
```

Place `contentWindows` after `audience` is created and before `Promise.all` starts.

- [ ] **Step 3: Extend the query batch with `thisMonthReleases`**

Keep the existing audience condition and replace the unbounded New Releases query with:

```ts
prisma.title.findMany({
  where: {
    published: true,
    ...publishedAtWhere(contentWindows.week),
    AND: [audience],
  },
  orderBy: { publishedAt: "desc" },
  take: 12,
  include: titleInclude,
}),
prisma.title.findMany({
  where: {
    published: true,
    ...publishedAtWhere(contentWindows.month),
    AND: [audience],
  },
  orderBy: { publishedAt: "desc" },
  take: 12,
  include: titleInclude,
}),
```

Add `thisMonthReleases` immediately after `newReleases` in the destructured result list. Do not subtract weekly IDs from the monthly result.

- [ ] **Step 4: Render both date rails with the compact variant**

Replace the New Releases block and insert the monthly block directly after it:

```tsx
{newReleases.length > 0 ? (
  <Carousel title={t("newReleases")} subtitle={t("newReleasesSub")}>
    {newReleases.map((item, i) => (
      <div key={item.id} className="w-64 shrink-0 sm:w-72 xl:w-80">
        <TitleCard title={item} index={i} />
      </div>
    ))}
  </Carousel>
) : null}

{thisMonthReleases.length > 0 ? (
  <Carousel title={t("thisMonth")} subtitle={t("thisMonthSub")}>
    {thisMonthReleases.map((item, i) => (
      <div key={item.id} className="w-64 shrink-0 sm:w-72 xl:w-80">
        <TitleCard title={item} index={i} />
      </div>
    ))}
  </Carousel>
) : null}
```

- [ ] **Step 5: Run the targeted date test and typecheck**

Run:

```bash
npx tsx --test tests/content-date-windows.test.ts
npm run typecheck
```

Expected: date tests pass and TypeScript reports no errors.

### Task 3: Shared card variants

**Files:**

- Modify: `components/app/TitleCard.tsx`
- Create: `components/app/TitleCardArtwork.tsx`
- Create: `lib/title-card-behavior.ts`
- Create: `tests/title-card-behavior.test.ts`
- Modify: `app/[locale]/app/page.tsx`

- [ ] **Step 1: Write the failing behavior contract tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  canAutoplayTitlePreview,
  isCompactTitleCard,
} from "../lib/title-card-behavior";

test("keeps compact and expanded card behavior explicit", () => {
  assert.equal(isCompactTitleCard("compact"), true);
  assert.equal(isCompactTitleCard("expanded"), false);
});

test("autoplays only browser-playable trailers when motion is allowed", () => {
  assert.equal(canAutoplayTitlePreview("https://cdn.example.com/a.mp4", false, false), true);
  assert.equal(canAutoplayTitlePreview("https://cdn.example.com/a.webm?x=1", false, false), true);
  assert.equal(canAutoplayTitlePreview("https://cdn.example.com/a.m3u8", false, false), false);
  assert.equal(canAutoplayTitlePreview(null, false, false), false);
  assert.equal(canAutoplayTitlePreview("https://cdn.example.com/a.mp4", true, false), false);
  assert.equal(canAutoplayTitlePreview("https://cdn.example.com/a.mp4", false, true), false);
});
```

- [ ] **Step 2: Run the behavior test and verify RED**

Run:

```bash
npx tsx --test tests/title-card-behavior.test.ts
```

Expected: FAIL because `lib/title-card-behavior.ts` does not exist.

- [ ] **Step 3: Implement the behavior contract**

```ts
export type TitleCardBehavior = "expanded" | "compact";

const VIDEO_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

export function isCompactTitleCard(variant: TitleCardBehavior) {
  return variant === "compact";
}

export function canAutoplayTitlePreview(
  trailerUrl: string | null,
  reducedMotion: boolean,
  playbackFailed: boolean,
) {
  return Boolean(
    trailerUrl &&
      VIDEO_RE.test(trailerUrl) &&
      !reducedMotion &&
      !playbackFailed,
  );
}
```

- [ ] **Step 4: Run the behavior test and verify GREEN**

Run:

```bash
npx tsx --test tests/title-card-behavior.test.ts
```

Expected: 2 pass, 0 fail.

- [ ] **Step 5: Define a serializable shared title shape and variant contract**

At the top of `TitleCard.tsx`, add the client boundary and export these types:

```ts
"use client";

import type { Title, Category, Episode } from "@prisma/client";
import type { TitleCardBehavior } from "@/lib/title-card-behavior";

export type TitleCardTitle = Title & {
  category: Category;
  episodes: Pick<Episode, "durationSec">[];
};

type Props = {
  title: TitleCardTitle;
  index?: number;
  href?: string;
  progressPercent?: number;
  variant?: TitleCardBehavior;
  onRemove?: () => void;
  removeLabel?: string;
};
```

Use `variant = "expanded"` as the default. The Prisma title data and dates remain serializable through the React Server Component boundary. Callback props are supplied only by the already-client `ContinueWatchingCard`, never by a Server Component.

- [ ] **Step 6: Extract the existing artwork and progress presentation into local helpers**

Create `TitleCardArtwork.tsx` with the complete shared image and fallback implementation:

```tsx
import Image from "next/image";

const palette = [
  "linear-gradient(135deg, var(--surface-dark) 0%, var(--cinema-700) 100%)",
  "linear-gradient(135deg, var(--cinema-800) 0%, var(--cinema-600) 100%)",
  "linear-gradient(135deg, var(--muted-foreground) 0%, var(--surface-dark) 100%)",
  "linear-gradient(135deg, var(--surface-dark) 0%, var(--cinema-600) 100%)",
];

export function TitleCardArtwork({
  src,
  alt,
  index,
  sizes,
  className = "object-cover",
}: {
  src: string | null;
  alt: string;
  index: number;
  sizes: string;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{ background: palette[index % palette.length] }}
    />
  );
}
```

Remove the local palette from `TitleCard.tsx`, import `TitleCardArtwork`, and introduce this reusable metadata calculation inside `TitleCard`:

```ts
const totalDuration = title.episodes.reduce(
  (sum, episode) => sum + episode.durationSec,
  0,
);
const playHref = href ?? `/app/watch/${title.slug}`;
const infoHref = `/app/watch/${title.slug}`;
```

The resting artwork must retain:

```tsx
<Image
  src={title.heroImageUrl}
  alt={title.title}
  fill
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
/>
```

- [ ] **Step 7: Implement Variant B without nested interactive elements**

Use a non-link wrapper, a full-card primary `Link`, and sibling action links above it:

```tsx
function CompactTitleCard({
  title,
  index,
  playHref,
  infoHref,
  totalDuration,
  progressPercent,
}: {
  title: TitleCardTitle;
  index: number;
  playHref: string;
  infoHref: string;
  totalDuration: number;
  progressPercent?: number;
}) {
  const t = useTranslations("featuredLibrary");
  const tHome = useTranslations("appHome");
  const locale = useLocale();

  return (
    <div className="group relative aspect-video overflow-hidden rounded-11 border border-border/60 bg-surface-dark text-surface-dark-foreground transition duration-300 ease-out hover:z-10 hover:scale-[1.045] hover:border-primary/70 focus-within:z-10 focus-within:scale-[1.045] motion-reduce:transition-none">
      <Link href={playHref} className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" aria-label={`${tHome("play")}: ${title.title}`}>
        <TitleCardArtwork
          src={title.heroImageUrl}
          alt={title.title}
          index={index}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/25 to-transparent" />
      </Link>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 [text-shadow:0_1px_3px_rgb(var(--black-rgb)/0.7)]">
        <p className="font-accent text-[11px] opacity-85">
          {title.type === "SERIES" ? t("series") : t("film")} · {categoryTitle(title.category, locale)}
        </p>
        <h3 className="mt-1 line-clamp-1 text-lg font-semibold leading-tight">{title.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-[11px] opacity-0 transition-opacity duration-200 group-hover:opacity-85 group-focus-within:opacity-85">
          <span>{formatDuration(totalDuration)}</span>
          {title.publishedAt ? <span>{title.publishedAt.getFullYear()}</span> : null}
        </div>
        <div className="pointer-events-auto mt-3 flex translate-y-2 items-center gap-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transform-none">
          <Link href={playHref} className="inline-flex h-9 items-center gap-2 rounded-11 bg-primary px-3 text-xs font-semibold text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <PlayIcon /> {tHome("play")}
          </Link>
          <Link href={infoHref} aria-label={`${tHome("moreInfo")}: ${title.title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-dark-foreground/25 bg-surface-dark/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <InfoIcon />
          </Link>
        </div>
      </div>
      <ProgressBar percent={progressPercent} />
    </div>
  );
}
```

Define `PlayIcon`, `InfoIcon`, and `ProgressBar` once at module scope. `ProgressBar` returns `null` unless the value is greater than zero and clamps its width with `Math.min(100, Math.max(2, percent))`.

- [ ] **Step 8: Map both date rails to Variant B**

In `app/[locale]/app/page.tsx`, update only the two date rail calls:

```tsx
<TitleCard title={item} index={i} variant="compact" />
```

Inside `TitleCard`, use `isCompactTitleCard(variant)` and return `CompactTitleCard` when true. Use this complete expanded resting branch until Task 4 replaces it with the portal controller:

```tsx
if (isCompactTitleCard(variant)) {
  return (
    <CompactTitleCard
      title={title}
      index={index}
      playHref={playHref}
      infoHref={infoHref}
      totalDuration={totalDuration}
      progressPercent={progressPercent}
    />
  );
}

return (
  <Link
    href={playHref}
    className="group block overflow-hidden rounded-11 border border-border/60 transition-colors duration-300 ease-out hover:border-primary/70 motion-reduce:transition-none"
  >
    <div className="relative aspect-video">
      <TitleCardArtwork
        src={title.heroImageUrl}
        alt={title.title}
        index={index}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-surface-dark via-surface-dark/50 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-surface-dark/60 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-between p-5 text-surface-dark-foreground [text-shadow:0_1px_3px_rgb(var(--black-rgb)/0.7)]">
        <p className="font-accent text-xs opacity-90">
          {title.type === "SERIES" ? t("series") : t("film")} · {categoryTitle(title.category, locale)}
        </p>
        <div>
          <h3 className="line-clamp-2 text-xl font-semibold leading-tight">{title.title}</h3>
          <div className="mt-2 flex items-center justify-between text-xs opacity-80">
            <span>{title.type === "SERIES" ? t("episodesShort", { count: title.episodes.length }) : t("film")}</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>
      </div>
      <ProgressBar percent={progressPercent} />
    </div>
  </Link>
);
```

- [ ] **Step 9: Run behavior tests, lint, and typecheck**

Run:

```bash
npx tsx --test tests/title-card-behavior.test.ts
npm run lint -- components/app/TitleCard.tsx components/app/TitleCardArtwork.tsx 'app/[locale]/app/page.tsx'
npm run typecheck
```

Expected: both commands exit 0.

### Task 4: Anchored Variant A portal and trailer preview

**Files:**

- Create: `components/app/ExpandedTitlePreview.tsx`
- Modify: `components/app/TitleCard.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Implement pointer and keyboard lifecycle in the client component**

`ExpandedTitlePreview.tsx` must begin with `"use client"` and import `createPortal` from `react-dom`. Use these exact timing and position helpers:

```ts
type Props = {
  title: TitleCardTitle;
  index: number;
  playHref: string;
  infoHref: string;
  totalDuration: number;
  progressPercent?: number;
  onRemove?: () => void;
  removeLabel?: string;
};
```

Inside `ExpandedTitlePreview(props: Props)`, derive labels exactly once:

```ts
const t = useTranslations("featuredLibrary");
const tHome = useTranslations("appHome");
const locale = useLocale();
const playLabel = tHome("play");
const moreInfoLabel = tHome("moreInfo");
const filmLabel = t("film");
const typeLabel = title.type === "SERIES" ? t("series") : filmLabel;
const episodeLabel =
  title.type === "SERIES"
    ? t("episodesShort", { count: title.episodes.length })
    : filmLabel;
const localizedCategory = categoryTitle(title.category, locale);
```

```ts
const OPEN_DELAY_MS = 260;
const CLOSE_DELAY_MS = 180;
const VIEWPORT_GUTTER = 16;
const TOPBAR_GUTTER = 76;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clearTimer(
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = null;
}

function getPreviewPosition(rect: DOMRect) {
  const width = clamp(rect.width * 1.52, 360, 480);
  const estimatedHeight = width * (9 / 16) + 238;
  const left = clamp(
    rect.left + rect.width / 2 - width / 2,
    VIEWPORT_GUTTER,
    window.innerWidth - width - VIEWPORT_GUTTER,
  );
  const desiredTop = rect.top + rect.height / 2 - estimatedHeight * 0.36;
  const top = clamp(
    desiredTop,
    TOPBAR_GUTTER,
    Math.max(TOPBAR_GUTTER, window.innerHeight - estimatedHeight - VIEWPORT_GUTTER),
  );
  return { left, top, width };
}
```

Store open and close timers in refs. On a mouse or pen `pointerenter`, measure the source card and open after 260ms. On `pointerleave`, close after 180ms. Cancel the close timer when the pointer enters the portal. Open immediately on keyboard focus. Close on Escape, window resize, or a capturing scroll event. Clear every timer and listener during cleanup.

Use this state and lifecycle implementation:

```tsx
const anchorRef = useRef<HTMLDivElement>(null);
const previewRef = useRef<HTMLDivElement>(null);
const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const [open, setOpen] = useState(false);
const [position, setPosition] = useState<ReturnType<typeof getPreviewPosition> | null>(null);

const cancelClose = useCallback(() => clearTimer(closeTimerRef), []);
const measureAndOpen = useCallback(() => {
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return;
  setPosition(getPreviewPosition(rect));
  setOpen(true);
}, []);
const scheduleClose = useCallback(() => {
  clearTimer(openTimerRef);
  clearTimer(closeTimerRef);
  closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
}, []);
const handlePointerEnter = useCallback((event: PointerEvent<HTMLDivElement>) => {
  if (event.pointerType === "touch") return;
  cancelClose();
  clearTimer(openTimerRef);
  openTimerRef.current = setTimeout(measureAndOpen, OPEN_DELAY_MS);
}, [cancelClose, measureAndOpen]);
const openFromKeyboard = useCallback(() => {
  clearTimer(openTimerRef);
  cancelClose();
  measureAndOpen();
}, [cancelClose, measureAndOpen]);
const handleBlur = useCallback((event: FocusEvent<HTMLElement>) => {
  const next = event.relatedTarget;
  if (
    next instanceof Node &&
    (anchorRef.current?.contains(next) || previewRef.current?.contains(next))
  ) {
    return;
  }
  scheduleClose();
}, [scheduleClose]);

useEffect(() => {
  if (!open) return;
  const close = () => setOpen(false);
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  };
  window.addEventListener("resize", close);
  window.addEventListener("scroll", close, true);
  window.addEventListener("keydown", handleKeyDown);
  return () => {
    window.removeEventListener("resize", close);
    window.removeEventListener("scroll", close, true);
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [open]);

useEffect(
  () => () => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
  },
  [],
);
```

Import `FocusEvent`, `MutableRefObject`, and `PointerEvent` as React types. Import `useCallback`, `useEffect`, `useRef`, `useState`, and `useSyncExternalStore` from React.

- [ ] **Step 2: Render the resting card with no top-right remove button**

The resting card is the current 16:9 `Link`, including image, category, title, duration, and progress bar. Add handlers to its outer wrapper, not to nested action elements:

```tsx
<div
  ref={anchorRef}
  className="relative"
  onPointerEnter={handlePointerEnter}
  onPointerLeave={scheduleClose}
  onFocus={openFromKeyboard}
  onBlur={handleBlur}
>
  <Link
    href={playHref}
    className="group block overflow-hidden rounded-11 border border-border/60 transition-colors duration-300 ease-out hover:border-primary/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
    aria-label={`${playLabel}: ${title.title}`}
  >
    <div className="relative aspect-video">
      <TitleCardArtwork
        src={title.heroImageUrl}
        alt={title.title}
        index={index}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-surface-dark via-surface-dark/50 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-surface-dark/60 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-between p-5 text-surface-dark-foreground [text-shadow:0_1px_3px_rgb(var(--black-rgb)/0.7)]">
        <p className="font-accent text-xs opacity-90">
          {typeLabel} · {localizedCategory}
        </p>
        <div>
          <h3 className="line-clamp-2 text-xl font-semibold leading-tight">{title.title}</h3>
          <div className="mt-2 flex items-center justify-between text-xs opacity-80">
            <span>{title.type === "SERIES" ? episodeLabel : filmLabel}</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>
      </div>
      {progressPercent && progressPercent > 0 ? (
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-surface-dark/55">
          <div
            className="h-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(2, progressPercent))}%` }}
          />
        </div>
      ) : null}
    </div>
  </Link>
</div>
```

- [ ] **Step 3: Render the expanded panel through a portal**

Only render the portal when `open`, `position`, and `document.body` exist:

```tsx
{open && position
  ? createPortal(
      <div
        ref={previewRef}
        role="group"
        aria-label={title.title}
        className="fixed z-[80] bf-title-preview"
        style={position}
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
        onFocus={cancelClose}
        onBlur={handleBlur}
      >
        <div className="overflow-hidden rounded-11 border border-primary/25 bg-surface-dark text-surface-dark-foreground shadow-[0_28px_80px_rgb(var(--shadow-rgb)/0.48)]">
          <PreviewMedia title={title} index={index} />
          <div className="p-5">
            <h3 className="text-2xl font-semibold tracking-tight">{title.title}</h3>
            <p className="mt-1 font-accent text-xs text-primary">
              {typeLabel} · {localizedCategory}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Link href={playHref} className="inline-flex h-11 items-center gap-2 rounded-11 bg-primary px-5 text-sm font-semibold text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-dark-foreground">
                <PlayIcon /> {playLabel}
              </Link>
              <Link href={infoHref} aria-label={`${moreInfoLabel}: ${title.title}`} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-surface-dark-foreground/20 bg-surface-dark-foreground/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <InfoIcon />
              </Link>
              {onRemove && removeLabel ? (
                <button type="button" onClick={onRemove} aria-label={removeLabel} title={removeLabel} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-surface-dark-foreground/20 bg-surface-dark-foreground/10 transition-colors hover:bg-surface-dark-foreground/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <RemoveIcon />
                </button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-dark-foreground/65">
              <span>{title.type === "SERIES" ? episodeLabel : filmLabel}</span>
              <span>{formatDuration(totalDuration)}</span>
              {title.publishedAt ? <span>{title.publishedAt.getFullYear()}</span> : null}
            </div>
            {title.synopsis ? <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-surface-dark-foreground/85">{title.synopsis}</p> : null}
          </div>
        </div>
      </div>,
      document.body,
    )
  : null}
```

Define the SVG icons at module scope and import the localized `Link`, `categoryTitle`, and `formatDuration` helpers directly.

After the portal component is complete, replace the expanded branch in `TitleCard.tsx` with:

```tsx
return (
  <ExpandedTitlePreview
    title={title}
    index={index}
    playHref={playHref}
    infoHref={infoHref}
    totalDuration={totalDuration}
    progressPercent={progressPercent}
    onRemove={onRemove}
    removeLabel={removeLabel}
  />
);
```

- [ ] **Step 4: Add muted trailer fallback media**

Inside `ExpandedTitlePreview.tsx`, reuse the tested browser-playable rule:

```tsx
function PreviewMedia({ title, index }: { title: TitleCardTitle; index: number }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const reducedMotion = useReducedMotion();
  const canPlayTrailer = canAutoplayTitlePreview(
    title.trailerUrl,
    reducedMotion,
    videoFailed,
  );

  return (
    <div className="relative aspect-video overflow-hidden bg-surface-dark">
      <TitleCardArtwork
        src={title.heroImageUrl}
        alt=""
        index={index}
        sizes="480px"
        className="object-cover"
      />
      {canPlayTrailer ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={title.trailerUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={title.heroImageUrl ?? undefined}
          onError={() => setVideoFailed(true)}
        />
      ) : null}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface-dark/65 to-transparent" />
    </div>
  );
}
```

Define the reduced-motion subscription once at module scope:

```ts
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (callback: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const getReducedMotionSnapshot = () =>
  window.matchMedia(REDUCED_MOTION_QUERY).matches;
const getReducedMotionServerSnapshot = () => false;
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
```

- [ ] **Step 5: Add entrance motion and reduced-motion override**

Append to `app/globals.css`:

```css
@keyframes bf-title-preview-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.bf-title-preview > div {
  animation: bf-title-preview-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
  transform-origin: center center;
}

@media (prefers-reduced-motion: reduce) {
  .bf-title-preview > div {
    animation: none;
  }
}
```

- [ ] **Step 6: Run lint and typecheck**

Run:

```bash
npm run lint -- components/app/TitleCard.tsx components/app/ExpandedTitlePreview.tsx
npm run typecheck
```

Expected: both commands exit 0.

### Task 5: Move Continue Watching removal into Variant A

**Files:**

- Modify: `components/app/ContinueWatchingCard.tsx`

- [ ] **Step 1: Replace the visible cross with callback props**

Keep the existing React Query mutation and optimistic `null` return. Remove the absolutely positioned `<button>` and its SVG. Render:

```tsx
return (
  <div className="w-64 shrink-0 sm:w-72 xl:w-80">
    <TitleCard
      title={title}
      index={index}
      href={href}
      progressPercent={percent}
      variant="expanded"
      onRemove={() => remove.mutate()}
      removeLabel={removeLabel}
    />
    <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
  </div>
);
```

Delete the unused `MouseEvent` import and `handleRemove`. The remove control now exists only in the portal panel, so no nested-link prevention is necessary.

- [ ] **Step 2: Verify removal typing and current mutation behavior**

Run:

```bash
npm run lint -- components/app/ContinueWatchingCard.tsx components/app/TitleCard.tsx components/app/ExpandedTitlePreview.tsx
npm run typecheck
```

Expected: both commands exit 0, and `onRemove` is accepted only at the client-to-client boundary.

### Task 6: Regression and production verification

**Files:**

- Verify all files above

- [ ] **Step 1: Run the targeted test**

Run:

```bash
npx tsx --test tests/content-date-windows.test.ts tests/title-card-behavior.test.ts
```

Expected: 8 pass, 0 fail.

- [ ] **Step 2: Run the complete test suite**

Run:

```bash
npm test
```

Expected: all tests pass, 0 fail.

- [ ] **Step 3: Run lint and typecheck**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit 0 with no errors.

- [ ] **Step 4: Run the production build**

Run:

```bash
npm run build
```

Expected: Prisma generation and Next.js production build both exit 0.

- [ ] **Step 5: Review the unstaged diff**

Run:

```bash
git diff -- 'app/[locale]/app/page.tsx' app/globals.css components/app/TitleCard.tsx components/app/TitleCardArtwork.tsx components/app/ExpandedTitlePreview.tsx components/app/ContinueWatchingCard.tsx lib/content-date-windows.ts lib/title-card-behavior.ts messages/tr.json messages/en.json messages/de.json tests/content-date-windows.test.ts tests/title-card-behavior.test.ts
git status --short
```

Expected: only the intended unstaged project changes plus the user’s pre-existing changes are present. Do not stage or commit anything.
