import type { CSSProperties } from "react";

/**
 * A fixed radial dot-mesh texture (pixel-perfect.space "gradient-dot-mesh").
 * `patternColor` overrides the dot color for always-dark surfaces where the
 * light/dark defaults don't apply.
 */
export default function GradientDotMesh({
  className = "",
  patternColor,
}: {
  className?: string;
  patternColor?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 bg-[radial-gradient(var(--pattern-fg)_1px,transparent_0)] bg-size-[10px_10px] bg-fixed [--pattern-fg:var(--color-gray-950)]/5 dark:[--pattern-fg:var(--color-white)]/10 ${className}`.trim()}
      style={
        patternColor
          ? ({ "--pattern-fg": patternColor } as CSSProperties)
          : undefined
      }
    />
  );
}
