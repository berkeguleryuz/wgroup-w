"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  name: string;
  /** Size + type utilities for the circle (e.g. "h-8 w-8 text-xs"). */
  className?: string;
};

/**
 * User/org avatar with a hard fallback to the initial letter. Google profile
 * photos (lh3.googleusercontent.com) intermittently 403/429 when hotlinked
 * with a referrer, which left users staring at a broken-image placeholder —
 * so the request is sent referrer-less and any load error drops back to the
 * letter tile instead of the browser's broken-image icon.
 */
export function Avatar({ src, name, className = "h-8 w-8 text-xs" }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display ${className} ${
        showImage ? "" : "bg-primary text-primary-foreground"
      }`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
