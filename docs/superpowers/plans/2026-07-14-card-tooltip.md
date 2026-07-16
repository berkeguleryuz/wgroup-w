# Card Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved cream portal tooltip to icon-only actions in the new A and B title card variants.

**Architecture:** Keep timing and viewport geometry in a pure helper module so the behavior is covered by the existing `node:test` suite. Render the visual tooltip through a focused client component that clones one trigger to add `aria-describedby`, portals the label to `document.body`, and closes on blur, Escape, scroll, and resize. Integrate the component only around the information and removal icon controls.

**Tech Stack:** Next.js 16.2.10 App Router, React 19, TypeScript, Tailwind CSS v4, `next-intl`, `node:test`, agent-browser.

**Workspace constraint:** Work directly in the existing project directory. Do not create a worktree. Do not stage, commit, push, or create a PR. Preserve all existing unstaged changes.

---

## File Map

- Create `lib/tooltip-behavior.ts`: pure delay and viewport positioning behavior.
- Create `tests/app/tooltip-behavior.test.ts`: node-level tests for delays, collision handling, and side selection.
- Create `components/ui/Tooltip.tsx`: portal, timers, accessibility, and browser event handling.
- Modify `app/globals.css`: approved entry animation and reduced-motion override.
- Modify `components/app/TitleCard.tsx`: wrap the B variant information icon and remove its native `title`.
- Modify `components/app/ExpandedTitlePreview.tsx`: wrap A variant information and removal icons and remove native `title` attributes.

### Task 1: Confirm Framework Rules and Baseline

**Files:**

- Read: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Read: `node_modules/next/dist/docs/03-architecture/accessibility.md`
- Inspect: `components/app/TitleCard.tsx`
- Inspect: `components/app/ExpandedTitlePreview.tsx`

- [ ] **Step 1: Read the installed Next.js client-component guide**

Run:

```bash
sed -n '1,260p' node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
```

Expected: the installed Next.js 16 guide confirms that browser APIs, state, and event handlers belong in a Client Component.

- [ ] **Step 2: Read the installed accessibility guide**

Run:

```bash
sed -n '1,260p' node_modules/next/dist/docs/03-architecture/accessibility.md
```

Expected: the installed guide is read before implementing the focus and ARIA behavior.

- [ ] **Step 3: Capture the current workspace baseline**

Run:

```bash
git status --short
git diff --check
```

Expected: existing card work and QA artifacts remain unstaged, and `git diff --check` emits no errors.

### Task 2: Build Tooltip Behavior with TDD

**Files:**

- Create: `tests/app/tooltip-behavior.test.ts`
- Create: `lib/tooltip-behavior.ts`

- [ ] **Step 1: Write the failing behavior tests**

Create `tests/app/tooltip-behavior.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  getTooltipDelay,
  getTooltipPosition,
} from "../../lib/tooltip-behavior";

test("uses the approved pointer, focus, and close delays", () => {
  assert.equal(getTooltipDelay("pointer-open"), 250);
  assert.equal(getTooltipDelay("focus-open"), 0);
  assert.equal(getTooltipDelay("close"), 100);
  assert.equal(getTooltipDelay("escape"), 0);
});

test("positions a tooltip above a centered trigger", () => {
  assert.deepEqual(
    getTooltipPosition(
      { left: 500, top: 200, bottom: 240, width: 40 },
      { width: 120, height: 32 },
      { width: 1200, height: 800 },
    ),
    { left: 460, top: 158, side: "top", arrowLeft: 60 },
  );
});

test("clamps tooltips at the left and right viewport gutters", () => {
  const left = getTooltipPosition(
    { left: 0, top: 200, bottom: 240, width: 40 },
    { width: 120, height: 32 },
    { width: 320, height: 640 },
  );
  const right = getTooltipPosition(
    { left: 290, top: 200, bottom: 240, width: 30 },
    { width: 120, height: 32 },
    { width: 320, height: 640 },
  );

  assert.equal(left.left, 12);
  assert.equal(left.arrowLeft, 12);
  assert.equal(right.left, 188);
  assert.equal(right.arrowLeft, 108);
});

test("moves the tooltip below when there is no room above", () => {
  assert.deepEqual(
    getTooltipPosition(
      { left: 100, top: 10, bottom: 50, width: 40 },
      { width: 120, height: 32 },
      { width: 320, height: 640 },
    ),
    { left: 60, top: 60, side: "bottom", arrowLeft: 60 },
  );
});
```

