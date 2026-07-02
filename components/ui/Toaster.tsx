"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

type ToastItem = {
  id: number;
  message: string;
};

const TOAST_EVENT = "bf:toast";
const TOAST_DURATION_MS = 3500;

/** Fire a toast from any client component: `toast("Kaydedildi")`. */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

/** Toast keys server actions may append as `?toast=<key>` after a redirect. */
const FLASH_KEYS = new Set(["saved", "created", "deleted", "sent"]);

/**
 * Reads a one-shot `?toast=<key>` search param (set by server actions after a
 * redirect), shows the translated toast and strips the param from the URL.
 */
function FlashToastListener() {
  const t = useTranslations("toasts");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = searchParams.get("toast");

  useEffect(() => {
    if (!key || !FLASH_KEYS.has(key)) return;
    toast(t(key));
    const params = new URLSearchParams(searchParams);
    params.delete("toast");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [key, t, router, pathname, searchParams]);

  return null;
}

let nextId = 1;

/** Global toast outlet — mount once per layout. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const message = (e as CustomEvent<string>).detail;
      if (!message) return;
      const id = nextId++;
      setItems((prev) => [...prev, { id, message }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, TOAST_DURATION_MS);
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
            className="bf-toast pointer-events-auto flex items-center gap-3 rounded-11 border border-white/10 bg-surface-dark px-4 py-3 text-left text-sm text-surface-dark-foreground shadow-[0_20px_50px_-20px_rgba(16,13,8,0.55)]"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckIcon />
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
