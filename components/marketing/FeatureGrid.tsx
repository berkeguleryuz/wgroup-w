import { useTranslations } from "next-intl";

export function FeatureGrid() {
  const t = useTranslations("features");
  const features = [
    { tag: "01", title: t("f1Title"), body: t("f1Body") },
    { tag: "02", title: t("f2Title"), body: t("f2Body") },
    { tag: "03", title: t("f3Title"), body: t("f3Body") },
  ];

  return (
    <section className="border-b border-border/60 bg-muted/40">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="max-w-2xl">
          <span className="font-accent text-xl text-muted-foreground">
            {t("sectionTag")}
          </span>
          <h2 className="mt-2 text-3xl md:text-5xl font-display">
            {t.rich("heading", {
              em: (chunks) => (
                <em className="not-italic text-muted-foreground">{chunks}</em>
              ),
            })}
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.tag}
              className="rounded-11 border border-border/60 bg-background p-6"
            >
              <span className="font-display text-4xl text-muted-foreground">
                {f.tag}
              </span>
              <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
