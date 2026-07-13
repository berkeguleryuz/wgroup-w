import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import type { Title, Category, Episode } from "@prisma/client";

import { Link } from "@/lib/i18n/navigation";
import { categoryTitle } from "@/lib/i18n/category-title";
import { formatDuration } from "@/lib/utils";

type Props = {
  title: Title & { category: Category; episodes: Pick<Episode, "durationSec">[] };
  index?: number;
  /** Override the link target (e.g. resume a specific episode). Defaults to the title page. */
  href?: string;
  /** Watched fraction 0–100. When > 0, renders a progress bar pinned to the card's bottom edge. */
  progressPercent?: number;
};

const palette = [
  "linear-gradient(135deg, var(--surface-dark) 0%, var(--cinema-700) 100%)",
  "linear-gradient(135deg, var(--cinema-800) 0%, var(--cinema-600) 100%)",
  "linear-gradient(135deg, var(--muted-foreground) 0%, var(--surface-dark) 100%)",
  "linear-gradient(135deg, var(--surface-dark) 0%, var(--cinema-600) 100%)",
];

export function TitleCard({
  title,
  index = 0,
  href,
  progressPercent,
}: Props) {
  const t = useTranslations("featuredLibrary");
  const locale = useLocale();
  const total = title.episodes.reduce((s, e) => s + e.durationSec, 0);
  // Covers are landscape (16:9) — creators upload video-frame stills, Netflix-style.
  const aspect = "aspect-video";

  return (
    <Link
      href={href ?? `/app/watch/${title.slug}`}
      className="group block overflow-hidden rounded-11 border border-border/60 transition-colors duration-300 ease-out hover:border-primary/70 motion-reduce:transition-none"
    >
      <div className={`relative ${aspect}`}>
        {title.heroImageUrl ? (
          <Image
            src={title.heroImageUrl}
            alt={title.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: palette[index % palette.length] }}
          />
        )}

        {/* Bottom-heavy scrim for the title block + a lighter top strip for the
            category label, so text stays readable on busy stills. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/50 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/60 to-transparent"
        />

        <div className="absolute inset-0 flex flex-col justify-between p-5 text-surface-dark-foreground [text-shadow:0_1px_3px_rgb(var(--black-rgb)/0.7)]">
          <p className="font-accent text-xs opacity-90">
            {title.type === "SERIES" ? t("series") : t("film")} ·{" "}
            {categoryTitle(title.category, locale)}
          </p>
          <div>
            <h3 className="font-display text-xl leading-tight line-clamp-2">
              {title.title}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs opacity-80">
              <span>
                {title.type === "SERIES"
                  ? t("episodesShort", { count: title.episodes.length })
                  : t("film")}
              </span>
              <span>{formatDuration(total)}</span>
            </div>
          </div>
        </div>

        {progressPercent && progressPercent > 0 ? (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-surface-dark/55">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min(100, Math.max(2, progressPercent))}%`,
              }}
            />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
