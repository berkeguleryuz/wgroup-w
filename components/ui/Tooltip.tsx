"use client";

import {
  cloneElement,
  type CSSProperties,
  type FocusEvent,
  type MutableRefObject,
  type PointerEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  getTooltipDelay,
  getTooltipPosition,
  type TooltipPosition,
} from "@/lib/tooltip-behavior";

type TriggerProps = { "aria-describedby"?: string };

type Props = {
  label: string;
  children: ReactElement<TriggerProps>;
};

function clearTimer(
  timer: MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (timer.current) clearTimeout(timer.current);
  timer.current = null;
}

export function Tooltip({ label, children }: Props) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const closeNow = useCallback(() => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    setOpen(false);
    setPosition(null);
  }, []);

  const scheduleOpen = useCallback((delay: number) => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    openTimerRef.current = setTimeout(() => setOpen(true), delay);
  }, []);

  const scheduleClose = useCallback(() => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    closeTimerRef.current = setTimeout(closeNow, getTooltipDelay("close"));
  }, [closeNow]);

  useLayoutEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const tooltip = tooltipRef.current?.getBoundingClientRect();
      if (!anchor || !tooltip) return;

      setPosition(
        getTooltipPosition(
          {
            left: anchor.left,
            top: anchor.top,
            bottom: anchor.bottom,
            width: anchor.width,
          },
          { width: tooltip.width, height: tooltip.height },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [label, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNow();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeNow);
    window.addEventListener("scroll", closeNow, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeNow);
      window.removeEventListener("scroll", closeNow, true);
    };
  }, [closeNow, open]);

  useEffect(
    () => () => {
      clearTimer(openTimerRef);
      clearTimer(closeTimerRef);
    },
    [],
  );

  const handlePointerEnter = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch") return;
    scheduleOpen(getTooltipDelay("pointer-open"));
  };

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && anchorRef.current?.contains(next)) return;
    scheduleClose();
  };

  const describedBy = [children.props["aria-describedby"], id]
    .filter(Boolean)
    .join(" ");
  const trigger = cloneElement(children, { "aria-describedby": describedBy });
  const portalStyle: CSSProperties = position
    ? { left: position.left, top: position.top }
    : { left: 0, top: 0, visibility: "hidden" };

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={scheduleClose}
      onFocus={() => scheduleOpen(getTooltipDelay("focus-open"))}
      onBlur={handleBlur}
    >
      {trigger}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              id={id}
              role="tooltip"
              data-side={position?.side ?? "top"}
              className="bf-tooltip pointer-events-none fixed z-[100] max-w-[min(16rem,calc(100vw-24px))] rounded-11 bg-primary px-3 py-2 text-center text-xs font-semibold leading-none text-primary-foreground shadow-[0_12px_32px_rgb(var(--shadow-rgb)/0.35)]"
              style={portalStyle}
            >
              {label}
              {position ? (
                <span
                  aria-hidden
                  className={`absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-primary ${
                    position.side === "top" ? "-bottom-1" : "-top-1"
                  }`}
                  style={{ left: position.arrowLeft }}
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
