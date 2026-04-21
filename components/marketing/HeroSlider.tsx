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
    bg: "radial-gradient(120% 80% at 70% 30%, #2b2016 0%, #14100a 55%, #0b0906 100%)",
    text: "#f3e9d0",
    headlineFrom: "#edddb9",
    headlineTo: "#c9a86a",
    accent: "#edddb9",
    letter: "#edddb9",
    href: "/register",
    mark: "S",
  },
  {
    name: "amber",
    bg: "radial-gradient(120% 80% at 30% 40%, #3a2010 0%, #1a0f08 55%, #090604 100%)",
    text: "#ffe0b7",
    headlineFrom: "#eaa742",
    headlineTo: "#ffca79",
    accent: "#eaa742",
    letter: "#eaa742",
    href: "/register",
    mark: "F",
  },
  {
    name: "sky",
    bg: "radial-gradient(120% 80% at 50% 30%, #0f2236 0%, #0a1420 55%, #050a10 100%)",
    text: "#d6e8ff",
    headlineFrom: "#8ec9ff",
    headlineTo: "#c6e5ff",
    accent: "#8ec9ff",
    letter: "#8ec9ff",
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
  const [parallax, setParallax] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      setParallax({ x, y });
    };
    const onLeave = () => setParallax({ x: 0, y: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const sectionStyle: CSSProperties = {
    background: theme.bg,
    color: theme.text,
    ["--hero-accent" as string]: theme.accent,
    ["--hero-letter" as string]: theme.letter,
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

      <Swiper
        modules={[Autoplay, EffectFade, Keyboard]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={700}
        slidesPerView={1}
        loop
        keyboard={{ enabled: true }}
        autoplay={{
          delay: 10000,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
        }}
        onSwiper={(s) => {
          swiperRef.current = s;
        }}
        onSlideChange={(s) => setActive(s.realIndex)}
        className="relative z-10 h-[calc(100vh-1rem)] min-h-[1020px]"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={slide.title}>
            <div className="mx-auto grid h-full w-full max-w-[1600px] grid-cols-12 items-center gap-6 px-6 pb-16 pt-48 md:px-12 md:pb-20 md:pt-56 xl:px-16">
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
                  className="font-display text-3xl"
                  style={{ color: theme.accent }}
                >
                  0{i + 1}
                </span>
              </aside>

              <div className="relative col-span-12 flex h-[360px] items-center justify-center md:col-span-6 md:h-[560px]">
                <Monogram
                  mark={slide.theme.mark}
                  color={slide.theme.letter}
                  parallax={parallax}
                />
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
                        color: "#0b0906",
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

      <nav className="absolute right-4 top-1/2 z-20 -translate-y-1/2 md:right-8">
        <ul className="flex flex-col gap-3">
          {slides.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => swiperRef.current?.slideToLoop(i)}
                className="group flex h-12 w-12 items-center justify-center rounded-11 border transition-all md:h-14 md:w-14"
                style={{
                  borderColor: i === active ? s.theme.accent : "rgba(255,255,255,0.15)",
                  background:
                    i === active
                      ? `linear-gradient(135deg, ${s.theme.headlineFrom}33, transparent)`
                      : "rgba(255,255,255,0.03)",
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
                    i === active ? s.theme.accent : "rgba(255,255,255,0.55)"
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

function Monogram({
  mark,
  color,
  parallax,
}: {
  mark: string;
  color: string;
  parallax: { x: number; y: number };
}) {
  const tx = parallax.x * 30;
  const ty = parallax.y * 22;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        aria-hidden
        className="absolute inset-0 blur-3xl opacity-60"
        style={{
          background: `radial-gradient(closest-side, ${color}44, transparent 70%)`,
          transform: `translate3d(${tx * 0.4}px, ${ty * 0.4}px, 0)`,
          transition: "transform 120ms ease-out",
        }}
      />

      <div
        aria-hidden
        className="relative flex h-full w-full items-center justify-center"
        style={{
          filter: `drop-shadow(0 20px 80px ${color}55)`,
          transform: `translate3d(${tx}px, ${ty}px, 0)`,
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
          {/* Outer rotating arc — progress feel */}
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

function Rain() {
  const [drops, setDrops] = useState<
    Array<{
      left: number;
      top: number;
      delay: number;
      duration: number;
      opacity: number;
    }>
  >([]);

  useEffect(() => {
    setDrops(
      Array.from({ length: 40 }).map(() => ({
        left: Math.random() * 100,
        top: -20 - Math.random() * 60,
        delay: Math.random() * 12,
        duration: 5 + Math.random() * 6,
        opacity: 0.25 + Math.random() * 0.3,
      })),
    );
  }, []);

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
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.08]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
        maskImage:
          "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)",
      }}
    />
  );
}
