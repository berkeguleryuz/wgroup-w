import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { requireOrgOwner } from "@/lib/corporate";
import { inviteSingle, inviteBulk } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";

export default async function CorporateInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ sent?: string; err?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOrgOwner();
  const t = await getTranslations("organization");
  const sp = searchParams ? await searchParams : undefined;

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("inviteHeading")}</h1>
      </header>

      {sp?.sent ? (
        <div className="rounded-11 border border-primary bg-primary/40 px-4 py-3 text-sm">
          <p>{t("sentBanner", { count: sp.sent })}</p>
          <p className="mt-1 text-muted-foreground">
            {t("inviteLinkHint")}{" "}
            <Link
              href="/app/organization/members"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t("members")}
            </Link>
          </p>
        </div>
      ) : null}
      {sp?.err ? (
        <p className="rounded-11 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.err}
        </p>
      ) : null}

      <section className="grid items-stretch gap-6 md:grid-cols-2">
        <form
          action={inviteSingle}
          className="flex flex-col rounded-11 border border-border/60 bg-background p-6"
        >
          <h2 className="font-display text-2xl">{t("single")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("singleBody")}
          </p>
          <div className="mt-5">
            <Label htmlFor="email">{t("colEmail")}</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="name@company.com"
              required
            />
          </div>
          <div className="mt-auto pt-5">
            <Button type="submit" variant="dark" className="w-full">
              {t("sendInvite")}
            </Button>
          </div>
        </form>

        <form
          action={inviteBulk}
          className="flex flex-col rounded-11 border border-border/60 bg-background p-6"
        >
          <h2 className="font-display text-2xl">{t("bulk")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("bulkBody")}</p>
          <Textarea
            name="emails"
            rows={5}
            className="mt-5 flex-1"
            placeholder="name@company.com&#10;colleague@company.com"
            required
          />
          <Button type="submit" variant="dark" className="mt-5 w-full">
            {t("sendAll")}
          </Button>
        </form>
      </section>
    </div>
  );
}
