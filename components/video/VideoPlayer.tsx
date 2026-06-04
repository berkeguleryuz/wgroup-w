"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslations } from "next-intl";

export type SubtitleTrack = { lang: string; label: string; src: string };
type Level = { index: number; height: number };

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const HLS_RE = /\.m3u8(\?.*)?$/i;

type Props = {
  src: string;
  poster?: string;
  subtitles?: SubtitleTrack[];
  capSeconds?: number | null;
  startAt?: number;
  className?: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
  onTimeUpdate?: (sec: number) => void;
  onEnded?: () => void;
  onCapReached?: () => void;
  /** Overlays (paywall, completed) rendered inside the player so they survive fullscreen. */
  children?: ReactNode;
};

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  src,
  poster,
  subtitles = [],
  capSeconds = null,
  startAt = 0,
  className,
  videoRef,
  onTimeUpdate,
  onEnded,
  onCapReached,
  children,
}: Props) {
  const t = useTranslations("player");
  const innerRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
  const [activeCaption, setActiveCaption] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<"settings" | "captions" | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const setRefs = (node: HTMLVideoElement | null) => {
    innerRef.current = node;
    if (videoRef) videoRef.current = node;
  };

  // ---- Source attach (hls.js for .m3u8, native otherwise) ----
  useEffect(() => {
    const video = innerRef.current;
    if (!video) return;
    let destroyed = false;
    setLevels([]);
    setCurrentLevel(-1);

    const isHls = HLS_RE.test(src);
    if (!isHls) {
      // Plain mp4/webm.
      video.src = src;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    // HLS: prefer hls.js when MSE is available (gives us quality control),
    // and only fall back to native HLS (Safari) when it isn't.
    void import("hls.js").then(({ default: Hls }) => {
      if (destroyed) return;
      const node = innerRef.current;
      if (!node) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(node);
        const syncLevels = () => {
          setLevels(
            hls.levels
              .map((l, i) => ({ index: i, height: l.height }))
              .filter((l) => l.height > 0)
              .reverse(),
          );
        };
        hls.on(Hls.Events.MANIFEST_PARSED, syncLevels);
        hls.on(Hls.Events.LEVELS_UPDATED, syncLevels);
        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
          setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level);
        });
      } else {
        // Native HLS (Safari) — adapts quality on its own.
        node.src = src;
      }
    });

    return () => {
      destroyed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  // ---- Caption track modes ----
  useEffect(() => {
    const video = innerRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      track.mode =
        activeCaption && track.language === activeCaption ? "showing" : "hidden";
    }
  }, [activeCaption, ready, subtitles.length]);

  // ---- Video element events ----
  useEffect(() => {
    const video = innerRef.current;
    if (!video) return;

    const onLoaded = () => {
      setDuration(video.duration || 0);
      setReady(true);
      if (startAt > 0 && (capSeconds === null || startAt < capSeconds)) {
        video.currentTime = startAt;
      }
    };
    const onTime = () => {
      if (capSeconds !== null && video.currentTime >= capSeconds) {
        video.pause();
        onCapReached?.();
      }
      setCurrent(video.currentTime);
      onTimeUpdate?.(video.currentTime);
      if (video.buffered.length) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onRate = () => setRate(video.playbackRate);
    const onVol = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const onEnd = () => {
      setPlaying(false);
      onEnded?.();
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ratechange", onRate);
    video.addEventListener("volumechange", onVol);
    video.addEventListener("ended", onEnd);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ratechange", onRate);
      video.removeEventListener("volumechange", onVol);
      video.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capSeconds, startAt]);

  // ---- Fullscreen state ----
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---- Controls auto-hide ----
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (innerRef.current && !innerRef.current.paused) setControlsVisible(false);
    }, 2600);
  }, []);

  // ---- Actions ----
  const togglePlay = useCallback(() => {
    const v = innerRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const seekBy = (delta: number) => {
    const v = innerRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  };

  const seekTo = (ratio: number) => {
    const v = innerRef.current;
    if (!v || !v.duration) return;
    v.currentTime = ratio * v.duration;
  };

  const changeVolume = (val: number) => {
    const v = innerRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
  };

  const toggleMute = () => {
    const v = innerRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };

  const setSpeed = (r: number) => {
    const v = innerRef.current;
    if (v) v.playbackRate = r;
    setOpenMenu(null);
  };

  const setQuality = (index: number) => {
    const hls = hlsRef.current as { currentLevel: number } | null;
    if (hls) hls.currentLevel = index;
    setCurrentLevel(index);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        e.preventDefault();
        seekBy(5);
        break;
      case "ArrowLeft":
        e.preventDefault();
        seekBy(-5);
        break;
      case "ArrowUp":
        e.preventDefault();
        changeVolume(Math.min(1, volume + 0.1));
        break;
      case "ArrowDown":
        e.preventDefault();
        changeVolume(Math.max(0, volume - 0.1));
        break;
      case "f":
        toggleFullscreen();
        break;
      case "m":
        toggleMute();
        break;
      case "c":
        if (subtitles.length) {
          setActiveCaption((a) => (a ? null : subtitles[0].lang));
        }
        break;
    }
    showControls();
  };

  const progressRatio = duration ? current / duration : 0;
  const bufferedRatio = duration ? buffered / duration : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      className={`group relative overflow-hidden bg-black outline-none ${
        controlsVisible || !playing ? "[&_video]:cursor-default" : "cursor-none"
      } ${className ?? ""}`}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={setRefs}
        poster={poster}
        playsInline
        onClick={togglePlay}
        className="aspect-video w-full bg-black"
      >
        {subtitles.map((s) => (
          <track
            key={s.lang}
            kind="subtitles"
            srcLang={s.lang}
            label={s.label}
            src={s.src}
          />
        ))}
      </video>

      {/* Center play button when paused */}
      {ready && !playing ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={t("play")}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg backdrop-blur transition-transform hover:scale-105">
            <PlayIcon className="h-7 w-7" />
          </span>
        </button>
      ) : null}

      {/* Control bar */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-10 text-surface-dark-foreground transition-opacity duration-300 ${
          controlsVisible || !playing ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Seek bar */}
        <SeekBar
          progress={progressRatio}
          buffered={bufferedRatio}
          onSeek={seekTo}
        />

        <div className="mt-1.5 flex items-center gap-3 text-sm">
          <IconButton onClick={togglePlay} label={playing ? t("pause") : t("play")}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </IconButton>

          {/* Volume */}
          <div className="group/vol flex items-center gap-1.5">
            <IconButton onClick={toggleMute} label={t("mute")}>
              {muted || volume === 0 ? <MutedIcon /> : <VolumeIcon />}
            </IconButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label={t("volume")}
              className="h-1 w-0 cursor-pointer accent-primary opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100"
            />
          </div>

          <span className="font-mono text-xs tabular-nums opacity-90">
            {fmt(current)} / {fmt(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {/* Captions */}
            {subtitles.length > 0 ? (
              <div className="relative">
                <IconButton
                  onClick={() =>
                    setOpenMenu((m) => (m === "captions" ? null : "captions"))
                  }
                  label={t("captions")}
                  active={!!activeCaption}
                >
                  <CcIcon />
                </IconButton>
                {openMenu === "captions" ? (
                  <Menu>
                    <MenuTitle>{t("captions")}</MenuTitle>
                    <MenuItem
                      selected={!activeCaption}
                      onClick={() => {
                        setActiveCaption(null);
                        setOpenMenu(null);
                      }}
                    >
                      {t("off")}
                    </MenuItem>
                    {subtitles.map((s) => (
                      <MenuItem
                        key={s.lang}
                        selected={activeCaption === s.lang}
                        onClick={() => {
                          setActiveCaption(s.lang);
                          setOpenMenu(null);
                        }}
                      >
                        {s.label}
                      </MenuItem>
                    ))}
                  </Menu>
                ) : null}
              </div>
            ) : null}

            {/* Settings: speed + quality */}
            <div className="relative">
              <IconButton
                onClick={() =>
                  setOpenMenu((m) => (m === "settings" ? null : "settings"))
                }
                label={t("settings")}
              >
                <GearIcon />
              </IconButton>
              {openMenu === "settings" ? (
                <Menu>
                  <MenuTitle>{t("speed")}</MenuTitle>
                  <div className="flex flex-wrap gap-1 px-1.5 pb-2">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSpeed(s)}
                        className={`rounded-md px-2 py-1 text-xs transition-colors ${
                          rate === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        {s === 1 ? "1×" : `${s}×`}
                      </button>
                    ))}
                  </div>
                  {levels.length > 0 ? (
                    <>
                      <MenuTitle>{t("quality")}</MenuTitle>
                      <MenuItem
                        selected={currentLevel === -1}
                        onClick={() => {
                          setQuality(-1);
                          setOpenMenu(null);
                        }}
                      >
                        {t("auto")}
                      </MenuItem>
                      {levels.map((l) => (
                        <MenuItem
                          key={l.index}
                          selected={currentLevel === l.index}
                          onClick={() => {
                            setQuality(l.index);
                            setOpenMenu(null);
                          }}
                        >
                          {l.height}p
                        </MenuItem>
                      ))}
                    </>
                  ) : null}
                </Menu>
              ) : null}
            </div>

            <IconButton onClick={toggleFullscreen} label={t("fullscreen")}>
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

// ---------------- sub-components ----------------

function SeekBar({
  progress,
  buffered,
  onSeek,
}: {
  progress: number;
  buffered: number;
  onSeek: (ratio: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seek = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  };
  return (
    <div
      ref={ref}
      onClick={(e) => seek(e.clientX)}
      className="group/seek relative h-3 cursor-pointer"
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
        <div
          className="absolute inset-y-0 left-0 bg-white/35"
          style={{ width: `${buffered * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-primary"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity group-hover/seek:opacity-100"
        style={{ left: `${progress * 100}%` }}
      />
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/15 ${
        active ? "text-primary" : ""
      }`}
    >
      {children}
    </button>
  );
}

function Menu({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-11 right-0 min-w-[160px] overflow-hidden rounded-11 border border-white/10 bg-surface-dark/95 py-1.5 text-sm shadow-xl backdrop-blur">
      {children}
    </div>
  );
}

function MenuTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
      {children}
    </p>
  );
}

function MenuItem({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left transition-colors hover:bg-white/10 ${
        selected ? "text-primary" : "text-surface-dark-foreground"
      }`}
    >
      <span>{children}</span>
      {selected ? <CheckIcon className="h-3.5 w-3.5" /> : null}
    </button>
  );
}

// ---------------- icons ----------------
function PlayIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden>
      <path d="M6 4.5 L16 10 L6 15.5 Z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
      <rect x="5" y="4" width="3.5" height="12" rx="1" />
      <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
    </svg>
  );
}
function VolumeIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8v4h3l4 3V5L7 8H4Z" />
      <path d="M14 7.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}
function MutedIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8v4h3l4 3V5L7 8H4Z" />
      <path d="M13.5 8.5l4 4M17.5 8.5l-4 4" />
    </svg>
  );
}
function CcIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M8 9a2 2 0 0 0-2 2 2 2 0 0 0 2 2M14 9a2 2 0 0 0-2 2 2 2 0 0 0 2 2" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7" strokeLinecap="round" />
    </svg>
  );
}
function FullscreenIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" />
    </svg>
  );
}
function FullscreenExitIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 3v4H3M13 3v4h4M7 17v-4H3M13 17v-4h4" />
    </svg>
  );
}
function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10.5 L8.5 15 L16 6" />
    </svg>
  );
}
