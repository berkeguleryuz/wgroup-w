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
  { bg: "linear-gradient(135deg, #100D08 0%, #3a2e1f 100%)", dark: true },
  { bg: "linear-gradient(135deg, #edddb9 0%, #d9c08a 100%)", dark: false },
  { bg: "linear-gradient(135deg, #2b2016 0%, #5b4630 100%)", dark: true },
  { bg: "linear-gradient(135deg, #5b534a 0%, #100D08 100%)", dark: true },
  { bg: "linear-gradient(135deg, #100D08 0%, #5b4630 100%)", dark: true },
  { bg: "linear-gradient(135deg, #edddb9 0%, #c9a86a 100%)", dark: false },
];

export function TitleCard({ title, variant = "tall", index = 0 }: Props) {
  const t = useTranslations("featuredLibrary");
  const total = title.episodes.reduce((s, e) => s + e.durationSec, 0);
  const c = palette[index % palette.length];
  const aspect = variant === "wide" ? "aspect-[16/9]" : "aspect-[3/4]";

  return (
    <Link
      href={`/app/watch/${title.slug}`}
      className="group block rounded-11 overflow-hidden border border-border/60 transition-transform hover:-translate-y-0.5"
      style={{
        background: c.bg,
        color: c.dark ? "var(--surface-dark-foreground)" : "var(--foreground)",
      }}
    >
      <div className={`${aspect} p-5 flex flex-col justify-between`}>
        <div>
          <p className="font-accent text-xs opacity-80">
            {title.type === "SERIES" ? t("series") : t("film")} ·{" "}
            {title.category.title}
          </p>
          <h3 className="mt-2 font-display text-xl leading-tight line-clamp-3">
            {title.title}
          </h3>
        </div>
        <div className="flex items-center justify-between text-xs opacity-80">
          <span>
            {title.type === "SERIES"
              ? t("episodesShort", { count: title.episodes.length })
              : t("film")}
          </span>
          <span>{formatDuration(total)}</span>
        </div>
      </div>
    </Link>
  );
}
