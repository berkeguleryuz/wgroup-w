"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import StatCard, {
  StatGhostIcon,
  type StatIcon,
} from "@/components/dashboard/StatCard";

gsap.registerPlugin(useGSAP);

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type Cell = {
  label: string;
  value: number;
  sub?: string;
  href?: string;
  alert?: boolean;
  tone?: "dark";
  icon: StatIcon;
};

type TopTitle = { id: string; title: string; viewers: number };

export default function DashboardBoard({
  hero,
  cells,
  hours,
  completed,
  rate,
  topTitles,
}: {
  hero: { pulse: string; label: string; value: number; sub: string };
  cells: Cell[];
  hours: { label: string; value: number };
  completed: { label: string; value: number };
  rate: { label: string; value: number };
  topTitles: {
    heading: string;
    empty: string;
    viewersLabel: string;
    items: TopTitle[];
  };
}) {
  const scope = useRef<HTMLDivElement>(null);
  const ringOffset = RING_CIRCUMFERENCE * (1 - rate.value / 100);
  const maxViewers = Math.max(1, ...topTitles.items.map((x) => x.viewers));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
        });

        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const end = parseFloat(el.dataset.value ?? "0");
          const proxy = { v: 0 };
          tl.to(
            proxy,
            {
              v: end,
              duration: 1,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = Math.round(proxy.v).toString();
              },
            },
            0,
          );
        });

        tl.fromTo(
          "[data-ring]",
          { strokeDashoffset: RING_CIRCUMFERENCE },
          {
            strokeDashoffset: ringOffset,
            duration: 1.2,
            ease: "power2.inOut",
          },
          0.1,
        );

        tl.from(
          "[data-bar]",
          {
            scaleX: 0,
            transformOrigin: "0% 50%",
            duration: 0.8,
            ease: "power3.inOut",
            stagger: 0.07,
          },
          0.15,
        );

        gsap.to("[data-hero-ghost]", {
          y: -9,
          rotation: -4,
          duration: 4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-12">
        {/* Billboard — the one loud card on the board */}
        <div
          data-card
          className="relative overflow-hidden rounded-11 bg-surface-dark p-6 text-surface-dark-foreground sm:col-span-2 lg:col-span-6 lg:row-span-2 lg:p-8"
        >
          <div
            data-hero-ghost
            aria-hidden
            className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 text-surface-dark-foreground/10"
          >
            <StatGhostIcon name="users" className="size-56" />
          </div>
          <span className="font-accent text-lg text-primary">
            {hero.pulse}
          </span>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-surface-dark-foreground/60">
            {hero.label}
          </p>
          <p className="mt-1 font-display text-7xl leading-none text-primary lg:text-8xl">
            <span data-count data-value={hero.value}>
              {hero.value}
            </span>
          </p>
          <span className="mt-5 inline-block rounded-full border border-primary/40 px-3 py-1 text-xs text-primary">
            {hero.sub}
          </span>
          {/* Film-strip perforations */}
          <div
            aria-hidden
            className="absolute inset-x-6 bottom-5 flex justify-between gap-2 lg:inset-x-8"
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className="size-2 rounded-[3px] bg-surface-dark-foreground/10"
              />
            ))}
          </div>
        </div>

        {cells.map((cell, i) => (
          <StatCard
            key={cell.label}
            {...cell}
            floatDelay={i * 0.5}
            className="lg:col-span-3"
          />
        ))}

        <StatCard
          label={hours.label}
          value={hours.value}
          icon="clock"
          floatDelay={2}
          className="lg:col-span-4"
        />
        <StatCard
          label={completed.label}
          value={completed.value}
          icon="check"
          floatDelay={2.5}
          className="lg:col-span-4"
        />

        {/* Completion ring */}
        <div className="flex items-center gap-5 rounded-11 border border-border bg-muted p-5 lg:col-span-4">
          <svg
            viewBox="0 0 100 100"
            className="size-20 shrink-0 -rotate-90"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="7"
              className="stroke-border"
            />
            <circle
              data-ring
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              className="stroke-foreground"
            />
          </svg>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {rate.label}
            </p>
            <p className="mt-2 font-display text-4xl">
              <span data-count data-value={rate.value}>
                {rate.value}
              </span>
              %
            </p>
          </div>
        </div>
      </section>

      {/* Box office — top titles as ranked bars */}
      <section className="rounded-11 border border-border bg-background">
        <h2 className="flex items-baseline justify-between border-b border-border/60 px-5 py-4">
          <span className="font-display text-xl">{topTitles.heading}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {topTitles.viewersLabel}
          </span>
        </h2>
        {topTitles.items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            {topTitles.empty}
          </p>
        ) : (
          <ol className="divide-y divide-border/70">
            {topTitles.items.map((x, i) => (
              <li
                key={x.id}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
              >
                <span
                  className={`w-8 shrink-0 font-display text-2xl ${
                    i === 0 ? "text-foreground" : "text-muted-foreground/60"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {x.title}
                </span>
                <span
                  className="hidden h-1.5 max-w-40 flex-1 overflow-hidden rounded-full bg-border/50 sm:block"
                  aria-hidden
                >
                  <span
                    data-bar
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(x.viewers / maxViewers) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right font-mono text-sm text-muted-foreground">
                  {x.viewers}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