- [ ] **Step 2: Run the focused test and verify that it fails**

Run:

```bash
./node_modules/.bin/tsx --test tests/app/tooltip-behavior.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/tooltip-behavior`.

- [ ] **Step 3: Implement the pure behavior module**

Create `lib/tooltip-behavior.ts`:

```ts
export const TOOLTIP_OPEN_DELAY_MS = 250;
export const TOOLTIP_CLOSE_DELAY_MS = 100;
export const TOOLTIP_VIEWPORT_GUTTER = 12;
export const TOOLTIP_TRIGGER_GAP = 10;

export type TooltipAction =
  | "pointer-open"
  | "focus-open"
  | "close"
  | "escape";

export type TooltipSide = "top" | "bottom";

export type TooltipPosition = {
  left: number;
  top: number;
  side: TooltipSide;
  arrowLeft: number;
};

type AnchorRect = {
  left: number;
  top: number;
  bottom: number;
  width: number;
};

type Size = { width: number; height: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getTooltipDelay(action: TooltipAction) {
  if (action === "pointer-open") return TOOLTIP_OPEN_DELAY_MS;
  if (action === "close") return TOOLTIP_CLOSE_DELAY_MS;
  return 0;
}

export function getTooltipPosition(
  anchor: AnchorRect,
  tooltip: Size,
  viewport: Size,
): TooltipPosition {
  const maxLeft = Math.max(
    TOOLTIP_VIEWPORT_GUTTER,
    viewport.width - tooltip.width - TOOLTIP_VIEWPORT_GUTTER,
  );
  const desiredLeft = anchor.left + anchor.width / 2 - tooltip.width / 2;
  const left = clamp(
    desiredLeft,
    TOOLTIP_VIEWPORT_GUTTER,
    maxLeft,
  );

  const above = anchor.top - TOOLTIP_TRIGGER_GAP - tooltip.height;
  const maxTop = Math.max(
    TOOLTIP_VIEWPORT_GUTTER,
    viewport.height - tooltip.height - TOOLTIP_VIEWPORT_GUTTER,
  );
  const side: TooltipSide =
    above >= TOOLTIP_VIEWPORT_GUTTER ? "top" : "bottom";
  const top =
    side === "top"
      ? above
      : clamp(anchor.bottom + TOOLTIP_TRIGGER_GAP, TOOLTIP_VIEWPORT_GUTTER, maxTop);
  const arrowLeft = clamp(
    anchor.left + anchor.width / 2 - left,
    TOOLTIP_VIEWPORT_GUTTER,
    Math.max(TOOLTIP_VIEWPORT_GUTTER, tooltip.width - TOOLTIP_VIEWPORT_GUTTER),
  );

  return { left, top, side, arrowLeft };
}
```

- [ ] **Step 4: Run the focused test and verify that it passes**

Run:

```bash
./node_modules/.bin/tsx --test tests/app/tooltip-behavior.test.ts
```

Expected: 4 tests pass, 0 fail.

### Task 3: Implement the Reusable Portal Tooltip

**Files:**

- Create: `components/ui/Tooltip.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Create the client component**

Create `components/ui/Tooltip.tsx` with these complete behaviors:

```tsx
"use client";

import {
  cloneElement,
  type CSSProperties,
  type FocusEvent,
  type MutableRefObject,
  type PointerEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  getTooltipDelay,
  getTooltipPosition,
  type TooltipPosition,
} from "@/lib/tooltip-behavior";

type TriggerProps = { "aria-describedby"?: string };

type Props = {
  label: string;
  children: ReactElement<TriggerProps>;
};

function clearTimer(timer: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timer.current) clearTimeout(timer.current);
  timer.current = null;
}

