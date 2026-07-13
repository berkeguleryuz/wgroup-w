import Image from "next/image";

import { HeroVideo } from "@/components/app/HeroVideo";
import { GooeyButton } from "@/components/app/GooeyButton";

const VIDEO_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

type HeroTitle = {
  slug: string;
  title: string;
  synopsis: string;
  type: "SERIES" | "MOVIE";
  heroImageUrl: string | null;
  trailerUrl: string | null;
  categoryTitle: string;
};

export function AppHero({
  title,
  playLabel,
  seriesLabel,
  filmLabel,
  fallbackHeading,
  fallbackBody,
}: {
  title: HeroTitle | null;
  playLabel: string;
  seriesLabel: string;
  filmLabel: string;
  fallbackHeading: string;
  fallbackBody: string;
}) {
  const isVideo = !!title?.trailerUrl && VIDEO_RE.test(title.trailerUrl);

  // Theme-aware hero: every scrim/base uses the background token, so in the
  // light theme the hero washes in from cream (no black bands anywhere) and in
  // the dark theme it stays a full-bleed cinematic dark. Text uses the
  // foreground token and stays readable because the left/bottom washes come
  // from the same page background it sits on.
  return (
    <section className="relative -mx-4 -mt-[104px] h-[82vh] min-h-[560px] overflow-hidden text-foreground md:-mx-6 lg:-mx-8">
      {title && isVideo ? (
        <HeroVideo
          src={title.trailerUrl!}
          poster={title.heroImageUrl ?? undefined}
        />
      ) : title?.heroImageUrl ? (
        <Image
          src={title.heroImageUrl}
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        // No-art fallback: light theme shows the page's own soft top gradient
        // through the transparent section; dark keeps the warm radial.
        <div
          aria-hidden
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              "radial-gradient(140% 120% at 0% 0%, var(--cinema-850) 0%, var(--cinema-900) 45%, var(--cinema-950) 100%)",
          }}
        />
      )}

      {/* Sideways wash only when there is artwork behind the text — it exists
          purely for contrast over images/video. The plain fallback keeps its
          clean vertical fade instead. */}
      {title && (isVideo || title.heroImageUrl) ? (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-background via-background/55 to-transparent"
        />
      ) : null}
      {/* Single, eased blend straight into the page. One gradient only — no
          competing scrim underneath, so there is no muddy grey band where the
          image hands off to the background. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[62vh] bg-gradient-to-t from-background via-background/55 to-transparent"
      />
      {/* Ease the top edge into the page so it never opens on a hard band
          under the topbar — only needed when artwork bleeds to the top. */}
      {title && (isVideo || title.heroImageUrl) ? (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-near-white via-near-white/35 to-transparent dark:from-background dark:via-background/45"
        />
      ) : null}

      <div className="relative z-10 flex h-full w-full items-end px-4 pb-40 md:items-center md:px-6 md:pb-24 lg:px-8">
        <div className="max-w-xl">
          {title ? (
            <>
              <span className="font-accent text-lg text-muted-foreground dark:text-primary md:text-xl">
                {title.type === "SERIES" ? seriesLabel : filmLabel}
                {" · "}
                {title.categoryTitle}
              </span>
              <h1 className="mt-3 font-display text-4xl leading-[1.04] tracking-[-0.02em] md:text-6xl lg:text-7xl">
                {title.title}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/80 line-clamp-3 md:text-base">
                {title.synopsis}
              </p>
              <div className="mt-7">
                <GooeyButton
                  href={`/app/watch/${title.slug}`}
                  icon={<PlayIcon />}
                >
                  {playLabel}
                </GooeyButton>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl leading-[1.04] tracking-[-0.02em] md:text-6xl lg:text-7xl">
                {fallbackHeading}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/80 md:text-base">
                {fallbackBody}
              </p>
              <div className="mt-7">
                <GooeyButton href="/app/discover" icon={<PlayIcon />}>
                  {playLabel}
                </GooeyButton>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M6 4.5 L16 10 L6 15.5 Z" />
    </svg>
  );
}
