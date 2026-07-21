"use client";

import {
  type FocusEvent as ReactFocusEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";

import { categoryTitle } from "@/lib/i18n/category-title";
import { Link } from "@/lib/i18n/navigation";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  canAutoplayTitlePreview,
  shouldOpenTitlePreviewFromFocus,
} from "@/lib/title-card-behavior";
import { formatDuration } from "@/lib/utils";
import type { TitleCardTitle } from "./TitleCard";
import { TitleCardArtwork } from "./TitleCardArtwork";

const OPEN_DELAY_MS = 260;
const CLOSE_DELAY_MS = 180;
const VIEWPORT_GUTTER = 16;
const TOPBAR_GUTTER = 76;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type PreviewPosition = { left: number; top: number; width: number };

type Props = {
  title: TitleCardTitle;
  index: number;
  playHref: string;
  infoHref: string;
  totalDuration: number;
  progressPercent?: number;
  onRemove?: () => void;
  removeLabel?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clearTimer(
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = null;
}

function getPreviewPosition(rect: DOMRect): PreviewPosition {
  const width = Math.min(
    clamp(rect.width * 1.52, 360, 480),
    window.innerWidth - VIEWPORT_GUTTER * 2,
  );
  const estimatedHeight = width * (9 / 16) + 238;
  const left = clamp(
    rect.left + rect.width / 2 - width / 2,
    VIEWPORT_GUTTER,
    window.innerWidth - width - VIEWPORT_GUTTER,
  );
  const desiredTop = rect.top + rect.height / 2 - estimatedHeight * 0.36;
  const top = clamp(
    desiredTop,
    TOPBAR_GUTTER,
    Math.max(
      TOPBAR_GUTTER,
      window.innerHeight - estimatedHeight - VIEWPORT_GUTTER,
    ),
  );

  return { left, top, width };
}

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

const getReducedMotionSnapshot = () =>
  window.matchMedia(REDUCED_MOTION_QUERY).matches;
const getReducedMotionServerSnapshot = () => false;

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

export function ExpandedTitlePreview({
  title,
  index,
  playHref,
  infoHref,
  totalDuration,
  progressPercent,
  onRemove,
  removeLabel,
}: Props) {
  const t = useTranslations("featuredLibrary");
  const tHome = useTranslations("appHome");
  const locale = useLocale();
  const anchorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PreviewPosition | null>(null);

  const playLabel = tHome("play");
  const moreInfoLabel = tHome("moreInfo");
  const filmLabel = t("film");
  const typeLabel = title.type === "SERIES" ? t("series") : filmLabel;
  const episodeLabel =
    title.type === "SERIES"
      ? t("episodesShort", { count: title.episodes.length })
      : filmLabel;
  const localizedCategory = categoryTitle(title.category, locale);
  const publicationYear = title.publishedAt
    ? new Intl.DateTimeFormat(locale, {
        year: "numeric",
        timeZone: "Europe/Berlin",
      }).format(title.publishedAt)
    : null;

  const cancelClose = useCallback(() => clearTimer(closeTimerRef), []);
  const measureAndOpen = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(getPreviewPosition(rect));
    setOpen(true);
  }, []);
  const scheduleClose = useCallback(() => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    closeTimerRef.current = setTimeout(
      () => setOpen(false),
      CLOSE_DELAY_MS,
    );
  }, []);
  const handlePointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") return;
      cancelClose();
      clearTimer(openTimerRef);
      openTimerRef.current = setTimeout(measureAndOpen, OPEN_DELAY_MS);
    },
    [cancelClose, measureAndOpen],
  );
  const handleFocus = useCallback(
    (event: ReactFocusEvent<HTMLDivElement>) => {
      const focusVisible =
        event.target instanceof HTMLElement &&
        event.target.matches(":focus-visible");
      if (!shouldOpenTitlePreviewFromFocus(focusVisible)) return;
      clearTimer(openTimerRef);
      cancelClose();
      measureAndOpen();
    },
    [cancelClose, measureAndOpen],
  );
  const handleBlur = useCallback(
    (event: ReactFocusEvent<HTMLElement>) => {
      const next = event.relatedTarget;
      if (
        next instanceof Node &&
        (anchorRef.current?.contains(next) || previewRef.current?.contains(next))
      ) {
        return;
      }
      scheduleClose();
    },
    [scheduleClose],
  );

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(
    () => () => {
      clearTimer(openTimerRef);
      clearTimer(closeTimerRef);
    },
    [],
  );

  return (
    <>
      <div
        ref={anchorRef}
        className="relative"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={scheduleClose}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <Link
          href={playHref}
          className="group block overflow-hidden rounded-11 border border-border/60 transition-colors duration-300 ease-out hover:border-primary/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
          aria-label={`${playLabel}: ${title.title}`}
        >
          <div className="relative aspect-video">
            <TitleCardArtwork
              src={title.heroImageUrl}
              alt={title.title}
              index={index}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-surface-dark via-surface-dark/50 to-transparent"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-surface-dark/60 to-transparent"
            />
            <div className="absolute inset-0 flex flex-col justify-between p-5 text-surface-dark-foreground [text-shadow:0_1px_3px_rgb(var(--black-rgb)/0.7)]">
              <p className="font-accent text-xs opacity-90">
                {typeLabel} · {localizedCategory}
              </p>
              <div>
                <h3 className="line-clamp-2 text-xl font-semibold leading-tight">
                  {title.title}
                </h3>
                <div className="mt-2 flex items-center justify-between text-xs opacity-80">
                  <span>{episodeLabel}</span>
                  <span>{formatDuration(totalDuration)}</span>
                </div>
              </div>
            </div>
            <ProgressBar percent={progressPercent} />
          </div>
        </Link>
      </div>

      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={previewRef}
              role="group"
              aria-label={title.title}
              className="bf-title-preview fixed z-[80]"
              style={position}
              onPointerEnter={cancelClose}
              onPointerLeave={scheduleClose}
              onFocus={cancelClose}
              onBlur={handleBlur}
            >
              <article className="overflow-hidden rounded-11 border border-primary/25 bg-surface-dark text-surface-dark-foreground shadow-[0_28px_80px_rgb(var(--shadow-rgb)/0.48)]">
                <PreviewMedia
                  title={title}
                  index={index}
                  playHref={playHref}
                  playLabel={playLabel}
                />
                <div className="p-5">
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {title.title}
                  </h3>
                  <p className="mt-1 font-accent text-xs text-primary">
                    {typeLabel} · {localizedCategory}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={playHref}
                      className="inline-flex h-11 items-center gap-2 rounded-11 bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-dark-foreground"
                    >
                      <PlayIcon />
                      {playLabel}
                    </Link>
                    <Tooltip label={moreInfoLabel}>
                      <Link
                        href={infoHref}
                        aria-label={`${moreInfoLabel}: ${title.title}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-surface-dark-foreground/20 bg-surface-dark-foreground/10 transition-colors hover:bg-surface-dark-foreground/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <InfoIcon />
                      </Link>
                    </Tooltip>
                    {onRemove && removeLabel ? (
                      <Tooltip label={removeLabel}>
                        <button
                          type="button"
                          onClick={onRemove}
                          aria-label={removeLabel}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-surface-dark-foreground/20 bg-surface-dark-foreground/10 transition-colors hover:bg-surface-dark-foreground/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <RemoveIcon />
                        </button>
                      </Tooltip>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-surface-dark-foreground/65">
                    <span>{episodeLabel}</span>
                    <span>{formatDuration(totalDuration)}</span>
                    {publicationYear ? <span>{publicationYear}</span> : null}
                  </div>
                  {title.synopsis ? (
                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-surface-dark-foreground/85 text-pretty">
                      {title.synopsis}
                    </p>
                  ) : null}
                </div>
              </article>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function PreviewMedia({
  title,
  index,
  playHref,
  playLabel,
}: {
  title: TitleCardTitle;
  index: number;
  playHref: string;
  playLabel: string;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const reducedMotion = useReducedMotion();
  const canPlayTrailer = canAutoplayTitlePreview(
    title.trailerUrl,
    reducedMotion,
    videoFailed,
  );

  return (
    <Link
      href={playHref}
      aria-label={`${playLabel}: ${title.title}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-dark">
        <TitleCardArtwork
          src={title.heroImageUrl}
          alt=""
          index={index}
          sizes="480px"
          className="object-cover"
        />
        {canPlayTrailer ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={title.trailerUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={title.heroImageUrl ?? undefined}
            onError={() => setVideoFailed(true)}
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface-dark/65 to-transparent"
        />
      </div>
    </Link>
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

function RemoveIcon() {
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
      <path d="m7.25 7.25 5.5 5.5m0-5.5-5.5 5.5" strokeLinecap="round" />
    </svg>
  );
}
