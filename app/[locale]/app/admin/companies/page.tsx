import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { activateCompany, markLeadContacted } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";

export default async function AdminCorporatePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, leads, companies] = await Promise.all([
    getTranslations("admin"),
    prisma.corporateLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.companyProfile.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { organization: true },
    }),
  ]);
  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-12">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("companies")}</h1>
      </header>

      <section>
        <h2 className="font-display text-2xl">{t("corporateLeads")}</h2>
        <div className="mt-4 rounded-11 border border-border/60 bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("companyName")}</th>
                <th className="px-4 py-3">{t("contact")}</th>
                <th className="px-4 py-3">{t("seats")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("createdAt")}</th>
                <th className="px-4 py-3">{t("colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {leads.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    {t("noLeads")}
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 font-medium">{l.companyName}</td>
                    <td className="px-4 py-3">
                      <p>{l.contactName}</p>
                      <p className="text-xs text-muted-foreground">{l.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.seatTarget ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-11 bg-muted px-2 py-1 text-xs">
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.createdAt.toLocaleDateString(dateLocale)}
                    </td>
                    <td className="px-4 py-3">
                      {l.status === "new" ? (
                        <form action={markLeadContacted}>
                          <input type="hidden" name="id" value={l.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            {t("markContacted")}
                          </Button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">{t("activate")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("activateDescription")}
        </p>
        <form
          action={activateCompany}
          className="mt-6 grid gap-4 rounded-11 border border-border/60 bg-background p-6 md:grid-cols-2"
        >
          <div>
            <Label htmlFor="companyName">{t("companyName")}</Label>
            <Input id="companyName" name="companyName" required />
          </div>
          <div>
            <Label htmlFor="slug">{t("slug")}</Label>
            <Input id="slug" name="slug" placeholder="acme" required />
          </div>
          <div>
            <Label htmlFor="ownerEmail">{t("ownerEmail")}</Label>
            <Input id="ownerEmail" type="email" name="ownerEmail" required />
          </div>
          <div>
            <Label htmlFor="ownerName">{t("ownerName")}</Label>
            <Input id="ownerName" name="ownerName" required />
          </div>
          <div>
            <Label htmlFor="billingEmail">{t("billingEmail")}</Label>
            <Input id="billingEmail" type="email" name="billingEmail" required />
          </div>
          <div>
            <Label htmlFor="seatCount">{t("seats")}</Label>
            <Input
              id="seatCount"
              name="seatCount"
              type="number"
              min={1}
              defaultValue={10}
            />
          </div>
          <div>
            <Label htmlFor="endsAt">{t("endsAt")}</Label>
            <Input id="endsAt" name="endsAt" type="date" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="dark" size="lg">
              {t("activateSubmit")}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-2xl">{t("activeCompanies")}</h2>
        <div className="mt-4 rounded-11 border border-border/60 bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("companyName")}</th>
                <th className="px-4 py-3">{t("seats")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("endsAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {companies.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={4}
                  >
                    —
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.organizationId}>
                    <td className="px-4 py-3 font-medium">
                      {c.organization.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.seatCount}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-11 bg-primary/40 px-2 py-1 text-xs">
                        {c.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.subscriptionEndsAt?.toLocaleDateString(dateLocale) ??
                        "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
