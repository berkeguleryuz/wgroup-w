"use client";

import { useEffect } from "react";
import Image from "next/image";

import {
  BUSYFLIX_LOADING_ATTRIBUTE,
  BUSYFLIX_LOADING_STARTED_ATTRIBUTE,
  clearBusyflixLoading,
  remainingBusyflixLoadingTime,
} from "@/lib/busyflix-loading";

export function BusyflixLoadingScreen() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute(BUSYFLIX_LOADING_ATTRIBUTE)) return;

    const startedAt = Number(
      root.getAttribute(BUSYFLIX_LOADING_STARTED_ATTRIBUTE),
    );
    const now = Date.now();
    const delay = remainingBusyflixLoadingTime(
      Number.isFinite(startedAt) ? startedAt : now,
      now,
    );
    const timeout = window.setTimeout(clearBusyflixLoading, delay);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div
      className="bf-loading-screen"
      role="status"
      aria-live="polite"
      aria-label="Busyflix"
      aria-busy="true"
    >
      <div className="bf-loading-screen__content">
        <Image
          className="bf-loading-screen__logo"
          src="/logo-transparent.webp"
          alt=""
          width={480}
          height={640}
          sizes="(max-width: 767px) 88px, 128px"
          preload
        />
        <span className="bf-loading-screen__track" aria-hidden="true">
          <span className="bf-loading-screen__progress" />
        </span>
      </div>
    </div>
  );
}
