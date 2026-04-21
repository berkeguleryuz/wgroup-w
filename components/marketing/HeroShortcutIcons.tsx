"use client";

type IconProps = {
  color: string;
  className?: string;
};

/**
 * Animated shortcut icons for the hero's feature row.
 * Each one is a self-contained 24×24 SVG with scoped CSS animations.
 */

export function Icon4K({ color, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <style>{`
        @keyframes icon4k-pixel {
          0%, 100% { opacity: 0.15; }
          40%      { opacity: 1; }
        }
        .icon4k-pixel { animation: icon4k-pixel 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .icon4k-pixel:nth-child(2) { animation-delay: .15s; }
        .icon4k-pixel:nth-child(3) { animation-delay: .30s; }
        .icon4k-pixel:nth-child(4) { animation-delay: .45s; }
        .icon4k-pixel:nth-child(5) { animation-delay: .30s; }
        .icon4k-pixel:nth-child(6) { animation-delay: .45s; }
        .icon4k-pixel:nth-child(7) { animation-delay: .60s; }
        .icon4k-pixel:nth-child(8) { animation-delay: .75s; }
        .icon4k-pixel:nth-child(9) { animation-delay: .60s; }
        .icon4k-pixel:nth-child(10){ animation-delay: .75s; }
        .icon4k-pixel:nth-child(11){ animation-delay: .90s; }
        .icon4k-pixel:nth-child(12){ animation-delay: 1.05s; }
        .icon4k-pixel:nth-child(13){ animation-delay: .90s; }
        .icon4k-pixel:nth-child(14){ animation-delay: 1.05s; }
        .icon4k-pixel:nth-child(15){ animation-delay: 1.20s; }
        .icon4k-pixel:nth-child(16){ animation-delay: 1.35s; }
      `}</style>
      {/* Monitor frame */}
      <rect x="2.5" y="4.5" width="19" height="13" rx="2" />
      <path d="M 9 20.5 H 15" />
      <path d="M 12 17.5 V 20.5" />
      {/* Pixel grid 4x4 */}
      <g fill={color} stroke="none">
        {Array.from({ length: 16 }).map((_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          return (
            <rect
              key={i}
              className="icon4k-pixel"
              x={5 + col * 3.4}
              y={6.5 + row * 2.2}
              width="2.2"
              height="1.4"
              rx="0.3"
            />
          );
        })}
      </g>
    </svg>
  );
}

export function IconHD({ color, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <style>{`
        @keyframes iconhd-bar {
          0%, 100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1); }
        }
        .iconhd-bar { transform-box: fill-box; transform-origin: center; animation: iconhd-bar 1.4s ease-in-out infinite; }
        .iconhd-bar:nth-child(2) { animation-delay: .12s; }
        .iconhd-bar:nth-child(3) { animation-delay: .24s; }
        .iconhd-bar:nth-child(4) { animation-delay: .36s; }
        .iconhd-bar:nth-child(5) { animation-delay: .48s; }
        .iconhd-bar:nth-child(6) { animation-delay: .60s; }
        .iconhd-bar:nth-child(7) { animation-delay: .72s; }
      `}</style>
      {/* Monitor frame */}
      <rect x="2.5" y="4.5" width="19" height="13" rx="2" />
      <path d="M 9 20.5 H 15" />
      <path d="M 12 17.5 V 20.5" />
      {/* Waveform bars */}
      <g fill={color} stroke="none">
        <rect className="iconhd-bar" x="5"    y="8"   width="1.4" height="6" rx="0.7" />
        <rect className="iconhd-bar" x="7.2"  y="8"   width="1.4" height="6" rx="0.7" />
        <rect className="iconhd-bar" x="9.4"  y="8"   width="1.4" height="6" rx="0.7" />
        <rect className="iconhd-bar" x="11.6" y="8"   width="1.4" height="6" rx="0.7" />
        <rect className="iconhd-bar" x="13.8" y="8"   width="1.4" height="6" rx="0.7" />
        <rect className="iconhd-bar" x="16"   y="8"   width="1.4" height="6" rx="0.7" />
        <rect className="iconhd-bar" x="18.2" y="8"   width="1.4" height="6" rx="0.7" />
      </g>
    </svg>
  );
}

export function IconPreview({ color, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <style>{`
        @keyframes iconprev-pulse {
          0%   { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .iconprev-ring { transform-box: fill-box; transform-origin: center; animation: iconprev-pulse 2.2s ease-out infinite; }
        .iconprev-ring-b { animation-delay: .75s; }
        .iconprev-ring-c { animation-delay: 1.5s; }
      `}</style>
      {/* Expanding rings */}
      <circle className="iconprev-ring"                   cx="12" cy="12" r="8" stroke={color} />
      <circle className="iconprev-ring iconprev-ring-b"   cx="12" cy="12" r="8" stroke={color} />
      <circle className="iconprev-ring iconprev-ring-c"   cx="12" cy="12" r="8" stroke={color} />
      {/* Core circle + play triangle */}
      <circle cx="12" cy="12" r="7.5" />
      <path d="M 10 9 L 15.5 12 L 10 15 Z" fill={color} stroke="none" />
    </svg>
  );
}

export function IconSubtitles({ color, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <style>{`
        @keyframes iconsubs-sweep {
          0%   { stroke-dashoffset: var(--len); }
          35%  { stroke-dashoffset: 0; }
          70%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: calc(-1 * var(--len)); }
        }
        .iconsubs-line {
          stroke-dasharray: var(--len);
          animation: iconsubs-sweep 3.2s ease-in-out infinite;
        }
        .iconsubs-line-b { animation-delay: .35s; }
        .iconsubs-line-c { animation-delay: .70s; }
      `}</style>
      {/* Caption frame */}
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      {/* Animated caption lines */}
      <path
        className="iconsubs-line"
        style={{ ["--len" as string]: "8" }}
        d="M 6 11 H 14"
      />
      <path
        className="iconsubs-line iconsubs-line-b"
        style={{ ["--len" as string]: "6" }}
        d="M 16 11 H 18"
      />
      <path
        className="iconsubs-line iconsubs-line-c"
        style={{ ["--len" as string]: "10" }}
        d="M 6 14.5 H 18"
      />
    </svg>
  );
}

export function HeroShortcutIcon({
  label,
  color,
  className,
}: {
  label: string;
  color: string;
  className?: string;
}) {
  if (/4K/i.test(label)) return <Icon4K color={color} className={className} />;
  if (/HD/i.test(label)) return <IconHD color={color} className={className} />;
  if (/preview|önizleme|vorschau/i.test(label))
    return <IconPreview color={color} className={className} />;
  return <IconSubtitles color={color} className={className} />;
}
