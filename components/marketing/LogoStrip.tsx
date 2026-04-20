import { useTranslations } from "next-intl";

const companies = [
  "Acme",
  "Northwind",
  "Globex",
  "Initech",
  "Umbrella",
  "Hooli",
  "Stark",
];

export function LogoStrip() {
  const t = useTranslations("logoStrip");
  return (
    <section className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("heading")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
          {companies.map((name) => (
            <span
              key={name}
              className="font-display text-xl md:text-2xl text-muted-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
