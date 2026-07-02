"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type Props = {
  confirmText: string;
  /** Dialog heading; defaults to the generic "are you sure" title. */
  confirmTitle?: string;
  /** Confirm button label; defaults to the generic confirm label. */
  confirmLabel?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Submit button guarded by a themed confirmation dialog (replaces the native
 * `window.confirm`). Renders as `type="button"`; the wrapping form is only
 * submitted after the user confirms in the dialog.
 */
export function ConfirmButton({
  confirmText,
  confirmTitle,
  confirmLabel,
  className,
  children,
}: Props) {
  const t = useTranslations("common");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Focus the confirm action when the dialog opens; Escape closes it.
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-surface-dark/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={confirmTitle ?? t("confirmTitle")}
            className="relative w-full max-w-md rounded-11 border border-border bg-background p-6 text-foreground shadow-[0_30px_80px_-20px_rgba(16,13,8,0.45)]"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40">
                <WarningIcon />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-xl leading-snug">
                  {confirmTitle ?? t("confirmTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {confirmText}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-11 border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t("cancel")}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.form?.requestSubmit();
                }}
                className="rounded-11 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
              >
                {confirmLabel ?? t("confirmAction")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 3 1.8 16.5h16.4L10 3z" />
      <path d="M10 8v4M10 14.6v.2" />
    </svg>
  );
}
