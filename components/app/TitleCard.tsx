import { useTranslations } from "next-intl";
import type { Title, Category, Episode } from "@prisma/client";

import { Link } from "@/lib/i18n/navigation";
import { formatDuration } from "@/lib/utils";

type Props = {
  title: Title & { category: Category; episodes: Pick<Episode, "durationSec">[] };
  variant?: "wide" | "tall";
  index?: number;
  /** Override the link target (e.g. resume a specific episode). Defaults to the title page. */
  href?: string;
  /** Watched fraction 0–100. When > 0, renders a progress bar pinned to the card's bottom edge. */
  progressPercent?: number;
};

const palette = [
  "linear-gradient(135deg, #100D08 0%, #3a2e1f 100%)",
  "linear-gradient(135deg, #2b2016 0%, #5b4630 100%)",
  "linear-gradient(135deg, #5b534a 0%, #100D08 100%)",
  "linear-gradient(135deg, #100D08 0%, #5b4630 100%)",
];

export function TitleCard({
  title,
  variant = "tall",
  index = 0,
  href,
  progressPercent,
}: Props) {
  const t = useTranslations("featuredLibrary");
  const total = title.episodes.reduce((s, e) => s + e.durationSec, 0);
  const aspect = variant === "wide" ? "aspect-[16/9]" : "aspect-[3/4]";

  return (
    <Link
      href={href ?? `/app/watch/${title.slug}`}
      className="group block overflow-hidden rounded-11 border border-border/60 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/70 hover:shadow-2xl hover:shadow-foreground/25 motion-reduce:transition-none"
    >
      <div className={`relative ${aspect}`}>
        {title.heroImageUrl ? (
          <img
            src={title.heroImageUrl}
            alt={title.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: palette[index % palette.length] }}
          />
        )}

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10"
        />

        <div className="absolute inset-0 flex flex-col justify-between p-5 text-surface-dark-foreground">
          <p className="font-accent text-xs opacity-90">
            {title.type === "SERIES" ? t("series") : t("film")} ·{" "}
            {/* Turkish category name — keep the dotted İ under uppercase. */}
            <span lang="tr">{title.category.title}</span>
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
