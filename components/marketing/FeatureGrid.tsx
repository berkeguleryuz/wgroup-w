import { useTranslations } from "next-intl";

type CardTheme = {
  bg: string;
  text: string;
  accent: string;
  soft: string;
};

const CARD_THEMES: CardTheme[] = [
  {
    bg: "linear-gradient(160deg, #d4f1f4 0%, #e8f9fb 55%, #d4f1f4 100%)",
    text: "#0d3b44",
    accent: "#1aa3b5",
    soft: "#7dd3dd",
  },
  {
    bg: "linear-gradient(160deg, #dcf2dc 0%, #edf9ed 55%, #dcf2dc 100%)",
    text: "#14401f",
    accent: "#2f8f4f",
    soft: "#8fd6a6",
  },
  {
    bg: "linear-gradient(160deg, #dcd9f5 0%, #edeafa 55%, #dcd9f5 100%)",
    text: "#271f5a",
    accent: "#5a47c9",
    soft: "#a89bf0",
  },
  {
    bg: "linear-gradient(160deg, #f7d9ea 0%, #fbe9f2 55%, #f7d9ea 100%)",
    text: "#5e1737",
    accent: "#c24c87",
    soft: "#eaa8c9",
  },
];

export function FeatureGrid() {
  const t = useTranslations("features");
  const cards = [
    {
      title: t("f1Title"),
      body: t("f1Body"),
      theme: CARD_THEMES[0],
      Art: ArtLibrary,
    },
    {
      title: t("f2Title"),
      body: t("f2Body"),
      theme: CARD_THEMES[1],
      Art: ArtDepth,
    },
    {
      title: t("f3Title"),
      body: t("f3Body"),
      theme: CARD_THEMES[2],
      Art: ArtDevices,
    },
    {
      title: t("f4Title"),
      body: t("f4Body"),
      theme: CARD_THEMES[3],
      Art: ArtTeam,
    },
  ];

  return (
    <section className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-[1800px] px-6 py-20 md:px-10 md:py-24 xl:px-16">
        <div className="max-w-2xl">
          <span className="font-accent text-xl text-muted-foreground">
            {t("sectionTag")}
          </span>
          <h2 className="mt-2 font-display text-3xl md:text-5xl">
            {t.rich("heading", {
              em: (chunks) => (
                <em className="not-italic text-muted-foreground">{chunks}</em>
              ),
            })}
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <article
              key={i}
              className="feature-card group relative flex min-h-[400px] flex-col overflow-hidden rounded-[20px] p-7 md:min-h-[500px] md:p-8"
              style={{
                background: c.theme.bg,
                color: c.theme.text,
              }}
            >
              <div className="feature-card-heading">
                <h3 className="font-display text-2xl font-semibold leading-tight md:text-[28px]">
                  {c.title}
                </h3>
              </div>
              <p
                className="feature-card-body mt-3 text-sm leading-relaxed opacity-80 md:text-[15px]"
                style={{ color: c.theme.text }}
              >
                {c.body}
              </p>

              <div className="relative mt-auto h-[220px] pt-6 md:h-[260px]">
                <c.Art accent={c.theme.accent} soft={c.theme.soft} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .feature-card {
          transition: transform 400ms cubic-bezier(.2,.8,.2,1), box-shadow 400ms ease;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 30px 60px -30px rgba(16, 13, 8, 0.25);
        }
        .feature-card-heading { min-height: 5rem; }
        .feature-card-body    { min-height: 4.75rem; }
        @media (min-width: 768px) {
          .feature-card-heading { min-height: 6.25rem; }
          .feature-card-body    { min-height: 5.25rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .feature-card { transition: none; }
          .feature-card:hover { transform: none; }
        }
      `}</style>
    </section>
  );
}

type ArtProps = { accent: string; soft: string };

function ArtLibrary({ accent, soft }: ArtProps) {
  return (
    <svg
      viewBox="0 0 320 220"
      className="h-full w-full"
      aria-hidden
      fill="none"
    >
      <style>{`
        @keyframes art-lib-slide {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-72px); }
        }
        @keyframes art-lib-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.04); }
        }
        .art-lib-row    { animation: art-lib-slide 8s linear infinite; }
        .art-lib-row-b  { animation: art-lib-slide 11s linear infinite reverse; }
        .art-lib-badge  { transform-origin: center; transform-box: fill-box; animation: art-lib-pulse 2.2s ease-in-out infinite; }
      `}</style>
      <rect
        x="18"
        y="12"
        width="284"
        height="176"
        rx="14"
        fill="#fff"
        opacity="0.55"
      />
      <rect
        x="18"
        y="12"
        width="284"
        height="176"
        rx="14"
        stroke={accent}
        strokeWidth="1.4"
        opacity="0.4"
      />
      <g clipPath="url(#art-lib-clip)">
        <g className="art-lib-row">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={i}
              x={30 + i * 72}
              y="32"
              width="58"
              height="62"
              rx="8"
              fill={soft}
              opacity="0.85"
            />
          ))}
        </g>
        <g className="art-lib-row-b">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={i}
              x={-10 + i * 72}
              y="106"
              width="58"
              height="62"
              rx="8"
              fill={accent}
              opacity="0.55"
            />
          ))}
        </g>
      </g>
      <g className="art-lib-badge">
        <rect x="124" y="72" width="72" height="76" rx="10" fill="#fff" />
        <path d="M 152 96 L 172 110 L 152 124 Z" fill={accent} />
      </g>
      <defs>
        <clipPath id="art-lib-clip">
          <rect x="18" y="12" width="284" height="176" rx="14" />
        </clipPath>
      </defs>
    </svg>
  );
}

function ArtDepth({ accent, soft }: ArtProps) {
  return (
    <svg
      viewBox="0 0 320 220"
      className="h-full w-full"
      aria-hidden
      fill="none"
    >
      <style>{`
        @keyframes art-depth-progress {
          0%   { width: 0%; }
          70%  { width: 100%; }
          100% { width: 100%; }
        }
        @keyframes art-depth-tick {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
        .art-depth-bar  { animation: art-depth-progress 4s ease-in-out infinite; }
        .art-depth-tick { transform-origin: center; transform-box: fill-box; animation: art-depth-tick 2s ease-in-out infinite; }
        .art-depth-tick:nth-child(2) { animation-delay: .2s; }
        .art-depth-tick:nth-child(3) { animation-delay: .4s; }
        .art-depth-tick:nth-child(4) { animation-delay: .6s; }
      `}</style>
      <rect
        x="20"
        y="14"
        width="280"
        height="192"
        rx="16"
        fill="#fff"
        opacity="0.7"
      />
      <rect
        x="20"
        y="14"
        width="280"
        height="192"
        rx="16"
        stroke={accent}
        strokeWidth="1.4"
        opacity="0.4"
      />
      <rect x="36" y="30" width="96" height="72" rx="10" fill={soft} />
      <circle cx="84" cy="66" r="16" fill="#fff" opacity="0.9" />
      <path d="M 79 58 L 92 66 L 79 74 Z" fill={accent} />
      <rect
        x="148"
        y="40"
        width="132"
        height="8"
        rx="4"
        fill={accent}
        opacity="0.55"
      />
      <rect
        x="148"
        y="56"
        width="96"
        height="6"
        rx="3"
        fill={accent}
        opacity="0.3"
      />
      <rect
        x="148"
        y="72"
        width="110"
        height="6"
        rx="3"
        fill={accent}
        opacity="0.3"
      />
      <rect
        x="36"
        y="120"
        width="248"
        height="10"
        rx="5"
        fill={soft}
        opacity="0.6"
      />
      <g clipPath="url(#art-depth-bar-clip)">
        <rect
          className="art-depth-bar"
          x="36"
          y="120"
          width="248"
          height="10"
          rx="5"
          fill={accent}
        />
      </g>
      <defs>
        <clipPath id="art-depth-bar-clip">
          <rect x="36" y="120" width="248" height="10" rx="5" />
        </clipPath>
      </defs>
      <g fill={accent}>
        <circle className="art-depth-tick" cx="60" cy="162" r="4" />
        <circle className="art-depth-tick" cx="130" cy="162" r="4" />
        <circle className="art-depth-tick" cx="200" cy="162" r="4" />
        <circle className="art-depth-tick" cx="270" cy="162" r="4" />
      </g>
      <path
        d="M 60 162 H 270"
        stroke={accent}
        strokeWidth="1.2"
        opacity="0.3"
      />
      <rect
        x="36"
        y="184"
        width="120"
        height="6"
        rx="3"
        fill={accent}
        opacity="0.35"
      />
    </svg>
  );
}

function ArtDevices({ accent, soft }: ArtProps) {
  return (
    <svg
      viewBox="0 -50 240 260"
      className="h-full w-full"
      aria-hidden
      fill="none"
    >
      <style>{`
        @keyframes art-dev-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes art-dev-sync {
          0%   { transform: translateX(-10px); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateX(28px); opacity: 0; }
        }
        .art-dev-laptop { animation: art-dev-float 4.5s ease-in-out infinite; }
        .art-dev-phone  { animation: art-dev-float 4.5s ease-in-out infinite 1s; }
        .art-dev-sync-dot {
          transform-origin: center; transform-box: fill-box;
          animation: art-dev-sync 2.4s ease-in-out infinite;
        }
        .art-dev-sync-dot-b { animation-delay: .7s; }
        .art-dev-sync-dot-c { animation-delay: 1.4s; }
      `}</style>
      <g className="art-dev-laptop">
        <rect x="36" y="52" width="180" height="118" rx="10" fill="#fff" />
        <rect
          x="36"
          y="52"
          width="180"
          height="118"
          rx="10"
          stroke={accent}
          strokeWidth="1.4"
          opacity="0.45"
        />
        <rect
          x="48"
          y="64"
          width="156"
          height="86"
          rx="6"
          fill={soft}
          opacity="0.7"
        />
        <circle cx="126" cy="107" r="16" fill="#fff" />
        <path d="M 121 99 L 134 107 L 121 115 Z" fill={accent} />
        <rect
          x="20"
          y="168"
          width="212"
          height="6"
          rx="3"
          fill={accent}
          opacity="0.35"
        />
      </g>
      <g className="art-dev-phone" transform="translate(234 58)">
        <rect x="0" y="0" width="62" height="112" rx="10" fill="#fff" />
        <rect
          x="0"
          y="0"
          width="62"
          height="112"
          rx="10"
          stroke={accent}
          strokeWidth="1.4"
          opacity="0.45"
        />
        <rect
          x="6"
          y="10"
          width="50"
          height="74"
          rx="4"
          fill={soft}
          opacity="0.8"
        />
        <circle cx="31" cy="47" r="10" fill="#fff" />
        <path d="M 28 42 L 35 47 L 28 52 Z" fill={accent} />
        <rect
          x="18"
          y="94"
          width="26"
          height="3"
          rx="1.5"
          fill={accent}
          opacity="0.4"
        />
      </g>
      <g fill={accent}>
        <circle className="art-dev-sync-dot" cx="218" cy="108" r="3" />
        <circle
          className="art-dev-sync-dot art-dev-sync-dot-b"
          cx="218"
          cy="108"
          r="3"
        />
        <circle
          className="art-dev-sync-dot art-dev-sync-dot-c"
          cx="218"
          cy="108"
          r="3"
        />
      </g>
    </svg>
  );
}

function ArtTeam({ accent, soft }: ArtProps) {
  const members = [
    { x: 34, y: 26, delay: 0.0 },
    { x: 210, y: 20, delay: 0.4 },
    { x: 24, y: 104, delay: 0.8 },
    { x: 218, y: 104, delay: 1.2 },
    { x: 128, y: 174, delay: 1.6 },
  ];
  return (
    <svg
      viewBox="0 -20 300 220"
      className="h-full w-full"
      aria-hidden
      fill="none"
    >
      <style>{`
        @keyframes art-team-arrive {
          0%   { opacity: 0; transform: translateY(6px) scale(0.92); }
          35%  { opacity: 1; transform: translateY(0)   scale(1); }
          85%  { opacity: 1; transform: translateY(0)   scale(1); }
          100% { opacity: 0; transform: translateY(-4px) scale(0.96); }
        }
        @keyframes art-team-presence {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes art-team-beam {
          0%   { stroke-dashoffset: 40; opacity: 0; }
          30%  { opacity: 0.8; }
          100% { stroke-dashoffset: 0;  opacity: 0; }
        }
        @keyframes art-team-hub-glow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%      { opacity: 0.6;  transform: scale(1.05); }
        }
        @keyframes art-team-counter {
          0%, 100% { opacity: 0.9; }
          50%      { opacity: 1; }
        }
        .art-team-member   { transform-origin: center; transform-box: fill-box; animation: art-team-arrive 5s ease-in-out infinite; }
        .art-team-status   { transform-origin: center; transform-box: fill-box; animation: art-team-presence 1.8s ease-in-out infinite; }
        .art-team-status-b { animation-delay: .3s; }
        .art-team-status-c { animation-delay: .6s; }
        .art-team-status-d { animation-delay: .9s; }
        .art-team-status-e { animation-delay: 1.2s; }
        .art-team-beam     { stroke-dasharray: 40; animation: art-team-beam 5s ease-in-out infinite; }
        .art-team-hub-ring { transform-origin: 160px 110px; animation: art-team-hub-glow 3.2s ease-in-out infinite; }
        .art-team-count-bar{ transform-box: fill-box; transform-origin: left center; animation: art-team-counter 2.4s ease-in-out infinite; }
      `}</style>

      <circle
        className="art-team-hub-ring"
        cx="160"
        cy="110"
        r="58"
        stroke={accent}
        strokeWidth="1.4"
        strokeDasharray="2 6"
      />

      <g stroke={accent} strokeWidth="1.2" fill="none">
        <path
          className="art-team-beam"
          d="M 160 110 L 60  46"
          style={{ animationDelay: "0s" }}
        />
        <path
          className="art-team-beam art-team-status-b"
          d="M 160 110 L 236 40"
          style={{ animationDelay: ".4s" }}
        />
        <path
          className="art-team-beam art-team-status-c"
          d="M 160 110 L 50  124"
          style={{ animationDelay: ".8s" }}
        />
        <path
          className="art-team-beam art-team-status-d"
          d="M 160 110 L 244 124"
          style={{ animationDelay: "1.2s" }}
        />
        <path
          className="art-team-beam art-team-status-e"
          d="M 160 110 L 154 194"
          style={{ animationDelay: "1.6s" }}
        />
      </g>

      <g>
        <rect x="128" y="82" width="64" height="56" rx="10" fill="#fff" />
        <rect
          x="128"
          y="82"
          width="64"
          height="56"
          rx="10"
          stroke={accent}
          strokeWidth="1.4"
          opacity="0.55"
        />
        <rect
          x="136"
          y="90"
          width="32"
          height="4"
          rx="2"
          fill={accent}
          opacity="0.7"
        />
        <rect
          x="136"
          y="98"
          width="20"
          height="3"
          rx="1.5"
          fill={accent}
          opacity="0.35"
        />
        <rect
          x="136"
          y="108"
          width="48"
          height="3.5"
          rx="1.75"
          fill={soft}
          opacity="0.8"
        />
        <rect
          className="art-team-count-bar"
          x="136"
          y="108"
          width="34"
          height="3.5"
          rx="1.75"
          fill={accent}
        />
        <rect
          x="136"
          y="116"
          width="48"
          height="3.5"
          rx="1.75"
          fill={soft}
          opacity="0.6"
        />
        <rect
          className="art-team-count-bar"
          x="136"
          y="116"
          width="22"
          height="3.5"
          rx="1.75"
          fill={accent}
          style={{ animationDelay: ".6s" }}
        />
        <circle cx="188" cy="87" r="3" fill={accent} />
      </g>

      {members.map((m, i) => (
        <g
          key={i}
          className="art-team-member"
          style={{ animationDelay: `${m.delay}s` }}
          transform={`translate(${m.x} ${m.y})`}
        >
          <rect
            x="0"
            y="0"
            width="72"
            height="32"
            rx="9"
            fill="#fff"
            opacity="0.9"
          />
          <rect
            x="0"
            y="0"
            width="72"
            height="32"
            rx="9"
            stroke={accent}
            strokeWidth="1"
            opacity="0.4"
          />
          <circle cx="14" cy="16" r="9" fill={i % 2 === 0 ? accent : soft} />
          <circle cx="14" cy="13.5" r="3" fill="#fff" opacity="0.9" />
          <path d="M 9 21 Q 14 17 19 21" fill="#fff" opacity="0.9" />
          <rect
            x="28"
            y="11"
            width="34"
            height="3.5"
            rx="1.75"
            fill={accent}
            opacity="0.7"
          />
          <rect
            x="28"
            y="18"
            width="22"
            height="2.5"
            rx="1.25"
            fill={accent}
            opacity="0.35"
          />
          <circle
            className={`art-team-status${i > 0 ? ` art-team-status-${"bcde"[i - 1]}` : ""}`}
            cx="65"
            cy="8"
            r="2.5"
            fill={accent}
          />
        </g>
      ))}
    </svg>
  );
}
