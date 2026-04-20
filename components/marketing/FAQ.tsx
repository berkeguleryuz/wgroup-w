import { useTranslations } from "next-intl";

export function FAQ() {
  const t = useTranslations("faq");
  const items = [1, 2, 3, 4, 5, 6].map((n) => ({
    q: t(`q${n}` as const),
    a: t(`a${n}` as const),
  }));

  return (
    <section id="faq" className="border-b border-border/60">
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-24">
        <span className="font-accent text-xl text-muted-foreground">
          {t("sectionTag")}
        </span>
        <h2 className="mt-2 text-3xl md:text-5xl font-display">
          {t("heading")}
        </h2>
        <div className="mt-10 divide-y divide-border/70 rounded-11 border border-border/60 bg-background">
          {items.map((it) => (
            <details key={it.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                <span className="text-base md:text-lg font-medium">{it.q}</span>
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-11 bg-muted text-foreground transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
