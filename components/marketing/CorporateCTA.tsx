import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";

export function CorporateCTA() {
  const t = useTranslations("corporateCTA");

  const features = [
    { title: t("feature1Title"), body: t("feature1Body") },
    { title: t("feature2Title"), body: t("feature2Body") },
    { title: t("feature3Title"), body: t("feature3Body") },
    { title: t("feature4Title"), body: t("feature4Body") },
  ];

  return (
    <section className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32 xl:px-16">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-5">
          <span className="font-accent text-xl text-muted-foreground">
            {t("sectionTag")}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {t("tagline")}
          </span>
        </div>

        <div className="mt-14 grid gap-x-12 gap-y-12 md:grid-cols-12 md:gap-y-10">
          <div className="md:col-span-8">
            <h2 className="font-display text-4xl leading-[1.02] tracking-[-0.02em] md:text-7xl">
              {t("headingLine1")}
              <br />
              <span className="text-muted-foreground">
                {t("headingLine2")}
              </span>
            </h2>
          </div>

          <div className="flex flex-col justify-end md:col-span-4">
            <p className="max-w-md text-sm text-muted-foreground md:text-base">
              {t("description")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/business">
                <Button size="lg" variant="dark" className="group">
                  {t("ctaPrimary")}
                  <ArrowIcon />
                </Button>
              </Link>
              <Link
                href="/business#how-it-works"
                className="group inline-flex items-center gap-2 text-sm underline-offset-[6px] transition hover:underline"
              >
                {t("ctaSecondary")}
                <ArrowIcon small />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-20 grid gap-px overflow-hidden rounded-11 border border-border bg-border md:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="flex flex-col bg-muted/60 p-7 transition-colors hover:bg-muted md:p-8"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-8 font-display text-xl leading-snug md:text-2xl">
                {f.title}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground md:text-[15px]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrowIcon({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-flex transition-transform duration-200 group-hover:translate-x-0.5"
    >
      <svg
        viewBox="0 0 20 20"
        className={small ? "h-3.5 w-3.5" : "h-4 w-4"}
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
