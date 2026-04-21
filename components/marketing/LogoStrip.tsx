import { useTranslations } from "next-intl";

const companies = [
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
  "Clodron",
];

export function LogoStrip() {
  const t = useTranslations("logoStrip");

  const loop = [...companies, ...companies];

  return (
    <section className="border-b border-border/60 bg-background">
      <div className="px-6 pt-10">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("heading")}
        </p>
      </div>

      <div className="logo-strip-marquee relative mt-8 overflow-hidden pb-10">
        <div className="logo-strip-track flex shrink-0 items-center whitespace-nowrap">
          {loop.map((name, i) => (
            <span
              key={i}
              className="logo-strip-item font-cormorant text-3xl font-medium text-muted-foreground md:text-4xl"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .logo-strip-marquee {
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 8%,
            black 92%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 8%,
            black 92%,
            transparent 100%
          );
        }
        .logo-strip-track {
          width: max-content;
          animation: logo-strip-scroll 38s linear infinite;
        }
        .logo-strip-item {
          padding-right: 4rem;
        }
        @media (min-width: 768px) {
          .logo-strip-item {
            padding-right: 6rem;
          }
        }
        @keyframes logo-strip-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-strip-track { animation: none; }
        }
      `}</style>
    </section>
  );
}
