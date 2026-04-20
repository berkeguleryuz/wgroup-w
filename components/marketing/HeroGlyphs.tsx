"use client";

type GlyphProps = {
  color: string;
  className?: string;
};

const soft = (c: string, a: number) => `${c}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

export function GlyphS({ color, className }: GlyphProps) {
  const ringStroke = soft(color, 0.35);
  const dimStroke = soft(color, 0.18);
  const gemFill = soft(color, 0.9);

  return (
    <svg
      viewBox="0 0 600 600"
      className={className}
      aria-hidden
      fill="none"
    >
      <style>{`
        @keyframes glyph-s-orbit { to { transform: rotate(360deg); } }
        @keyframes glyph-s-orbit-rev { to { transform: rotate(-360deg); } }
        @keyframes glyph-s-twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50%      { opacity: 1;    transform: scale(1.15); }
        }
        @keyframes glyph-s-rise {
          0%   { transform: translateY(14px); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateY(-18px); opacity: 0; }
        }
        .glyph-s-orbit     { transform-origin: 300px 300px; animation: glyph-s-orbit 42s linear infinite; }
        .glyph-s-orbit-rev { transform-origin: 300px 300px; animation: glyph-s-orbit-rev 60s linear infinite; }
        .glyph-s-gem       { transform-origin: center; transform-box: fill-box; animation: glyph-s-twinkle 2.8s ease-in-out infinite; }
        .glyph-s-gem:nth-child(2) { animation-delay: .4s; }
        .glyph-s-gem:nth-child(3) { animation-delay: .9s; }
        .glyph-s-gem:nth-child(4) { animation-delay: 1.3s; }
        .glyph-s-gem:nth-child(5) { animation-delay: 1.7s; }
        .glyph-s-chev      { transform-origin: center; transform-box: fill-box; animation: glyph-s-rise 3.6s ease-out infinite; }
        .glyph-s-chev-b    { animation-delay: 1.2s; }
        .glyph-s-chev-c    { animation-delay: 2.4s; }
      `}</style>

      <g className="glyph-s-orbit">
        <circle
          cx="300"
          cy="300"
          r="260"
          stroke={ringStroke}
          strokeWidth="1"
          strokeDasharray="2 16"
          strokeLinecap="round"
        />
      </g>
      <g className="glyph-s-orbit-rev">
        <circle
          cx="300"
          cy="300"
          r="218"
          stroke={dimStroke}
          strokeWidth="1"
          strokeDasharray="1 10"
        />
      </g>

      <g transform="translate(300 96)">
        <path
          d="M -70 30 L -54 -18 L -30 16 L 0 -30 L 30 16 L 54 -18 L 70 30 Z"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M -72 36 L 72 36"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle className="glyph-s-gem" cx="-54" cy="-18" r="4" fill={gemFill} />
        <circle className="glyph-s-gem" cx="0"   cy="-30" r="5" fill={gemFill} />
        <circle className="glyph-s-gem" cx="54"  cy="-18" r="4" fill={gemFill} />
        <circle className="glyph-s-gem" cx="-30" cy="16"  r="2.5" fill={gemFill} />
        <circle className="glyph-s-gem" cx="30"  cy="16"  r="2.5" fill={gemFill} />
      </g>

      <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path className="glyph-s-chev"         d="M 70 340 l 20 -16 l 20 16" />
        <path className="glyph-s-chev glyph-s-chev-b" d="M 70 370 l 20 -16 l 20 16" />
        <path className="glyph-s-chev glyph-s-chev-c" d="M 70 400 l 20 -16 l 20 16" />

        <path className="glyph-s-chev glyph-s-chev-c" d="M 490 340 l 20 -16 l 20 16" />
        <path className="glyph-s-chev"         d="M 490 370 l 20 -16 l 20 16" />
        <path className="glyph-s-chev glyph-s-chev-b" d="M 490 400 l 20 -16 l 20 16" />
      </g>

      <g stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75">
        <path d="M 220 504 H 380" />
        <path d="M 200 522 H 400" />
        <path d="M 180 540 H 420" />
      </g>
    </svg>
  );
}

export function GlyphF({ color, className }: GlyphProps) {
  const ringStroke = soft(color, 0.4);
  const dimStroke = soft(color, 0.18);
  const perfFill = soft(color, 0.55);

  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden fill="none">
      <style>{`
        @keyframes glyph-f-reel { to { transform: rotate(360deg); } }
        @keyframes glyph-f-pulse {
          0%, 100% { transform: scale(1);    opacity: 0.35; }
          50%      { transform: scale(1.35); opacity: 0; }
        }
        @keyframes glyph-f-marquee {
          0%, 100% { opacity: 0.2; }
          50%      { opacity: 1; }
        }
        @keyframes glyph-f-scroll { to { transform: translateY(-60px); } }
        .glyph-f-reel   { transform-origin: 300px 300px; animation: glyph-f-reel 18s linear infinite; }
        .glyph-f-pulse-a, .glyph-f-pulse-b, .glyph-f-pulse-c {
          transform-origin: 300px 300px; transform-box: fill-box;
          animation: glyph-f-pulse 2.6s ease-out infinite;
        }
        .glyph-f-pulse-b { animation-delay: .9s; }
        .glyph-f-pulse-c { animation-delay: 1.8s; }
        .glyph-f-mq { animation: glyph-f-marquee 1.6s ease-in-out infinite; }
        .glyph-f-mq:nth-child(2) { animation-delay: .2s; }
        .glyph-f-mq:nth-child(3) { animation-delay: .4s; }
        .glyph-f-mq:nth-child(4) { animation-delay: .6s; }
        .glyph-f-mq:nth-child(5) { animation-delay: .8s; }
        .glyph-f-mq:nth-child(6) { animation-delay: 1.0s; }
        .glyph-f-strip { animation: glyph-f-scroll 4s linear infinite; }
      `}</style>

      <g className="glyph-f-reel">
        <circle cx="300" cy="300" r="240" stroke={ringStroke} strokeWidth="2" />
        <circle cx="300" cy="300" r="210" stroke={dimStroke}  strokeWidth="1" strokeDasharray="4 8" />
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const cx = 300 + Math.cos(a) * 150;
          const cy = 300 + Math.sin(a) * 150;
          return (
            <circle key={i} cx={cx} cy={cy} r="22" stroke={color} strokeWidth="2" fill="none" />
          );
        })}
        <circle cx="300" cy="300" r="30" stroke={color} strokeWidth="2" />
        <circle cx="300" cy="300" r="6"  fill={color} />
      </g>

      <g>
        <circle className="glyph-f-pulse-a" cx="300" cy="300" r="70" stroke={color} strokeWidth="1.5" />
        <circle className="glyph-f-pulse-b" cx="300" cy="300" r="70" stroke={color} strokeWidth="1.5" />
        <circle className="glyph-f-pulse-c" cx="300" cy="300" r="70" stroke={color} strokeWidth="1.5" />
      </g>

      <g>
        <rect x="28" y="0" width="56" height="600" fill={soft(color, 0.05)} stroke={ringStroke} strokeWidth="1" />
        <g className="glyph-f-strip">
          {Array.from({ length: 16 }).map((_, i) => (
            <rect
              key={i}
              x="40"
              y={i * 60 + 12}
              width="32"
              height="20"
              rx="3"
              fill={perfFill}
            />
          ))}
        </g>
      </g>
      <g>
        <rect x="516" y="0" width="56" height="600" fill={soft(color, 0.05)} stroke={ringStroke} strokeWidth="1" />
        <g className="glyph-f-strip">
          {Array.from({ length: 16 }).map((_, i) => (
            <rect
              key={i}
              x="528"
              y={i * 60 + 42}
              width="32"
              height="20"
              rx="3"
              fill={perfFill}
            />
          ))}
        </g>
      </g>

      <g fill={color}>
        {Array.from({ length: 6 }).map((_, i) => (
          <circle
            key={i}
            className="glyph-f-mq"
            cx={180 + i * 48}
            cy="72"
            r="4"
          />
        ))}
      </g>
    </svg>
  );
}

export function GlyphT({ color, className }: GlyphProps) {
  const faint = soft(color, 0.18);
  const mid = soft(color, 0.45);

  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden fill="none">
      <style>{`
        @keyframes glyph-t-beam {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 0.55; }
        }
        @keyframes glyph-t-float {
          0%   { transform: translateY(0)    scale(1);   opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateY(-80px) scale(0.6); opacity: 0; }
        }
        @keyframes glyph-t-grow {
          0%, 100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1); }
        }
        @keyframes glyph-t-spin { to { transform: rotate(360deg); } }
        .glyph-t-beam  { animation: glyph-t-beam 4s ease-in-out infinite; transform-origin: 300px 110px; }
        .glyph-t-spark { transform-origin: center; transform-box: fill-box; animation: glyph-t-float 4.2s ease-out infinite; }
        .glyph-t-spark:nth-child(2) { animation-delay: .6s; }
        .glyph-t-spark:nth-child(3) { animation-delay: 1.2s; }
        .glyph-t-spark:nth-child(4) { animation-delay: 1.8s; }
        .glyph-t-spark:nth-child(5) { animation-delay: 2.4s; }
        .glyph-t-spark:nth-child(6) { animation-delay: 3.0s; }
        .glyph-t-bar   { transform-origin: bottom; transform-box: fill-box; animation: glyph-t-grow 3.2s ease-in-out infinite; }
        .glyph-t-bar-b { animation-delay: .4s; }
        .glyph-t-bar-c { animation-delay: .8s; }
        .glyph-t-bar-d { animation-delay: 1.2s; }
        .glyph-t-ring  { transform-origin: 300px 300px; animation: glyph-t-spin 50s linear infinite; }
      `}</style>

      <g className="glyph-t-ring">
        <circle cx="300" cy="300" r="240" stroke={faint} strokeWidth="1" strokeDasharray="2 14" />
      </g>

      <defs>
        <linearGradient id="glyph-t-beam-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="glyph-t-beam"
        d="M 300 110 L 470 540 L 130 540 Z"
        fill="url(#glyph-t-beam-grad)"
      />
      <circle cx="300" cy="110" r="10" fill={color} />
      <circle cx="300" cy="110" r="22" stroke={mid} strokeWidth="1.5" />

      <g fill={color}>
        {[
          { x: 250, y: 470 },
          { x: 330, y: 500 },
          { x: 290, y: 430 },
          { x: 360, y: 450 },
          { x: 230, y: 490 },
          { x: 310, y: 460 },
        ].map((p, i) => (
          <path
            key={i}
            className="glyph-t-spark"
            transform={`translate(${p.x} ${p.y})`}
            d="M 0 -8 L 2 -2 L 8 0 L 2 2 L 0 8 L -2 2 L -8 0 L -2 -2 Z"
          />
        ))}
      </g>

      <g fill={color}>
        <rect className="glyph-t-bar"        x="120" y="480" width="22" height="70"  rx="3" />
        <rect className="glyph-t-bar glyph-t-bar-b" x="160" y="460" width="22" height="90"  rx="3" />
        <rect className="glyph-t-bar glyph-t-bar-c" x="420" y="440" width="22" height="110" rx="3" />
        <rect className="glyph-t-bar glyph-t-bar-d" x="460" y="420" width="22" height="130" rx="3" />
      </g>

      <g stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <path d="M 150 300 q 20 -30 0 -60" />
        <path d="M 150 340 q 20 -30 0 -60" />
        <path d="M 150 380 q 20 -30 0 -60" />
        <path d="M 450 300 q -20 -30 0 -60" />
        <path d="M 450 340 q -20 -30 0 -60" />
        <path d="M 450 380 q -20 -30 0 -60" />
      </g>
    </svg>
  );
}

export function HeroGlyph({
  mark,
  color,
  className,
}: {
  mark: string;
  color: string;
  className?: string;
}) {
  if (mark === "S") return <GlyphS color={color} className={className} />;
  if (mark === "F") return <GlyphF color={color} className={className} />;
  if (mark === "T") return <GlyphT color={color} className={className} />;
  return null;
}

function IconS({ color, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none">
      <style>{`
        @keyframes icon-s-twinkle { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
        @keyframes icon-s-rise {
          0%   { transform: translateY(3px); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateY(-4px); opacity: 0; }
        }
        .icon-s-gem  { transform-origin: center; transform-box: fill-box; animation: icon-s-twinkle 2s ease-in-out infinite; }
        .icon-s-gem:nth-child(2) { animation-delay: .3s; }
        .icon-s-gem:nth-child(3) { animation-delay: .6s; }
        .icon-s-chev { transform-origin: center; transform-box: fill-box; animation: icon-s-rise 2.4s ease-out infinite; }
      `}</style>
      <path
        d="M 10 16 L 13 9 L 17 14 L 20 7 L 23 14 L 27 9 L 30 16 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M 10 18 L 30 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle className="icon-s-gem" cx="13" cy="9"  r="1.3" fill={color} />
      <circle className="icon-s-gem" cx="20" cy="7"  r="1.5" fill={color} />
      <circle className="icon-s-gem" cx="27" cy="9"  r="1.3" fill={color} />
      <path
        className="icon-s-chev"
        d="M 14 28 L 20 24 L 26 28"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 13 34 H 27" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function IconF({ color, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none">
      <style>{`
        @keyframes icon-f-spin { to { transform: rotate(360deg); } }
        @keyframes icon-f-pulse { 0%,100% { opacity: .3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
        .icon-f-reel  { transform-origin: 20px 20px; animation: icon-f-spin 12s linear infinite; }
        .icon-f-play  { transform-origin: center; transform-box: fill-box; animation: icon-f-pulse 1.8s ease-in-out infinite; }
      `}</style>
      <g className="icon-f-reel">
        <circle cx="20" cy="20" r="14" stroke={color} strokeWidth="1.5" />
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const cx = 20 + Math.cos(a) * 8;
          const cy = 20 + Math.sin(a) * 8;
          return (
            <circle key={i} cx={cx} cy={cy} r="1.8" stroke={color} strokeWidth="1.2" />
          );
        })}
        <circle cx="20" cy="20" r="1.6" fill={color} />
      </g>
      <circle
        className="icon-f-play"
        cx="20"
        cy="20"
        r="17"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
}

function IconT({ color, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none">
      <style>{`
        @keyframes icon-t-beam { 0%,100% { opacity: .3; } 50% { opacity: .75; } }
        @keyframes icon-t-float {
          0%   { transform: translateY(2px) scale(1);   opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateY(-10px) scale(.5); opacity: 0; }
        }
        .icon-t-beam  { animation: icon-t-beam 2.4s ease-in-out infinite; }
        .icon-t-spark { transform-origin: center; transform-box: fill-box; animation: icon-t-float 2.2s ease-out infinite; }
        .icon-t-spark:nth-child(2) { animation-delay: .5s; }
        .icon-t-spark:nth-child(3) { animation-delay: 1.0s; }
      `}</style>
      <defs>
        <linearGradient id="icon-t-beam-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="icon-t-beam"
        d="M 20 8 L 32 34 L 8 34 Z"
        fill="url(#icon-t-beam-grad)"
      />
      <circle cx="20" cy="8" r="2" fill={color} />
      <g fill={color}>
        <path className="icon-t-spark" transform="translate(20 28)" d="M 0 -3 L 1 -1 L 3 0 L 1 1 L 0 3 L -1 1 L -3 0 L -1 -1 Z" />
        <path className="icon-t-spark" transform="translate(16 30)" d="M 0 -2 L 1 0 L 0 2 L -1 0 Z" />
        <path className="icon-t-spark" transform="translate(24 30)" d="M 0 -2 L 1 0 L 0 2 L -1 0 Z" />
      </g>
    </svg>
  );
}

export function HeroGlyphIcon({
  mark,
  color,
  className,
}: {
  mark: string;
  color: string;
  className?: string;
}) {
  if (mark === "S") return <IconS color={color} className={className} />;
  if (mark === "F") return <IconF color={color} className={className} />;
  if (mark === "T") return <IconT color={color} className={className} />;
  return null;
}
