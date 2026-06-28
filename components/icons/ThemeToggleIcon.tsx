"use client";

import { useId } from "react";

/**
 * Animated, two-tone sun ↔ moon icon for the theme toggle.
 *
 * The whole thing morphs from a sun (warm core + radiating rays) into a
 * crescent moon: a masked cut-out circle slides across the core while the
 * rays retract, spin, and fade. Driven purely by the `isDark` prop + CSS
 * transitions so it animates in both directions.
 *
 * Two tones:
 *  - `currentColor`         → the line/stroke tone (inherits from the button).
 *  - `--bf-toggle-accent`   → a soft fill tone behind the core (warm in light,
 *                             cool in dark). Falls back to `currentColor` at 16%.
 *
 * IDs are scoped with `useId()` so multiple instances never share a mask.
 */
export function ThemeToggleIcon({ isDark }: { isDark: boolean }) {
  const uid = useId().replace(/:/g, "");
  const maskId = `bf-toggle-mask-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className="bf-toggle-icon h-5 w-5"
      data-dark={isDark ? "true" : "false"}
      aria-hidden
      fill="none"
    >
      <mask id={maskId}>
        {/* Everything inside the mask is visible where white. */}
        <rect x="0" y="0" width="24" height="24" fill="white" />
        {/* Cut-out circle: parked off to the upper-right in light mode, slides
            over the core in dark mode to carve out the crescent. */}
        <circle
          className="bf-toggle-cutout"
          cx="24"
          cy="2"
          r="7.5"
          fill="black"
        />
      </mask>

      {/* Soft accent halo behind the core (the second tone). */}
      <circle className="bf-toggle-halo" cx="12" cy="12" r="5.6" />

      {/* The core: a filled+stroked disc that the mask turns into a crescent. */}
      <circle
        className="bf-toggle-core"
        cx="12"
        cy="12"
        r="5"
        mask={`url(#${maskId})`}
      />

      {/* Rays — collapse to the centre and fade as the moon appears. */}
      <g
        className="bf-toggle-rays"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <line x1="12" y1="1.5" x2="12" y2="3.6" />
        <line x1="12" y1="20.4" x2="12" y2="22.5" />
        <line x1="1.5" y1="12" x2="3.6" y2="12" />
        <line x1="20.4" y1="12" x2="22.5" y2="12" />
        <line x1="4.4" y1="4.4" x2="5.9" y2="5.9" />
        <line x1="18.1" y1="18.1" x2="19.6" y2="19.6" />
        <line x1="4.4" y1="19.6" x2="5.9" y2="18.1" />
        <line x1="18.1" y1="5.9" x2="19.6" y2="4.4" />
      </g>
    </svg>
  );
}
