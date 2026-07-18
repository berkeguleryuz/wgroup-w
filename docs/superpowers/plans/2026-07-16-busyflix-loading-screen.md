# Busyflix Loading Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Project rules override worktree and commit instructions, so all edits stay in the current workspace and remain unstaged.

**Goal:** Add a Busyflix branded full-screen loader for the first document load in a browser tab and every locale change, without showing it during ordinary client navigation.

**Architecture:** A pure browser-state module owns session keys, timing, document attributes, and the pre-paint initialization script. One isolated client component renders the persistent overlay and clears boot loading after hydration. `LocaleSwitcher` activates the same overlay before its existing full reload, keeping the transition visually continuous.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, next/image, node:test.

---

### Task 1: Loading state policy

**Files:**

- Create: `lib/busyflix-loading.ts`
- Create: `tests/app/busyflix-loading.test.ts`

- [x] **Step 1: Write failing policy tests**

Create tests with an in-memory `Storage` substitute. Cover the first boot, repeat loads, locale precedence, minimum timing, and the double animation-frame reload barrier:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSYFLIX_BOOT_SEEN_KEY,
  BUSYFLIX_LOCALE_PENDING_KEY,
  BUSYFLIX_MINIMUM_VISIBLE_MS,
  markBusyflixLocalePending,
  remainingBusyflixLoadingTime,
  reloadAfterBusyflixLoadingPaint,
  resolveBusyflixInitialReason,
} from "../../lib/busyflix-loading";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("shows boot loading only on the first document load in a tab", () => {
  const session = storage();
  assert.equal(resolveBusyflixInitialReason(session), "boot");
  assert.equal(session.getItem(BUSYFLIX_BOOT_SEEN_KEY), "1");
  assert.equal(resolveBusyflixInitialReason(session), null);
});

test("locale loading takes precedence and consumes its one-shot marker", () => {
  const session = storage();
  markBusyflixLocalePending(session);
  assert.equal(session.getItem(BUSYFLIX_LOCALE_PENDING_KEY), "1");
  assert.equal(resolveBusyflixInitialReason(session), "locale");
  assert.equal(session.getItem(BUSYFLIX_LOCALE_PENDING_KEY), null);
});

test("keeps the loader visible for the approved minimum duration", () => {
  assert.equal(remainingBusyflixLoadingTime(1000, 1200), 250);
  assert.equal(
    remainingBusyflixLoadingTime(1000, 1000 + BUSYFLIX_MINIMUM_VISIBLE_MS),
    0,
  );
});

test("reloads only after two animation frames", () => {
  const frames: FrameRequestCallback[] = [];
  let reloads = 0;
  reloadAfterBusyflixLoadingPaint(
    () => reloads++,
    (callback) => frames.push(callback),
  );
  assert.equal(reloads, 0);
  frames.shift()?.(0);
  assert.equal(reloads, 0);
  frames.shift()?.(16);
  assert.equal(reloads, 1);
});
```

- [x] **Step 2: Run the test and confirm the red state**

Run: `npx tsx --test tests/app/busyflix-loading.test.ts`

Expected: FAIL because `lib/busyflix-loading.ts` does not exist.

- [x] **Step 3: Implement the pure state and timing module**

Create `lib/busyflix-loading.ts` with these public contracts:

```ts
export type BusyflixLoadingReason = "boot" | "locale";

export const BUSYFLIX_LOADING_ATTRIBUTE = "data-busyflix-loading";
export const BUSYFLIX_LOADING_STARTED_ATTRIBUTE =
  "data-busyflix-loading-started";
