"use client";

/**
 * Animated "contrast orb" for the theme toggle — deliberately not a sun/moon.
 *
 * A thin ring holds a half-filled disc plus a small satellite dot. Toggling
 * spins the inner group 180° with a springy overshoot, so the filled half
 * swaps sides (light ↔ dark) and the dot arcs over the top of the ring to
 * settle underneath. The half-disc also "breathes" (slight scale) mid-flip.
 *
 * Single tone: everything inherits `currentColor` from the button, so it
 * works on both light and dark surfaces. Driven purely by the `data-dark`
 * attribute + CSS transitions (see `.bf-orb-*` in globals.css), so it
 * animates in both directions and degrades to a snap under reduced motion.
 */
export function ThemeToggleIcon({ isDark }: { isDark: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="bf-orb h-5 w-5"
      data-dark={isDark ? "true" : "false"}
      aria-hidden
      fill="none"
    >
      {/* Outer ring — the fixed frame the inner parts move within. */}
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.7" />

      {/* Rotating group: half disc + satellite dot. */}
      <g className="bf-orb-spin">
        <path className="bf-orb-half" d="M12 5.4 a6.6 6.6 0 0 1 0 13.2 Z" />
        <circle className="bf-orb-dot" cx="12" cy="2.1" r="1.5" />
      </g>
    </svg>
  );
}
