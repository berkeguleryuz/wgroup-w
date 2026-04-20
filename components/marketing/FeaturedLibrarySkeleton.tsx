import { useTranslations } from "next-intl";

export function FeaturedLibrarySkeleton() {
  const t = useTranslations("featuredLibrary");
  return (
    <section id="library" className="border-b border-border/60 bg-muted/40">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div>
          <span className="font-accent text-xl text-muted-foreground">
            {t("sectionTag")}
          </span>
          <h2 className="mt-2 text-3xl md:text-5xl font-display">
            {t("heading")}
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] rounded-11 border border-border/60 bg-background animate-pulse"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
