import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-display text-6xl text-muted-foreground">404</p>
      <h1 className="font-display text-3xl md:text-4xl">{t("notFoundTitle")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("notFoundBody")}
      </p>
      <Link href="/">
        <Button variant="shine">{t("backHome")}</Button>
      </Link>
    </div>
  );
}
