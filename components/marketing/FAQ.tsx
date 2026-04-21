import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";

export function FAQ() {
  const t = useTranslations("faq");
  const items = [1, 2, 3, 4, 5].map((n) => ({
    q: t(`q${n}` as const),
    a: t(`a${n}` as const),
  }));

  return (
    <section id="faq" className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28 xl:px-16">
        <div className="grid gap-14 md:grid-cols-[0.85fr_1.15fr] md:gap-20">
          <aside className="md:sticky md:top-28 md:self-start">
            <span className="block font-accent text-xl text-muted-foreground">
              {t("sectionTag")}
            </span>
            <h2 className="mt-3 font-display text-4xl leading-[1.05] md:text-6xl">
              {t("heading")}
            </h2>
            <p className="mt-5 max-w-sm text-sm text-muted-foreground md:text-base">
              {t("helperText")}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/business"
                className="group inline-flex items-center justify-between gap-4 rounded-11 border border-foreground/15 bg-background px-5 py-4 text-sm transition-colors hover:border-foreground/40 hover:bg-muted"
              >
                <span className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-11 bg-surface-dark text-surface-dark-foreground">
                    <MailIcon />
                  </span>
                  <span>
                    <span className="block font-medium">
                      {t("contactTitle")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t("contactSubtitle")}
                    </span>
                  </span>
                </span>
                <ArrowIcon />
              </Link>
            </div>
          </aside>

          <div>
            <ol className="divide-y divide-foreground/10 border-y border-foreground/10">
              {items.map((it, i) => (
                <li key={it.q}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-5 py-6 outline-none transition-colors hover:text-foreground md:py-8">
                      <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground md:text-sm">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-lg font-medium leading-snug md:text-2xl">
                        {it.q}
                      </span>
                      <span
                        aria-hidden
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-11 border border-foreground/15 bg-background transition-colors group-hover:border-foreground/40 group-open:border-foreground group-open:bg-foreground group-open:text-background"
                      >
                        <span className="absolute h-[1.5px] w-4 bg-current" />
                        <span className="absolute h-4 w-[1.5px] bg-current transition-transform duration-300 group-open:rotate-90 group-open:scale-0" />
                      </span>
                    </summary>
                    <div className="grid grid-cols-[auto_1fr] gap-5 pb-8 pr-14 md:pb-10">
                      <span aria-hidden className="w-[1ch]" />
                      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                        {it.a}
                      </p>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 10 H16" />
        <path d="M12 5 L17 10 L12 15" />
      </svg>
    </span>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="14" height="11" rx="2" />
      <path d="M3.5 6 L10 11 L16.5 6" />
    </svg>
  );
}
