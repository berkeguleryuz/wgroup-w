import { useTranslations } from "next-intl";
import type { Title, Category, Episode } from "@prisma/client";

import { Link } from "@/lib/i18n/navigation";
import { formatDuration } from "@/lib/utils";

type Props = {
  title: Title & { category: Category; episodes: Pick<Episode, "durationSec">[] };
  variant?: "wide" | "tall";
  index?: number;
};

const palette = [
  "linear-gradient(135deg, #100D08 0%, #3a2e1f 100%)",
  "linear-gradient(135deg, #2b2016 0%, #5b4630 100%)",
  "linear-gradient(135deg, #5b534a 0%, #100D08 100%)",
  "linear-gradient(135deg, #100D08 0%, #5b4630 100%)",
];

export function TitleCard({ title, variant = "tall", index = 0 }: Props) {
  const t = useTranslations("featuredLibrary");
  const total = title.episodes.reduce((s, e) => s + e.durationSec, 0);
  const aspect = variant === "wide" ? "aspect-[16/9]" : "aspect-[3/4]";

  return (
    <Link
      href={`/app/watch/${title.slug}`}
      className="group block overflow-hidden rounded-11 border border-border/60 transition-transform hover:-translate-y-0.5"
    >
      <div className={`relative ${aspect}`}>
        {title.heroImageUrl ? (
          <img
            src={title.heroImageUrl}
            alt={title.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
            {title.category.title}
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
      </div>
    </Link>
  );
}
