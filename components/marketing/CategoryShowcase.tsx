import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";

export function CategoryShowcase() {
  const t = useTranslations("categories");

  // Card surfaces invert with the theme: the dark cards turn gold in dark
  // mode and the gold card turns dark, so all three keep contrast against
  // the page background.
  const darkCard =
    "[background:linear-gradient(135deg,#100D08,#3a2e1f)] text-surface-dark-foreground dark:[background:linear-gradient(135deg,#edddb9,#c9a86a)] dark:text-[#100D08]";
  const goldCard =
    "[background:linear-gradient(135deg,#edddb9,#c9a86a)] text-[#100D08] dark:[background:linear-gradient(135deg,#100D08,#3a2e1f)] dark:text-surface-dark-foreground";

  const categories = [
    {
      title: t("seriesTitle"),
      tag: t("seriesTag"),
      body: t("seriesBody"),
      count: t("seriesCount"),
      surface: darkCard,
    },
    {
      title: t("filmsTitle"),
      tag: t("filmsTag"),
      body: t("filmsBody"),
      count: t("filmsCount"),
      surface: goldCard,
    },
    {
      title: t("talentTitle"),
      tag: t("talentTag"),
      body: t("talentBody"),
      count: t("talentCount"),
      surface:
        "[background:linear-gradient(135deg,#2b2016,#5b4630)] text-surface-dark-foreground dark:[background:linear-gradient(135deg,#e6d3a8,#b8945a)] dark:text-[#100D08]",
    },
  ];

  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <span className="font-accent text-xl text-muted-foreground">
              {t("sectionTag")}
            </span>
            <h2 className="mt-2 text-3xl md:text-5xl font-display">
              {t("heading")}
            </h2>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.title}
              className={`rounded-11 border border-border/60 overflow-hidden ${c.surface}`}
            >
              <div className="aspect-[4/5] p-8 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center rounded-11 border border-current/20 px-2.5 py-1 text-xs font-medium opacity-90">
                    {c.tag}
                  </div>
                  <h3 className="mt-5 font-display text-4xl md:text-5xl leading-none">
                    {c.title}
                  </h3>
                  <p className="mt-4 text-sm opacity-85 max-w-xs">{c.body}</p>
                </div>
                <div className="flex items-center justify-between text-xs opacity-80">
                  <span>{c.count}</span>
                  <Link
                    href="/register"
                    className="underline-offset-4 hover:underline"
                  >
                    {t("startWatching")}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