export const BUSYFLIX_BOOT_SEEN_KEY = "busyflix:boot-seen:v1";
export const BUSYFLIX_LOCALE_PENDING_KEY = "busyflix:locale-pending:v1";
export const BUSYFLIX_MINIMUM_VISIBLE_MS = 450;
export const BUSYFLIX_SAFETY_TIMEOUT_MS = 4000;

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function resolveBusyflixInitialReason(
  storage: SessionStorageLike,
): BusyflixLoadingReason | null {
  const localePending = storage.getItem(BUSYFLIX_LOCALE_PENDING_KEY) === "1";
  const bootSeen = storage.getItem(BUSYFLIX_BOOT_SEEN_KEY) === "1";
  storage.setItem(BUSYFLIX_BOOT_SEEN_KEY, "1");
  if (localePending) {
    storage.removeItem(BUSYFLIX_LOCALE_PENDING_KEY);
    return "locale";
  }
  return bootSeen ? null : "boot";
}
```

Add:

```ts
export function markBusyflixLocalePending(storage: SessionStorageLike) {
  storage.setItem(BUSYFLIX_LOCALE_PENDING_KEY, "1");
}

export function remainingBusyflixLoadingTime(startedAt: number, now: number) {
  return Math.max(0, BUSYFLIX_MINIMUM_VISIBLE_MS - (now - startedAt));
}

export function reloadAfterBusyflixLoadingPaint(
  reload: () => void = () => window.location.reload(),
  schedule: (callback: FrameRequestCallback) => number =
    window.requestAnimationFrame.bind(window),
) {
  schedule(() => schedule(() => reload()));
}
```

Also export browser-only `activateBusyflixLoading(reason)` and `clearBusyflixLoading()` functions. Activation writes both root attributes, stores the locale marker for locale transitions, and starts a bounded safety timeout. Clearing removes both attributes.

- [x] **Step 4: Generate the pre-paint script from the shared constants**

Export `busyflixLoadingInitScript`. It must:

1. Read the locale marker and boot-seen marker from `sessionStorage`.
2. Select `"locale"`, `"boot"`, or no loading reason.
3. Consume the locale marker and set the boot-seen marker.
4. Write the loading reason and `Date.now()` to the root attributes before paint.
5. Schedule a safety clear after `BUSYFLIX_SAFETY_TIMEOUT_MS`.
6. Fall back to a boot loader for the current document if storage access throws.

- [x] **Step 5: Run the focused tests**

Run: `npx tsx --test tests/app/busyflix-loading.test.ts`

Expected: all policy tests PASS.

### Task 2: Global Busyflix overlay

**Files:**

- Create: `components/providers/BusyflixLoadingScreen.tsx`
- Modify: `components/providers/ThemeInitScript.tsx`
- Modify: `app/[locale]/layout.tsx`
- Modify: `app/globals.css`
- Modify: `tests/app/busyflix-loading.test.ts`

- [x] **Step 1: Add failing integration policy assertions**

Read the component, root layout, init script, and CSS as source text. Assert that:

```ts
assert.match(layout, /<BusyflixLoadingScreen\s*\/>/);
assert.match(initScript, /busyflixLoadingInitScript/);
assert.match(component, /logo-transparent\.webp/);
assert.match(component, /remainingBusyflixLoadingTime/);
assert.match(css, /html\[data-busyflix-loading\]/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);
assert.doesNotMatch(component, /setInterval/);
```

- [x] **Step 2: Run the focused tests and confirm they fail**

Run: `npx tsx --test tests/app/busyflix-loading.test.ts`

Expected: FAIL because the overlay component and integration do not exist.

- [x] **Step 3: Implement the isolated overlay component**

Create a client leaf that always renders one fixed overlay and clears active boot state after the remaining minimum duration:

```tsx
"use client";

import { useEffect } from "react";
import Image from "next/image";

import {
  BUSYFLIX_LOADING_STARTED_ATTRIBUTE,
  clearBusyflixLoading,
  remainingBusyflixLoadingTime,
} from "@/lib/busyflix-loading";

