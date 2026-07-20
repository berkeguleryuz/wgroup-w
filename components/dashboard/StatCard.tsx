"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Link } from "@/lib/i18n/navigation";

gsap.registerPlugin(useGSAP);

export type StatIcon =
  | "users"
  | "play"
  | "building"
  | "bell"
  | "clapper"
  | "clock"
  | "check"
  | "film"
  | "pencil"
  | "reel"
  | "database"
  | "trash";

const ICON_PATHS: Record<StatIcon, ReactNode> = {
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.5c2.6.4 4.5 2.6 4.5 5.5" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5v-7z" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="1" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2M10 21v-2h4v2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  clapper: (
    <>
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M3 9l1.5-4.5 17 2.5-1 3M8 5.5l2.5 3M13 6.3l2.5 3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  film: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
      <path d="M13.5 7.5l3 3" />
    </>
  ),
  reel: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="7" r="1.8" />
      <circle cx="12" cy="17" r="1.8" />
      <circle cx="7" cy="12" r="1.8" />
      <circle cx="17" cy="12" r="1.8" />
      <path d="M20 21h-8" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
};

export function StatGhostIcon({
  name,
  className,
}: {
  name: StatIcon;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  sub,
  suffix,
  href,
  icon,
  tone,
  alert,
  floatDelay = 0,
  className = "",
}: {
  label: string;
  value: number;
  sub?: string;
  suffix?: string;
  href?: string;
  icon: StatIcon;
  tone?: "dark";
  alert?: boolean;
  floatDelay?: number;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const countEl = useRef<HTMLSpanElement>(null);
  const iconEl = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (countEl.current) {
          const el = countEl.current;
          const end = value;
          const proxy = { v: 0 };
          gsap.to(proxy, {
            v: end,
            duration: 1,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = Math.round(proxy.v).toString();
            },
          });
        }
        if (iconEl.current) {
          gsap.to(iconEl.current, {
            y: -7,
            rotation: 5,
            duration: 3.4,
            delay: floatDelay,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }
      });
    },
    { scope: root },
  );

  const surface = alert
    ? "border-primary bg-primary text-primary-foreground"
    : tone === "dark"
      ? "border-surface-dark bg-surface-dark text-surface-dark-foreground"
      : "border-border bg-muted text-foreground hover:border-primary";
  const labelColor = alert
    ? "text-primary-foreground/70"
    : tone === "dark"
      ? "text-surface-dark-foreground/60"
      : "text-muted-foreground";
  const ghostColor = alert
    ? "text-primary-foreground/15"
    : tone === "dark"
      ? "text-surface-dark-foreground/10"
      : "text-foreground/[0.07]";

  const body = (
    <div
      ref={root}
      className={`group relative h-full overflow-hidden rounded-11 border p-5 transition-all duration-300 hover:-translate-y-0.5 ${surface} ${className}`}
    >
      <div
        ref={iconEl}
        aria-hidden
        className={`pointer-events-none absolute -bottom-5 -right-4 transition-transform duration-500 group-hover:scale-110 ${ghostColor}`}
      >
        <StatGhostIcon name={icon} className="size-28" />
      </div>
      {alert ? (
        <span className="absolute right-4 top-4 flex size-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-primary-foreground" />
        </span>
      ) : null}
      <p className={`relative text-xs uppercase tracking-wide ${labelColor}`}>
        {label}
      </p>
      <p
        className={`relative mt-2 font-display text-4xl ${
          tone === "dark" && !alert ? "text-primary" : ""
        }`}
      >
        <span ref={countEl}>{value}</span>
        {suffix}
      </p>
      {sub ? (
        <p className={`relative mt-1 text-xs ${labelColor}`}>{sub}</p>
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="contents">
      {body}
    </Link>
  ) : (
    body
  );
}
