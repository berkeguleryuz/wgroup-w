"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useTranslations } from "next-intl";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay, EffectFade, Keyboard } from "swiper/modules";

import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { HeroGlyph, HeroGlyphIcon } from "@/components/marketing/HeroGlyphs";
import LightRays from "@/components/marketing/LightRays";
import GradientDotMesh from "@/components/pixel-perfect/gradient-dot-mesh";
import { HeroShortcutIcon } from "@/components/marketing/HeroShortcutIcons";

import "swiper/css";
import "swiper/css/effect-fade";
import "./hero-slider.css";

type Theme = {
  name: string;
  bg: string;
  text: string;
  headlineFrom: string;
  headlineTo: string;
  accent: string;
  letter: string;
  href: string;
  mark: string;
};

const THEMES: Theme[] = [
  {
    name: "cream",
    bg: "radial-gradient(120% 80% at 70% 30%, var(--cinema-800) 0%, var(--cinema-900) 55%, var(--cinema-950) 100%)",
    text: "var(--hero-cream-text)",
    headlineFrom: "var(--primary)",
    headlineTo: "var(--gold-700)",
    accent: "var(--primary)",
    letter: "var(--primary)",
    href: "/register",
    mark: "S",
  },
  {
    name: "amber",
    bg: "radial-gradient(120% 80% at 30% 40%, var(--hero-amber-800) 0%, var(--hero-amber-900) 55%, var(--hero-amber-950) 100%)",
    text: "var(--hero-amber-text)",
    headlineFrom: "var(--hero-amber)",
    headlineTo: "var(--hero-amber-light)",
    accent: "var(--hero-amber)",
    letter: "var(--hero-amber)",
    href: "/register",
    mark: "F",
  },
  {
    name: "sky",
    bg: "radial-gradient(120% 80% at 50% 30%, var(--hero-sky-800) 0%, var(--hero-sky-900) 55%, var(--hero-sky-950) 100%)",
    text: "var(--hero-sky-text)",
    headlineFrom: "var(--hero-sky)",
    headlineTo: "var(--hero-sky-light)",
    accent: "var(--hero-sky)",
    letter: "var(--hero-sky)",
    href: "/register",
    mark: "T",
  },
];