export function Tooltip({ label, children }: Props) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const closeNow = useCallback(() => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    setOpen(false);
    setPosition(null);
  }, []);

  const scheduleOpen = useCallback((delay: number) => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    openTimerRef.current = setTimeout(() => setOpen(true), delay);
  }, []);

  const scheduleClose = useCallback(() => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    closeTimerRef.current = setTimeout(closeNow, getTooltipDelay("close"));
  }, [closeNow]);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current?.getBoundingClientRect();
    const tooltip = tooltipRef.current?.getBoundingClientRect();
    if (!anchor || !tooltip) return;

    setPosition(
      getTooltipPosition(
        {
          left: anchor.left,
          top: anchor.top,
          bottom: anchor.bottom,
          width: anchor.width,
        },
        { width: tooltip.width, height: tooltip.height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [label, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNow();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeNow);
    window.addEventListener("scroll", closeNow, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeNow);
      window.removeEventListener("scroll", closeNow, true);
    };
  }, [closeNow, open]);

  useEffect(
    () => () => {
      clearTimer(openTimerRef);
      clearTimer(closeTimerRef);
    },
    [],
  );

  const handlePointerEnter = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch") return;
    scheduleOpen(getTooltipDelay("pointer-open"));
  };

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && anchorRef.current?.contains(next)) return;
    scheduleClose();
  };

  const describedBy = [children.props["aria-describedby"], id]
    .filter(Boolean)
    .join(" ");
  const trigger = cloneElement(children, { "aria-describedby": describedBy });
  const portalStyle: CSSProperties = position
    ? { left: position.left, top: position.top }
    : { left: 0, top: 0, visibility: "hidden" };

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={scheduleClose}
      onFocus={() => scheduleOpen(getTooltipDelay("focus-open"))}
      onBlur={handleBlur}
    >
      {trigger}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              id={id}
              role="tooltip"
              data-side={position?.side ?? "top"}
              className="bf-tooltip pointer-events-none fixed z-[100] max-w-[min(16rem,calc(100vw-24px))] rounded-11 bg-primary px-3 py-2 text-center text-xs font-semibold leading-none text-primary-foreground shadow-[0_12px_32px_rgb(var(--shadow-rgb)/0.35)]"
              style={portalStyle}
            >
              {label}
              {position ? (
                <span
                  aria-hidden
                  className={`absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-primary ${
                    position.side === "top" ? "-bottom-1" : "-top-1"
                  }`}
                  style={{ left: position.arrowLeft }}
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
```

- [ ] **Step 2: Add the approved entry animation**

Append the following near the existing title preview animation in `app/globals.css`:

```css
@keyframes bf-tooltip-in {
  from {
    opacity: 0;
    transform: translateY(var(--bf-tooltip-offset, 3px));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bf-tooltip {
  --bf-tooltip-offset: 3px;
  animation: bf-tooltip-in 140ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.bf-tooltip[data-side="bottom"] {
  --bf-tooltip-offset: -3px;
}
```

Extend the existing reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
  .bf-title-preview > article,
  .bf-tooltip {
    animation: none;
  }
}
```

- [ ] **Step 3: Run focused tests, lint, and typecheck**

Run:

```bash
./node_modules/.bin/tsx --test tests/app/tooltip-behavior.test.ts
npm run lint
npm run typecheck
```

Expected: focused tests pass, ESLint exits 0, and TypeScript exits 0. If React element typing differs in the installed React 19 types, adjust only `TriggerProps` and the `cloneElement` call, keeping the public API and ARIA behavior unchanged.

### Task 4: Integrate Tooltip into A and B Cards

**Files:**

- Modify: `components/app/TitleCard.tsx:6-14,128-144`
- Modify: `components/app/ExpandedTitlePreview.tsx:16-21,272-299`

- [ ] **Step 1: Add the Tooltip import to both card files**

Add:

```ts
import { Tooltip } from "@/components/ui/Tooltip";
```

- [ ] **Step 2: Wrap the B variant information link**

Replace the information link in `CompactTitleCard` with:

```tsx
<Tooltip label={tHome("moreInfo")}>
  <Link
    href={infoHref}
    aria-label={`${tHome("moreInfo")}: ${title.title}`}
    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-dark-foreground/25 bg-surface-dark/80 transition-colors hover:bg-surface-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <InfoIcon />
  </Link>
</Tooltip>
```

The native `title` attribute must not remain.

- [ ] **Step 3: Wrap the A variant information link**

Replace the information link in `ExpandedTitlePreview` with:

```tsx
<Tooltip label={moreInfoLabel}>
  <Link
    href={infoHref}
    aria-label={`${moreInfoLabel}: ${title.title}`}
    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-surface-dark-foreground/20 bg-surface-dark-foreground/10 transition-colors hover:bg-surface-dark-foreground/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <InfoIcon />
  </Link>
</Tooltip>
```

- [ ] **Step 4: Wrap the conditional removal button**

Replace the removal button block with:

```tsx
{onRemove && removeLabel ? (
  <Tooltip label={removeLabel}>
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-surface-dark-foreground/20 bg-surface-dark-foreground/10 transition-colors hover:bg-surface-dark-foreground/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <RemoveIcon />
    </button>
  </Tooltip>
) : null}
```

The native `title` attribute must not remain.

- [ ] **Step 5: Run the complete automated verification suite**

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: all tests pass and all three project verification commands exit 0.

### Task 5: Browser Verification and Handoff

**Files:**

- Add screenshots under: `artifacts/card-tooltip-qa/screenshots/`
- Add report: `artifacts/card-tooltip-qa/report.md`

- [ ] **Step 1: Start the app on the configured auth origin**

Run:

```bash
BETTER_AUTH_URL=http://localhost:3050 NEXT_PUBLIC_APP_URL=http://localhost:3050 npm run dev -- --port 3050
```

Expected: Next.js reports ready at `http://localhost:3050`.

- [ ] **Step 2: Sign in with the active individual demo account**

Use agent-browser and the local ignored `DEMO-ACCOUNTS` credentials without printing the shared password. Open `http://localhost:3050/tr/app` and verify the redirect reaches `/app`.

- [ ] **Step 3: Verify the A information and removal tooltips**

At 1440x1000:

1. Hover a standard card for at least 260 ms to open the expanded panel.
2. Hover the information icon for less than 250 ms and verify no tooltip is present.
3. Continue hovering past 250 ms and verify the cream tooltip appears.
4. Move away and verify it closes after approximately 100 ms.
5. Repeat for the removal icon in İzlemeye Devam Et.
6. Capture screenshots of both open tooltip states.

Expected: tooltips render above the icons, use the cream design, and are not clipped by the card or carousel.

- [ ] **Step 4: Verify keyboard and Escape behavior**

Use Tab to focus each icon-only action. Verify the tooltip appears immediately, `aria-describedby` points to a `role="tooltip"` element, and Escape closes it without moving focus.

- [ ] **Step 5: Verify viewport and reduced-motion behavior**

1. Test a first-card and last-card tooltip at 1440x1000.
2. Test at 390x844 and confirm no horizontal document overflow.
3. Enable `prefers-reduced-motion: reduce` and verify `.bf-tooltip` has `animation-name: none`.

Expected: tooltip rects remain within a 12 px viewport gutter and no movement animation runs under reduced motion.

- [ ] **Step 6: Verify the B integration when fixture data permits**

If `Yeni eklenenler` or `Bu ay eklenenler` is visible, hover and focus its information icon and capture the result. If neither shelf renders, record that fixture limitation without changing database publication dates.

- [ ] **Step 7: Write the QA report and close test processes**

Record measurements, screenshots, console findings, and any fixture limitation in `artifacts/card-tooltip-qa/report.md`. Close the agent-browser session and stop only the dev server started for this task.

- [ ] **Step 8: Confirm the final workspace remains unstaged**

Run:

```bash
git status --short
git diff --check
```

Expected: implementation, tests, design documents, and QA artifacts remain unstaged. No commit, push, or PR exists.
