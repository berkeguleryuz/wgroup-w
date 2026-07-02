import type { ReactNode } from "react";
import type { ComponentProps } from "react";

import { Link } from "@/lib/i18n/navigation";

/**
 * Gooey CTA: at rest this is a plain pill button — the icon blob hides fully
 * BEHIND the pill (lower z-index, same color). On hover the drop slides out
 * from behind the pill's right edge, the goo filter drawing the liquid neck
 * as it emerges (blur → alpha-contrast → composite the crisp original back
 * on top, so label/icon edges stay sharp).
 *
 * Pure CSS transitions (`.bf-gooey-*` in globals.css) — no animation library.
 * The trailing padding on the wrapper reserves room for the emerged blob so
 * it never overlaps neighbouring elements.
 */
export function GooeyButton({
  href,
  icon,
  children,
}: {
  href: ComponentProps<typeof Link>["href"];
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="bf-gooey-wrap relative inline-flex pr-16">
      <GooFilter />
      <Link href={href} className="bf-gooey group relative inline-flex">
        {/* Blob first + z-0 so it hides behind the pill until hover. */}
        <span
          aria-hidden
          className="bf-gooey-blob absolute left-full top-1/2 z-0 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          {icon}
        </span>
        <span className="relative z-10 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground">
          {children}
        </span>
      </Link>
    </span>
  );
}

function GooFilter() {
  return (
    <svg className="absolute h-0 w-0" aria-hidden>
      <defs>
        {/* Generous filter region so the escaped blob never gets clipped. */}
        <filter id="bf-goo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -15"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}
