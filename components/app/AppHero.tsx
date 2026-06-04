import { Link } from "@/lib/i18n/navigation";

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
  moreLabel,
  seriesLabel,
  filmLabel,
  fallbackHeading,
  fallbackBody,
}: {
  title: HeroTitle | null;
  playLabel: string;
  moreLabel: string;
  seriesLabel: string;
  filmLabel: string;
  fallbackHeading: string;
  fallbackBody: string;
}) {
  const isVideo = !!title?.trailerUrl && VIDEO_RE.test(title.trailerUrl);

  return (
    <section className="relative -mx-6 -mt-[88px] h-[82vh] min-h-[560px] overflow-hidden bg-surface-dark text-surface-dark-foreground md:-mx-10">
      {title && isVideo ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={title.trailerUrl!}
          autoPlay
          muted
          loop
          playsInline
          poster={title.heroImageUrl ?? undefined}
        />
      ) : title?.heroImageUrl ? (
        <img
          src={title.heroImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 75% 25%, #2b2016 0%, #14100a 55%, #0b0906 100%)",
          }}
        />
      )}

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-surface-dark via-surface-dark/55 to-transparent"
      />
      {/* Soft mood + text legibility over the lower hero — image stays visible */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-surface-dark/70 via-surface-dark/15 to-transparent"
      />
      {/* Long, gradual blend into the cream page — alpha-composited so there is
          no hard edge and no muddy midtones */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[55vh] bg-gradient-to-t from-background to-transparent"
      />

      <div className="relative z-10 mx-auto flex h-full max-w-[1800px] items-end px-6 pb-40 md:items-center md:px-10 md:pb-24">
        <div className="max-w-xl">
          {title ? (
            <>
              <span className="font-accent text-lg text-primary md:text-xl">
                {(title.type === "SERIES" ? seriesLabel : filmLabel) +
                  " · " +
                  title.categoryTitle}
              </span>
              <h1 className="mt-3 font-display text-4xl leading-[1.04] tracking-[-0.02em] md:text-6xl lg:text-7xl">
                {title.title}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-surface-dark-foreground/80 line-clamp-3 md:text-base">
                {title.synopsis}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/app/watch/${title.slug}`}
                  className="inline-flex h-12 items-center gap-2 rounded-11 bg-primary px-7 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <PlayIcon />
                  {playLabel}
                </Link>
                <Link
                  href={`/app/watch/${title.slug}`}
                  className="inline-flex h-12 items-center gap-2 rounded-11 border border-white/25 bg-white/10 px-7 text-base font-semibold text-surface-dark-foreground backdrop-blur transition-colors hover:bg-white/20"
                >
                  <InfoIcon />
                  {moreLabel}
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl leading-[1.04] tracking-[-0.02em] md:text-6xl lg:text-7xl">
                {fallbackHeading}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-surface-dark-foreground/80 md:text-base">
                {fallbackBody}
              </p>
              <div className="mt-7">
                <Link
                  href="/app/discover"
                  className="inline-flex h-12 items-center gap-2 rounded-11 bg-primary px-7 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <PlayIcon />
                  {playLabel}
                </Link>
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

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5" />
      <path d="M10 6v.01" />
    </svg>
  );
}