export function BusyflixLoadingScreen() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute("data-busyflix-loading")) return;
    const startedAt = Number(
      root.getAttribute(BUSYFLIX_LOADING_STARTED_ATTRIBUTE),
    );
    const delay = remainingBusyflixLoadingTime(
      Number.isFinite(startedAt) ? startedAt : Date.now(),
      Date.now(),
    );
    const timeout = window.setTimeout(clearBusyflixLoading, delay);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div
      className="bf-loading-screen"
      role="status"
      aria-live="polite"
      aria-label="Busyflix"
      aria-busy="true"
    >
      <div className="bf-loading-screen__content">
        <Image
          className="bf-loading-screen__logo"
          src="/logo-transparent.webp"
          alt=""
          width={480}
          height={640}
          priority
        />
        <span className="bf-loading-screen__track" aria-hidden="true">
          <span className="bf-loading-screen__progress" />
        </span>
      </div>
    </div>
  );
}
```

- [x] **Step 4: Mount it once and combine the boot scripts**

Render `<BusyflixLoadingScreen />` immediately after `<ThemeInitScript />` in `app/[locale]/layout.tsx`. In `ThemeInitScript.tsx`, combine `themeInitScript` and `busyflixLoadingInitScript` into the existing stable module-level script element so React does not remount a new script element during locale changes.

- [x] **Step 5: Add token-based CSS and reduced-motion behavior**

Add `.bf-loading-screen` styles using `var(--surface-dark)`, `var(--surface-dark-foreground)`, `var(--primary)`, and `var(--shadow-rgb)`. Use fixed positioning, opacity, visibility, pointer-events, scale, and translate transforms only. Active state is selected by `html[data-busyflix-loading] .bf-loading-screen`.

Use a responsive logo width with `clamp(5.5rem, 12vw, 8rem)`. Animate the logo once and loop only the thin progress line while active. Under `prefers-reduced-motion: reduce`, disable both keyframe animations and retain a short opacity exit.

- [x] **Step 6: Run the focused test, lint, and typecheck**

Run:

```bash
npx tsx --test tests/app/busyflix-loading.test.ts
npm run lint
npm run typecheck
```

Expected: all commands PASS.

### Task 3: Locale transition integration

**Files:**

- Modify: `components/LocaleSwitcher.tsx`
- Modify: `tests/app/busyflix-loading.test.ts`

- [x] **Step 1: Add a failing locale integration assertion**

Assert that `LocaleSwitcher` imports and calls both `activateBusyflixLoading("locale")` and `reloadAfterBusyflixLoadingPaint()` and no longer calls `window.location.reload()` directly.

- [x] **Step 2: Run the focused test and confirm it fails**

Run: `npx tsx --test tests/app/busyflix-loading.test.ts`

Expected: FAIL because direct reload remains.

- [x] **Step 3: Activate the overlay before the existing locale reload**

Keep cookie behavior unchanged. Replace direct reload with:

```ts
activateBusyflixLoading("locale");
document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
reloadAfterBusyflixLoadingPaint();
```

This gives the browser two animation frames to paint the overlay before document replacement.

- [x] **Step 4: Run focused and full verification**

Run:

```bash
npx tsx --test tests/app/busyflix-loading.test.ts
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: all tests and checks PASS, with the production build completing successfully.

### Task 4: Visual and workspace verification

**Files:**

- No code changes unless verification exposes a specific defect.

- [ ] **Step 1: Verify first load and locale change**

When an allowed browser connection is available, verify a fresh tab and TR, EN, DE locale changes. Confirm the overlay paints before content disappears, the destination locale is correct, and no white frame appears.

- [ ] **Step 2: Verify responsive and motion variants**

Check desktop and mobile widths. Emulate `prefers-reduced-motion: reduce` and confirm the logo remains centered while scale and progress animations are disabled.

Chrome MCP was not available in this session. Browser automation was not substituted because project rules allow only Chrome MCP for browser interaction.

- [x] **Step 3: Confirm workspace constraints**

Run `git status --short`. Confirm all existing and new changes remain unstaged. Do not add, commit, push, or create a pull request.
