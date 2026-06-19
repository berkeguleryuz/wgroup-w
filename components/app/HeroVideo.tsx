"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

/**
 * Hero background trailer. Respects prefers-reduced-motion: users who ask for
 * less motion get the static poster instead of the autoplaying loop.
 */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (reduced) {
    // eslint-disable-next-line @next/next/no-img-element
    return poster ? (
      <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
    ) : null;
  }

  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      autoPlay
      muted
      loop
      playsInline
      poster={poster}
    />
  );
}
