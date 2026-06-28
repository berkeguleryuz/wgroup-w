"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  poster?: string;
  playsInline?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onReady?: (v: HTMLVideoElement) => void;
};

const HLS_RE = /\.m3u8(\?.*)?$/i;

export function HlsVideo({
  src,
  className,
  autoPlay,
  muted,
  loop,
  controls,
  poster,
  playsInline,
  videoRef,
  onReady,
}: Props) {
  const innerRef = useRef<HTMLVideoElement>(null);

  // Forward the internal ref to the optional external ref.
  const setRef = (node: HTMLVideoElement | null) => {
    innerRef.current = node;
    if (videoRef) videoRef.current = node;
  };

  useEffect(() => {
    const video = innerRef.current;
    if (!video) return;

    let destroyed = false;
    // hls.js instance, typed loosely to avoid importing the type eagerly.
    let hls: { destroy: () => void } | null = null;

    const isHls = HLS_RE.test(src);

    if (!isHls) {
      // Plain mp4/webm/mov — direct assignment.
      video.src = src;
      onReady?.(video);
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    // Native HLS support (Safari) — assign directly.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      onReady?.(video);
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    // Fallback: use hls.js (dynamically imported).
    void import("hls.js").then(({ default: Hls }) => {
      if (destroyed) return;
      const node = innerRef.current;
      if (!node) return;
      if (Hls.isSupported()) {
        const instance = new Hls();
        hls = instance;
        instance.loadSource(src);
        instance.attachMedia(node);
        onReady?.(node);
      } else {
        // No MSE support at all — best effort direct assignment.
        node.src = src;
        onReady?.(node);
      }
    });

    return () => {
      destroyed = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
    };
  }, [src, onReady]);

  return (
    <video
      ref={setRef}
      className={className}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      controls={controls}
      poster={poster}
      playsInline={playsInline}
    />
  );
}
