# Busyflix Loading Screen Design

Date: 2026-07-16

## Goal

Prevent the brief white frame and disappearing UI seen during locale changes, while adding a restrained Busyflix branded loading experience for the initial document load.

## Scope

The loading screen appears only in these situations:

1. The first document load in a browser tab.
2. Every locale change initiated from `LocaleSwitcher`.

It does not appear during ordinary client-side navigation, search, form submission, data refresh, or theme changes.

## Root Cause

`LocaleSwitcher` intentionally writes the `NEXT_LOCALE` cookie and performs a full document reload. During replacement of the document, the root `.dark` class can disappear before the theme initialization script restores it. The browser can therefore paint an incomplete light frame even when the selected theme is dark.

## Architecture

Add one global loading overlay directly under `ThemeInitScript` in the locale root layout. The overlay remains mounted for the life of the document and is controlled through a state attribute on `document.documentElement`.

The theme initialization script marks the initial document as loading before the first content paint. The client loading component removes that state after hydration, subject to the minimum display duration. `LocaleSwitcher` activates the same state synchronously before writing the locale cookie and reloading the document.

This structure avoids application-wide React state, keeps interaction in a small client leaf, and covers both sides of the full reload without depending on route-level `loading.tsx` behavior.

## Visual Design

- Full viewport fixed overlay using the always-dark `surface-dark` theme token.
- Existing `/logo-transparent.webp` mark centered at a responsive size.
- Logo enters with a small opacity and scale transition.
- A thin primary-colored progress line travels beneath the logo.
- No spinner, status text, glass panel, outer glow, or new color source.
- Overlay remains above all page chrome and blocks pointer input while active.
- Exit uses opacity and transform only, then the overlay becomes hidden and non-interactive.

## Timing

- Initial load minimum visible duration: 450 ms.
- Locale switch activation is painted before reload begins.
- A safety timeout clears the overlay if the normal hydration completion path does not run.
- Locale reload reuses the same visual state so the transition appears continuous across document replacement.
- The implementation must not add a fixed delay to ordinary page navigation.

## Accessibility

- The overlay exposes a polite loading status for assistive technology.
- While visible, it is marked busy and prevents accidental interaction with the page beneath it.
- Under `prefers-reduced-motion: reduce`, logo scaling and progress movement are disabled. A short opacity change is retained.
- The logo has meaningful Busyflix loading alternative text without duplicating decorative content.

## Failure Handling

- The document background is always dark while the initial theme is unresolved, so delayed image decoding cannot expose a white frame.
- The loading mark uses a local project asset and does not require network access.
- A bounded fallback timeout prevents the overlay from remaining indefinitely after a client initialization error.
- Without JavaScript, the loading state must not permanently block the rendered page.

## Components and Files

- Create `components/providers/BusyflixLoadingScreen.tsx` as the isolated client controller and overlay markup.
- Update `components/providers/ThemeInitScript.tsx` or its shared initialization string to activate the boot state before paint.
- Update `components/LocaleSwitcher.tsx` to activate the overlay before the locale reload.
- Update `app/[locale]/layout.tsx` to mount the overlay once at the document root.
- Update `app/globals.css` with token-based loading screen animation and reduced-motion rules.
- Add focused behavior tests for initial state, locale activation, timing constants, reduced motion policy, and the no-JavaScript escape path.

## Acceptance Criteria

1. A dark-theme first load never paints a white background before application content.
2. Selecting another locale displays the Busyflix overlay before the current UI disappears.
3. The overlay remains visually continuous across the full document reload.
4. The destination locale and stored theme remain correct.
5. Ordinary in-app navigation does not show the global overlay.
6. Reduced-motion users do not receive scaling or travelling-line animation.
7. Mobile and desktop layouts keep the logo centered without overflow.
8. The overlay cannot remain permanently active after its bounded safety timeout.
9. Existing unstaged card, tooltip, audit, and security changes remain intact.

## Verification

- Unit and source-policy tests for the loading state controller and locale integration.
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Visual verification at desktop and mobile widths when an allowed browser connection is available.
- Reduced-motion verification through browser emulation when an allowed browser connection is available.
