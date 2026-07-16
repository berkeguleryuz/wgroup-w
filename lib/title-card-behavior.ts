export type TitleCardBehavior = "expanded" | "compact";

const VIDEO_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

export function isCompactTitleCard(variant: TitleCardBehavior) {
  return variant === "compact";
}

export function canAutoplayTitlePreview(
  trailerUrl: string | null,
  reducedMotion: boolean,
  playbackFailed: boolean,
) {
  return Boolean(
    trailerUrl &&
      VIDEO_RE.test(trailerUrl) &&
      !reducedMotion &&
      !playbackFailed,
  );
}
