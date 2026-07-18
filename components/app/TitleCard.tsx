"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Category, Episode, Title } from "@prisma/client";

import { categoryTitle } from "@/lib/i18n/category-title";
import { Link } from "@/lib/i18n/navigation";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  isCompactTitleCard,
  type TitleCardBehavior,
} from "@/lib/title-card-behavior";
import { formatDuration } from "@/lib/utils";
import { ExpandedTitlePreview } from "./ExpandedTitlePreview";
import { TitleCardArtwork } from "./TitleCardArtwork";

export type TitleCardTitle = Title & {
  category: Category;
  episodes: Pick<Episode, "durationSec">[];
};

type Props = {
  title: TitleCardTitle;
  index?: number;
  href?: string;
  progressPercent?: number;
  variant?: TitleCardBehavior;
  onRemove?: () => void;
  removeLabel?: string;
};

export function TitleCard({
  title,
  index = 0,
  href,
  progressPercent,
  variant = "expanded",
  onRemove,
  removeLabel,
}: Props) {
  const totalDuration = title.episodes.reduce(
    (sum, episode) => sum + episode.durationSec,
    0,
  );
  const playHref = href ?? `/app/watch/${title.slug}`;
  const infoHref = `/app/watch/${title.slug}`;

  if (isCompactTitleCard(variant)) {
    return (
      <CompactTitleCard
        title={title}
        index={index}
        playHref={playHref}
        infoHref={infoHref}
        totalDuration={totalDuration}
        progressPercent={progressPercent}
      />
    );
  }

  return (
    <ExpandedTitlePreview
      title={title}
      index={index}
      playHref={playHref}
      infoHref={infoHref}
      totalDuration={totalDuration}
      progressPercent={progressPercent}
      onRemove={onRemove}
      removeLabel={removeLabel}
    />
  );
}

function CompactTitleCard({
  title,
  index,
  playHref,
  infoHref,
  totalDuration,
  progressPercent,
}: {
  title: TitleCardTitle;
  index: number;
  playHref: string;
  infoHref: string;
  totalDuration: number;
  progressPercent?: number;
}) {
  const t = useTranslations("featuredLibrary");
  const tHome = useTranslations("appHome");
  const locale = useLocale();
  const publicationYear = title.publishedAt
    ? new Intl.DateTimeFormat(locale, {
        year: "numeric",
        timeZone: "Europe/Berlin",
      }).format(title.publishedAt)
    : null;

  return (
    <article className="group relative aspect-video overflow-hidden rounded-11 border border-border/60 bg-surface-dark text-surface-dark-foreground transition duration-300 ease-out hover:z-10 hover:scale-[1.045] hover:border-foreground/70 focus-within:z-10 focus-within:scale-[1.045] focus-within:border-foreground/70 dark:hover:border-primary/70 dark:focus-within:border-primary/70 motion-reduce:transition-none">
      <Link
        href={playHref}
        className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        aria-label={`${tHome("play")}: ${title.title}`}
      >
        <TitleCardArtwork
          src={title.heroImageUrl}
          alt={title.title}
          index={index}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/25 to-transparent" />
      </Link>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 [text-shadow:0_1px_3px_rgb(var(--black-rgb)/0.7)]">
        <p className="font-accent text-[11px] opacity-85">
          {title.type === "SERIES" ? t("series") : t("film")} ·{" "}
          {categoryTitle(title.category, locale)}
        </p>
        <h3 className="mt-1 line-clamp-1 text-lg font-semibold leading-tight">
          {title.title}
        </h3>
        <div className="mt-2 flex items-center gap-2 font-mono text-[11px] opacity-0 transition-opacity duration-200 group-hover:opacity-85 group-focus-within:opacity-85">
          <span>{formatDuration(totalDuration)}</span>
          {publicationYear ? <span>{publicationYear}</span> : null}
        </div>
        <div className="pointer-events-auto mt-3 flex translate-y-2 items-center gap-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transform-none">
          <Link
            href={playHref}
            className="inline-flex h-9 items-center gap-2 rounded-11 bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <PlayIcon />
            {tHome("play")}
          </Link>
          <Tooltip label={tHome("moreInfo")}>
            <Link
              href={infoHref}
              aria-label={`${tHome("moreInfo")}: ${title.title}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-dark-foreground/25 bg-surface-dark/80 transition-colors hover:bg-surface-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <InfoIcon />
            </Link>
          </Tooltip>
        </div>
      </div>

      <ProgressBar percent={progressPercent} />
    </article>
  );
}

function ProgressBar({ percent }: { percent?: number }) {
  if (!percent || percent <= 0) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 h-1.5 bg-surface-dark/55">
      <div
        className="h-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
      />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M6 4.5 16 10 6 15.5Z" />
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
      aria-hidden
    >
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 8.75v4.5M10 6.5h.01" strokeLinecap="round" />
    </svg>
  );
}
