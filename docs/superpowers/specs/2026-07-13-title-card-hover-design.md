# Title Card Hover and Date Rails Design

## Goal

Upgrade the content rails with two deliberate card experiences:

1. A rich Prime-style expanded preview for the standard content rails.
2. A compact hover treatment for date-driven discovery rails.

The existing top-right remove button on Continue Watching cards moves into the expanded preview actions. Date-driven rails must use `publishedAt`, not record creation or update timestamps.

## Scope

### Variant A: Expanded preview

Use Variant A for:

- Continue Watching
- Series
- Films
- Talent Management
- Other standard `TitleCard` consumers unless they explicitly request Variant B

The resting card remains a 16:9 landscape card. Pointer hover or keyboard focus opens a richer preview directly above the source card without moving neighboring cards or changing the carousel layout.

The expanded preview contains:

- Hero image or muted trailer preview
- Title
- Play action
- More Information action
- Category
- Content type
- Episode count for series
- Total duration
- Publication year
- Short synopsis
- Remove action only when the source is a Continue Watching card

If `trailerUrl` exists, the preview starts it muted, looping, and inline. The video is created only while the preview is open so resting rails do not download or play every trailer. If the trailer cannot play, the hero image remains visible as the fallback.

### Variant B: Compact date card

Use Variant B only for:

- New Releases
- Added This Month

The card grows slightly inside its own visual footprint. Title, essential metadata, Play, and More Information appear over the image. It does not open the large description panel used by Variant A.

## Date Semantics

All date filtering uses `Title.publishedAt`.

- New Releases includes titles published from Monday 00:00 through the exclusive boundary at the following Monday 00:00.
- Added This Month includes titles published during the current calendar month.
- A title from the current week may appear in both rails. This repetition is intentional.
- Week and month boundaries use the `Europe/Berlin` time zone and must remain correct across daylight saving changes.
- The upper boundary is exclusive, which prevents items exactly at the next period boundary from entering the wrong rail.
- Published titles with a null `publishedAt` do not appear in either date rail.

Both queries continue to enforce the existing audience visibility rules and order results by `publishedAt` descending.

## Component Architecture

### `TitleCard`

`TitleCard` remains the shared entry point and receives an explicit visual variant. Its resting card preserves the existing theme tokens, 11px radius, progress bar, localized category label, and optimized `next/image` behavior.

### Expanded preview controller

A focused client component owns Variant A interaction state. It:

- Opens after a short hover delay to prevent accidental flashes while the pointer crosses a rail
- Opens immediately for keyboard focus
- Keeps the panel open while the pointer moves from the source card into the panel
- Closes after a short leave delay
- Measures the source card and anchors a portal layer to it
- Clamps the panel inside the viewport near the first and last cards
- Does not activate for touch-only pointers
- Closes on Escape

A portal is required because the horizontal carousel uses overflow scrolling, which would otherwise clip a panel that grows above and below the rail.

### Preview media

A small client media component renders the trailer only while the expanded preview is active. It always sets `muted`, `playsInline`, and `loop`. Playback failure preserves the underlying image.

### Continue Watching removal

`ContinueWatchingCard` continues to own the existing progress deletion mutation. It passes its remove action and localized accessible label into Variant A. The always-visible top-right cross is removed. Removing a title remains optimistic and invalidates the existing progress query.

### Date window helper

A pure server-safe helper calculates the Berlin week and month start and end instants from a supplied current time. Supplying the clock makes boundary behavior deterministic in tests.

## Responsive and Accessible Behavior

- Fine pointer devices receive hover interaction.
- Keyboard focus opens Variant A and exposes all actions in a logical tab order.
- Escape closes the expanded preview and returns focus behavior to the source card.
- Touch devices keep the resting card and navigate on tap without hover expansion.
- Motion-reduction preferences remove scaling and animated movement while preserving the information state.
- Buttons have localized accessible names and visible focus styles.
- The expanded layer stays within the viewport and does not cover the application top bar when it can be positioned below it.

## Error and Empty States

- Missing hero image uses the existing token-based fallback palette.
- Missing trailer keeps the hero image.
- Trailer playback errors keep the hero image and do not show an error message inside the card.
- Empty weekly or monthly query results omit that rail, matching current homepage behavior.
- A missing synopsis omits the synopsis block rather than rendering empty space.

## Localization

Add Turkish, English, and German messages for:

- Added This Month
- Published this month
- More Information where a suitable shared key is not already available
- Preview action labels required by the new controls

Existing Play, Remove from List, Film, Series, and episode messages are reused when their namespace is available to the component.

## Testing Strategy

Development follows a red, green, refactor cycle.

1. Date window tests fail first, then cover:
   - Monday week start
   - Sunday week end
   - Month start and exclusive next-month boundary
   - March and October daylight saving transitions in Europe/Berlin
   - An injected clock for deterministic behavior
2. Rail selection tests verify:
   - Weekly filtering uses `publishedAt`
   - Monthly filtering uses `publishedAt`
   - Current-week titles may exist in both result sets
   - Null `publishedAt` values are excluded
3. Component behavior tests verify the variant mapping and removal action contract at the smallest practical unit supported by the current test stack.
4. Static verification runs the targeted tests, full test suite, lint, typecheck, and production build.

## Non-goals

- A persistent personal watchlist or plus-button feature
- Trailer audio controls
- Changing title detail or player behavior
- Replacing the existing carousel implementation
- Changing database schema or historical publication timestamps
