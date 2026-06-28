import type { CSSProperties, ReactNode } from "react";

/**
 * Small, simple line icons for the corporate feature grid. Each carries one
 * subtle looping micro-animation (see the `bf-*` classes in globals.css). They
 * inherit color via `currentColor`, so a `text-*` class on the wrapper sets the
 * tone.
 */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7 text-muted-foreground"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Seat-based pricing — an armchair with a gently bobbing occupant. */
export function SeatIcon() {
  return (
    <Icon>
      <path d="M6 11V8.5A2 2 0 0 1 8 6.5h8a2 2 0 0 1 2 2V11" />
      <path d="M5 11a1.6 1.6 0 0 1 1.6 1.6V15h10.8v-2.4A1.6 1.6 0 0 1 19 11" />
      <path d="M7 15.5v2.5M17 15.5v2.5" />
      <circle
        className="bf-bob"
        cx="12"
        cy="12.4"
        r="1.5"
        fill="currentColor"
        stroke="none"
      />
    </Icon>
  );
}

/** Bulk invite — a group where an extra teammate keeps fading in. */
export function InviteIcon() {
  return (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <g className="bf-pulse">
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </g>
    </Icon>
  );
}

/** Department reports — bars that rise like a live equalizer. */
export function ReportIcon() {
  return (
    <Icon>
      <path d="M4 4v16h16" />
      <line
        className="bf-grow"
        x1="8"
        y1="20"
        x2="8"
        y2="13.5"
        strokeWidth={2.4}
        style={{ animationDelay: "0s" }}
      />
      <line
        className="bf-grow"
        x1="12"
        y1="20"
        x2="12"
        y2="8"
        strokeWidth={2.4}
        style={{ animationDelay: "0.25s" }}
      />
      <line
        className="bf-grow"
        x1="16"
        y1="20"
        x2="16"
        y2="11"
        strokeWidth={2.4}
        style={{ animationDelay: "0.5s" }}
      />
    </Icon>
  );
}

/** Single panel, single invoice — a document whose check keeps drawing in. */
export function InvoiceIcon() {
  return (
    <Icon>
      <rect x="5.5" y="3" width="13" height="18" rx="2.2" />
      <path d="M9 7.5h6" opacity={0.5} />
      <path
        className="bf-sweep"
        d="M8.5 13.2l2.4 2.4 4.6-5"
        style={{ "--bf-len": 11 } as CSSProperties}
      />
    </Icon>
  );
}
