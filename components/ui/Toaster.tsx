"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

type ToastType = "success" | "error";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

const TOAST_EVENT = "bf:toast";
const TOAST_DURATION_MS = 3500;
const ERROR_TOAST_DURATION_MS = 6000;

/** Fire a toast from any client component: `toast("Kaydedildi")`. */
export function toast(message: string, type: ToastType = "success") {
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, { detail: { message, type } }),
  );
}

/** Toast keys server actions may append as `?toast=<key>` after a redirect. */
const FLASH_KEYS = new Set(["saved", "created", "deleted", "sent", "error"]);

/**
 * Reads a one-shot `?toast=<key>` search param (set by server actions after a
 * redirect), shows the translated toast and strips the param from the URL.
 * `?toast=error` may carry a human-readable detail in `emsg`.
 */
function FlashToastListener() {
  const t = useTranslations("toasts");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = searchParams.get("toast");
  const emsg = searchParams.get("emsg");

  useEffect(() => {
    if (!key || !FLASH_KEYS.has(key)) return;
    if (key === "error") {
      toast(emsg || t("error"), "error");
    } else {
      toast(t(key));
    }
    const params = new URLSearchParams(searchParams);
    params.delete("toast");
    params.delete("emsg");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [key, emsg, t, router, pathname, searchParams]);

  return null;
}

let nextId = 1;

/** Global toast outlet — mount once per layout. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; type: ToastType }>)
        .detail;
      if (!detail?.message) return;
      const id = nextId++;
      setItems((prev) => [
        ...prev,
        { id, message: detail.message, type: detail.type ?? "success" },
      ]);
      window.setTimeout(
        () => {
          setItems((prev) => prev.filter((item) => item.id !== id));
        },
        detail.type === "error" ? ERROR_TOAST_DURATION_MS : TOAST_DURATION_MS,
      );
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <FlashToastListener />
      </Suspense>
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[70] flex w-full max-w-sm flex-col items-end gap-2"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              setItems((prev) => prev.filter((i) => i.id !== item.id))
            }
            className={`bf-toast pointer-events-auto flex items-center gap-3 rounded-11 border px-4 py-3 text-left text-sm text-surface-dark-foreground shadow-[0_20px_50px_-20px_rgb(var(--shadow-rgb)/0.55)] ${
              item.type === "error"
                ? "border-red-500/40 bg-surface-dark"
                : "border-white/10 bg-surface-dark"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                item.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {item.type === "error" ? <CrossIcon /> : <CheckIcon />}
            </span>
            {item.message}
          </button>
        ))}
      </div>
    </>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </svg>
  );
}