export function HeroSlider() {
  const t = useTranslations("hero");
  const tc = useTranslations("common");

  const slides = useMemo(
    () => [
      {
        theme: THEMES[0],
        category: t("s1Category"),
        tag: t("s1Tag"),
        title: t("s1Title"),
        copy: t("s1Copy"),
      },
      {
        theme: THEMES[1],
        category: t("s2Category"),
        tag: t("s2Tag"),
        title: t("s2Title"),
        copy: t("s2Copy"),
      },
      {
        theme: THEMES[2],
        category: t("s3Category"),
        tag: t("s3Tag"),
        title: t("s3Title"),
        copy: t("s3Copy"),
      },
    ],
    [t],
  );

  const [active, setActive] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);
  const theme = slides[active].theme;

  const stageRef = useRef<HTMLDivElement>(null);

  // Parallax is written straight to CSS variables on the stage element, so the
  // pointer moving never triggers a React re-render of the slider and slides.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    let rafId: number | null = null;
    let nextX = 0;
    let nextY = 0;

    const flush = () => {
      rafId = null;
      el.style.setProperty("--hero-px", nextX.toFixed(4));
      el.style.setProperty("--hero-py", nextY.toFixed(4));
    };
    const schedule = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(flush);
    };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      nextX = (e.clientX - r.left) / r.width - 0.5;
      nextY = (e.clientY - r.top) / r.height - 0.5;
      schedule();
    };
    const onLeave = () => {
      nextX = 0;
      nextY = 0;
      schedule();
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const sectionStyle: CSSProperties = {
    background: theme.bg,
    color: theme.text,
    ["--hero-accent" as string]: theme.accent,
    ["--hero-letter" as string]: theme.letter,
    ["--hero-px" as string]: 0,
    ["--hero-py" as string]: 0,
    transition: "background 900ms ease, color 600ms ease",
  };

  return (
    <section
      ref={stageRef}
      className="hero-slider relative overflow-hidden border-b rounded-11 border-black/40"
      style={sectionStyle}
    >
      <Rain />
      <GridOverlay />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-px z-0 overflow-hidden rounded-11"
      >
        <LightRays
          raysOrigin="top-center"
          raysColor={theme.accent}
          raysSpeed={1}
          lightSpread={0.9}
          rayLength={1.4}
          followMouse
          mouseInfluence={0.08}
          noiseAmount={0.06}
          distortion={0.03}
        />
      </div>

      <Swiper
        modules={[Autoplay, EffectFade, Keyboard]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={700}
        slidesPerView={1}
        loop
        // Swiper's loopFix (run on every autoplay wrap-around) flips
        // `allowClick` to false and, without touch input, nothing ever resets
        // it — after the first loop the capture-phase click guard swallows
        // every click inside the slider, making the CTA links dead. The
        // slider isn't drag-driven, so the click guards are safe to disable.
        preventClicks={false}
        preventClicksPropagation={false}
        keyboard={{ enabled: true }}
        autoplay={{
          delay: 10000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        onSwiper={(s) => {
          swiperRef.current = s;
          if (
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ) {
            s.autoplay?.stop();
          }
        }}
        onSlideChange={(s) => setActive(s.realIndex)}
        className="relative z-10 h-[calc(100vh-1rem)] min-h-[720px]"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={slide.title}>
            <div className="mx-auto grid h-full w-full max-w-[1600px] grid-cols-12 items-center gap-6 px-6 pb-16 pt-32 md:px-12 md:pb-20 md:pt-40 xl:px-16">
              <aside className="col-span-1 hidden flex-col items-center gap-6 self-center md:flex">
                <span
                  className="text-[11px] font-semibold tracking-[0.42em]"
                  style={{
                    writingMode: "vertical-rl",
                    color: theme.accent,
                  }}
                >
                  {t("sideLabel")}
                </span>
                <span
                  className="h-10 w-px"
                  style={{ background: theme.accent, opacity: 0.4 }}
                />
                <span
                  className="hero-slide-icon-bob inline-flex"
                  style={{ color: theme.accent }}
                >
                  <SlideBadgeIcon index={i} color={theme.accent} />
                </span>
              </aside>

              <div className="relative col-span-12 flex h-[360px] items-center justify-center md:col-span-5 md:h-[560px]">
                <Monogram mark={slide.theme.mark} color={slide.theme.letter} />
              </div>

              <div className="col-span-12 md:col-span-5">
                <p
                  className="font-accent text-base md:text-lg"
                  style={{ color: theme.accent }}
                >
                  {slide.category}
                </p>
                <h1
                  className="mt-2 font-display text-6xl leading-[0.95] md:text-8xl lg:text-[120px]"
                  style={{
                    backgroundImage: `linear-gradient(180deg, ${slide.theme.headlineFrom} 0%, ${slide.theme.headlineTo} 90%)`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {slide.title}
                </h1>

                <InfoBox
                  tag={slide.tag}
                  body={slide.copy}
                  aboutLabel={t("aboutLabel")}
                  theme={theme}
                />

                <ShortcutRow
                  items={[
                    t("shortcut4K"),
                    t("shortcutHD"),
                    t("shortcutPreview"),
                    t("shortcutSubs"),
                  ]}
                  theme={theme}
                />

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href={slide.theme.href}>
                    <Button
                      size="lg"
                      variant="primary"
                      style={{
                        background: theme.accent,
                        borderColor: theme.accent,
                        color: "var(--primary-foreground)",
                      }}
                    >
                      {t("startWatching")}
                    </Button>
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-sm underline-offset-4 hover:underline"
                    style={{ color: theme.text, opacity: 0.85 }}
                  >
                    {tc("learnMore")} →
                  </Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <nav className="absolute left-1/2 top-20 z-20 -translate-x-1/2 md:left-auto md:right-8 md:top-1/2 md:-translate-y-1/2 md:translate-x-0">
        <ul className="flex flex-row gap-3 md:flex-col">
          {slides.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => swiperRef.current?.slideToLoop(i)}
                className="group flex h-12 w-12 items-center justify-center rounded-11 border transition-all md:h-14 md:w-14"
                style={{
                  borderColor:
                    i === active
                      ? s.theme.accent
                      : "rgb(var(--white-rgb) / 0.15)",
                  background:
                    i === active
                      ? `linear-gradient(135deg, ${s.theme.headlineFrom}33, transparent)`
                      : "rgb(var(--white-rgb) / 0.03)",
                  boxShadow:
                    i === active
                      ? `0 0 0 1px ${s.theme.accent}, 0 10px 40px -10px ${s.theme.accent}`
                      : "none",
                }}
                aria-label={s.title}
              >
                <HeroGlyphIcon
                  mark={s.theme.mark}
                  color={
                    i === active
                      ? s.theme.accent
                      : "rgb(var(--white-rgb) / 0.55)"
                  }
                  className="h-7 w-7 md:h-9 md:w-9"
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

function SlideBadgeIcon({ index, color }: { index: number; color: string }) {
  if (index === 1) {
    // Filmler — dönen film makarası
    return (
      <svg viewBox="0 0 36 36" width="34" height="34" fill="none" aria-hidden>
        <g className="hero-reel-spin">
          <circle cx="18" cy="18" r="13" stroke={color} strokeWidth="1.6" />
          <circle cx="18" cy="18" r="2.4" fill={color} />
          <circle cx="18" cy="10.5" r="2.6" stroke={color} strokeWidth="1.4" />
          <circle cx="25.1" cy="15.6" r="2.6" stroke={color} strokeWidth="1.4" />
          <circle cx="22.4" cy="24" r="2.6" stroke={color} strokeWidth="1.4" />
          <circle cx="13.6" cy="24" r="2.6" stroke={color} strokeWidth="1.4" />
          <circle cx="10.9" cy="15.6" r="2.6" stroke={color} strokeWidth="1.4" />
        </g>
      </svg>
    );
  }

  if (index === 2) {
    // Yetenek — parıldayan yıldız
    return (
      <svg viewBox="0 0 36 36" width="34" height="34" fill="none" aria-hidden>
        <path
          className="hero-star-pulse"
          d="M18 6 L21 15 L30 18 L21 21 L18 30 L15 21 L6 18 L15 15 Z"
          fill={color}
        />
        <circle className="hero-spark" cx="28" cy="8" r="1.4" fill={color} />
        <circle
          className="hero-spark"
          cx="8"
          cy="27"
          r="1.1"
          fill={color}
          style={{ animationDelay: "0.7s" }}
        />
        <circle
          className="hero-spark"
          cx="30"
          cy="28"
          r="1"
          fill={color}
          style={{ animationDelay: "1.3s" }}
        />
      </svg>
    );
  }

  // Liderlik — taç, sırayla parlayan taşlar
  return (
    <svg viewBox="0 0 36 36" width="34" height="34" fill="none" aria-hidden>
      <path
        d="M6 24 L6 12.5 L12 18 L18 9 L24 18 L30 12.5 L30 24 Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M6 27.5 H30" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle className="hero-crown-gem" cx="12" cy="22" r="1.3" fill={color} />
      <circle
        className="hero-crown-gem"
        cx="18"
        cy="21"
        r="1.3"
        fill={color}
        style={{ animationDelay: "0.4s" }}
      />
      <circle
        className="hero-crown-gem"
        cx="24"
        cy="22"
        r="1.3"
        fill={color}
        style={{ animationDelay: "0.8s" }}
      />
    </svg>
  );
}

function Monogram({ mark, color }: { mark: string; color: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        aria-hidden
        className="relative flex h-full w-full items-center justify-center"
        style={{
          transform:
            "translate3d(calc(var(--hero-px, 0) * 30px), calc(var(--hero-py, 0) * 22px), 0)",
          transition: "transform 120ms ease-out",
        }}
      >
        <HeroGlyph
          mark={mark}
          color={color}
          className="h-[min(100%,640px)] w-[min(100%,640px)]"
        />
      </div>

      <CornerTicks color={color} />
    </div>
  );
}

function CornerTicks({ color }: { color: string }) {
  const style = { borderColor: `${color}88` };
  return (
    <>
      <span
        className="absolute left-4 top-4 h-5 w-5 border-l border-t"
        style={style}
      />
      <span
        className="absolute right-4 top-4 h-5 w-5 border-r border-t"
        style={style}
      />
      <span
        className="absolute bottom-4 left-4 h-5 w-5 border-b border-l"
        style={style}
      />
      <span
        className="absolute bottom-4 right-4 h-5 w-5 border-b border-r"
        style={style}
      />
    </>
  );
}

function InfoBox({
  tag,
  body,
  aboutLabel,
  theme,
}: {
  tag: string;
  body: string;
  aboutLabel: string;
  theme: Theme;
}) {
  return (
    <div
      className="mt-6 flex gap-4 rounded-11 border p-4"
      style={{
        borderColor: `${theme.accent}55`,
        background: `linear-gradient(180deg, ${theme.accent}12 0%, ${theme.accent}06 100%)`,
      }}
    >
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-11 border"
        style={{ borderColor: `${theme.accent}aa`, color: theme.accent }}
      >
        <svg
          viewBox="0 0 32 32"
          width="28"
          height="28"
          fill="none"
          aria-hidden
        >
          <style>{`
            @keyframes infobox-arc-spin { to { transform: rotate(360deg); } }
            @keyframes infobox-arc-spin-rev { to { transform: rotate(-360deg); } }
            @keyframes infobox-tri-beat {
              0%, 100% { transform: scale(1); }
              50%      { transform: scale(1.12); }
            }
            .infobox-arc {
              transform-origin: 16px 16px;
              animation: infobox-arc-spin 2.8s linear infinite;
            }
            .infobox-arc-inner {
              transform-origin: 16px 16px;
              animation: infobox-arc-spin-rev 4.2s linear infinite;
            }
            .infobox-tri {
              transform-box: fill-box;
              transform-origin: center;
              animation: infobox-tri-beat 1.4s ease-in-out infinite;
            }
          `}</style>
          <circle
            className="infobox-arc"
            cx="16"
            cy="16"
            r="12.5"
            stroke={theme.accent}
            strokeWidth="1.4"
            strokeDasharray="22 60"
            strokeLinecap="round"
            opacity="0.9"
          />
         
          <g className="infobox-tri">
            <path d="M 13 10 L 22.5 16 L 13 22 Z" fill={theme.accent} />
          </g>
        </svg>
      </div>
      <div>
        <p
          className="text-xs font-semibold tracking-[0.24em]"
          style={{ color: theme.accent }}
        >
          {aboutLabel} · {tag}
        </p>
        <p className="mt-2 text-sm opacity-90 md:text-[15px]">{body}</p>
      </div>
    </div>
  );
}

function ShortcutRow({ items, theme }: { items: string[]; theme: Theme }) {
  return (
    <div className="mt-5 flex gap-3">
      {items.map((item) => (
        <div
          key={item}
          className="flex-1 overflow-hidden rounded-11 border text-center"
          style={{ borderColor: `${theme.accent}55` }}
        >
          <div
            className="flex items-center justify-center py-4"
            style={{ color: theme.text }}
          >
            <HeroShortcutIcon label={item} color={theme.accent} />
          </div>
          <div
            className="border-t py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              borderColor: `${theme.accent}55`,
              background: `linear-gradient(180deg, ${theme.accent}10, transparent)`,
              color: theme.accent,
            }}
          >
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

// Deterministic (seeded) drop placement — identical on server and client, so
// no hydration mismatch and no client-only effect needed.
const RAIN_DROPS = Array.from({ length: 26 }).map((_, i) => {
  let s = (i + 1) * 2654435761;
  const rand = () => {
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >> 17)) >>> 0;
    s = (s ^ (s << 5)) >>> 0;
    return s / 4294967296;
  };
  return {
    left: rand() * 100,
    top: -20 - rand() * 60,
    delay: rand() * 12,
    duration: 5 + rand() * 6,
    opacity: 0.25 + rand() * 0.3,
  };
});

function Rain() {
  const drops = RAIN_DROPS;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {drops.map((d, i) => (
        <span
          key={i}
          className="hero-rain"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
            opacity: d.opacity,
          }}
        />
      ))}
    </div>
  );
}

function GridOverlay() {
  return (
    <GradientDotMesh
      patternColor="rgb(var(--white-rgb) / 0.14)"
      className="z-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black_40%,transparent_100%)]"
    />
  );
}
