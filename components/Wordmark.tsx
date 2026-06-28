import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";

type WordmarkProps = {
  href?: string;
  /** True when sitting on a dark surface — flips the text to the light tone. */
  onDark?: boolean;
  className?: string;
};

/**
 * Shared brand wordmark. Font, weight and size are identical everywhere; the
 * only thing that changes per context is the text color (light on dark
 * surfaces, dark on light ones).
 */
export function Wordmark({
  href = "/",
  onDark = false,
  className = "",
}: WordmarkProps) {
  const t = useTranslations("common");
  return (
    <Link
      href={href}
      className={`font-display text-xl font-semibold tracking-tight md:text-2xl ${
        onDark ? "text-surface-dark-foreground" : "text-foreground"
      } ${className}`}
    >
      {t("appName").toLowerCase()}
    </Link>
  );
}
