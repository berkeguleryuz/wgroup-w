import { getTranslations, setRequestLocale } from "next-intl/server";
import type Stripe from "stripe";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import {
  stripe,
  STRIPE_AUTOMATIC_TAX,
  STRIPE_BANK_TRANSFER,
  STRIPE_PRICE_CORP_SMALL,
  STRIPE_PRICE_CORP_LARGE,
} from "@/lib/stripe";
import { createCompanyInvoice } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default async function AdminBillingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, companies] = await Promise.all([
    getTranslations("admin"),
    prisma.companyProfile.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { organization: { select: { name: true, slug: true } } },
    }),
  ]);
  const dateLocale =
    locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  // Recent Stripe invoices, mapped back to companies via stripeCustomerId.
  let invoices: Stripe.Invoice[] = [];
  if (stripe) {
    try {
      invoices = (await stripe.invoices.list({ limit: 30 })).data;
    } catch {
      // Surfaced via the infra card (key invalid / network) — page still renders.
    }
  }
  const companyByCustomer = new Map(
    companies
      .filter((c) => c.stripeCustomerId)
      .map((c) => [c.stripeCustomerId as string, c.organization.name]),
  );

  const infra = [
    { label: t("billingInfraStripeKey"), on: Boolean(stripe) },
    {
      label: t("billingInfraCorpPrices"),
      on: Boolean(STRIPE_PRICE_CORP_SMALL && STRIPE_PRICE_CORP_LARGE),
    },
    { label: t("billingInfraTax"), on: STRIPE_AUTOMATIC_TAX },
    { label: t("billingInfraBankTransfer"), on: STRIPE_BANK_TRANSFER },
  ];

  return (
    <div className="space-y-12">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("billingHeading")}</h1>
      </header>

      {/* Payment-infrastructure auto-detection */}
      <section>
        <h2 className="font-display text-2xl">{t("billingInfra")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {infra.map((i) => (
            <div
              key={i.label}
              className="rounded-11 border border-border/60 bg-background p-4"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {i.label}
              </p>
              <p
                className={`mt-2 font-mono text-sm font-semibold ${
                  i.on ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {i.on ? t("billingOn") : t("billingOff")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Per-company payment infrastructure */}
      <section>
        <h2 className="font-display text-2xl">{t("billingCompanies")}</h2>
        <div className="mt-4 overflow-x-auto rounded-11 border border-border/60 bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("companyName")}</th>
                <th className="px-4 py-3">{t("billingInfraCol")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("billingEmail")}</th>
                <th className="px-4 py-3">{t("endsAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {companies.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    {t("noLeads")}
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                  const viaStripe = Boolean(c.stripeSubscriptionId);
                  return (
                    <tr key={c.organizationId}>
                      <td className="px-4 py-3 font-medium">
                        {c.organization.name}
                        <p className="text-xs font-normal text-muted-foreground">
                          {c.organization.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-11 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                            viaStripe
                              ? "border-primary/40 bg-primary/15 text-foreground"
                              : "border-border bg-muted text-muted-foreground"
                          }`}
                        >
                          {viaStripe
                            ? t("billingViaStripe")
                            : t("billingViaManual")}
                        </span>
                        {!viaStripe && c.stripeCustomerId ? (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {t("billingHasStripeCustomer")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{c.subscriptionStatus}</td>
                      <td className="px-4 py-3">{c.billingEmail}</td>
                      <td className="px-4 py-3">
                        {c.subscriptionEndsAt
                          ? c.subscriptionEndsAt.toLocaleDateString(dateLocale)
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manual B2B → Stripe invoice (bank transfer / card, no auto-email) */}
      <section>
        <h2 className="font-display text-2xl">{t("billingCreateInvoice")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("billingCreateInvoiceHint")}
        </p>
        <form
          action={createCompanyInvoice}
          className="mt-4 grid gap-4 rounded-11 border border-border/60 bg-background p-6 md:grid-cols-2"
        >
          <div>
            <Label htmlFor="inv-org">{t("companyName")}</Label>
            <select
              id="inv-org"
              name="organizationId"
              required
              className="h-11 w-full rounded-11 border border-border bg-background px-3 text-sm"
            >
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c.organizationId} value={c.organizationId}>
                  {c.organization.name}
                  {c.stripeSubscriptionId ? " (Stripe)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="inv-desc">{t("invoiceDescription")}</Label>
            <Input id="inv-desc" name="description" required />
          </div>
          <div>
            <Label htmlFor="inv-amount">{t("invoiceAmountNet")}</Label>
            <Input
              id="inv-amount"
              name="amountEur"
              required
              inputMode="decimal"
              placeholder="1200.00"
            />
          </div>
          <div>
            <Label htmlFor="inv-due">{t("invoiceDueDays")}</Label>
            <Input
              id="inv-due"
              name="dueDays"
              type="number"
              min={1}
              defaultValue={14}
            />
          </div>
          <div>
            <Label htmlFor="inv-vat">{t("invoiceVatId")}</Label>
            <Input id="inv-vat" name="vatId" placeholder="DE123456789" />
          </div>
          <div>
            <Label htmlFor="inv-country">{t("invoiceCountry")}</Label>
            <Input
              id="inv-country"
              name="country"
              placeholder="DE"
              maxLength={2}
            />
          </div>
          <div>
            <Label htmlFor="inv-line1">{t("invoiceAddress")}</Label>
            <Input id="inv-line1" name="line1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="inv-postal">{t("invoicePostal")}</Label>
              <Input id="inv-postal" name="postalCode" />
            </div>
            <div>
              <Label htmlFor="inv-city">{t("invoiceCity")}</Label>
              <Input id="inv-city" name="city" />
            </div>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="dark">
              {t("invoiceCreateSubmit")}
            </Button>
          </div>
        </form>
      </section>

      {/* Recent Stripe invoices */}
      <section>
        <h2 className="font-display text-2xl">{t("recentInvoices")}</h2>
        <div className="mt-4 overflow-x-auto rounded-11 border border-border/60 bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("invoiceNumber")}</th>
                <th className="px-4 py-3">{t("companyName")}</th>
                <th className="px-4 py-3">{t("invoiceTotal")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("createdAt")}</th>
                <th className="px-4 py-3">{t("colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {invoices.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    {t("noInvoices")}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {inv.number ?? inv.id}
                    </td>
                    <td className="px-4 py-3">
                      {companyByCustomer.get(String(inv.customer)) ??
                        inv.customer_email ??
                        "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {(inv.total / 100).toLocaleString(dateLocale, {
                        style: "currency",
                        currency: inv.currency.toUpperCase(),
                      })}
                    </td>
                    <td className="px-4 py-3">{inv.status}</td>
                    <td className="px-4 py-3">
                      {new Date(inv.created * 1000).toLocaleDateString(
                        dateLocale,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {inv.hosted_invoice_url ? (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm underline underline-offset-2 hover:opacity-80"
                        >
                          {t("invoiceOpen")}
                        </a>
                      ) : (
                        "—"
                      )}
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
