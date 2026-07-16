export const TOOLTIP_OPEN_DELAY_MS = 250;
export const TOOLTIP_CLOSE_DELAY_MS = 100;
export const TOOLTIP_VIEWPORT_GUTTER = 12;
export const TOOLTIP_TRIGGER_GAP = 10;

export type TooltipAction =
  | "pointer-open"
  | "focus-open"
  | "close"
  | "escape";

export type TooltipSide = "top" | "bottom";

export type TooltipPosition = {
  left: number;
  top: number;
  side: TooltipSide;
  arrowLeft: number;
};

type AnchorRect = {
  left: number;
  top: number;
  bottom: number;
  width: number;
};

type Size = { width: number; height: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getTooltipDelay(action: TooltipAction) {
  if (action === "pointer-open") return TOOLTIP_OPEN_DELAY_MS;
  if (action === "close") return TOOLTIP_CLOSE_DELAY_MS;
  return 0;
}

export function getTooltipPosition(
  anchor: AnchorRect,
  tooltip: Size,
  viewport: Size,
): TooltipPosition {
  const maxLeft = Math.max(
    TOOLTIP_VIEWPORT_GUTTER,
    viewport.width - tooltip.width - TOOLTIP_VIEWPORT_GUTTER,
  );
  const desiredLeft = anchor.left + anchor.width / 2 - tooltip.width / 2;
  const left = clamp(
    desiredLeft,
    TOOLTIP_VIEWPORT_GUTTER,
    maxLeft,
  );

  const above = anchor.top - TOOLTIP_TRIGGER_GAP - tooltip.height;
  const maxTop = Math.max(
    TOOLTIP_VIEWPORT_GUTTER,
    viewport.height - tooltip.height - TOOLTIP_VIEWPORT_GUTTER,
  );
  const side: TooltipSide =
    above >= TOOLTIP_VIEWPORT_GUTTER ? "top" : "bottom";
  const top =
    side === "top"
      ? above
      : clamp(
          anchor.bottom + TOOLTIP_TRIGGER_GAP,
          TOOLTIP_VIEWPORT_GUTTER,
          maxTop,
        );
  const arrowLeft = clamp(
    anchor.left + anchor.width / 2 - left,
    TOOLTIP_VIEWPORT_GUTTER,
    Math.max(
      TOOLTIP_VIEWPORT_GUTTER,
      tooltip.width - TOOLTIP_VIEWPORT_GUTTER,
    ),
  );

  return { left, top, side, arrowLeft };
}
