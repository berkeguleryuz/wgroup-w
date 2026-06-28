import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import {
  activateCompany,
  markLeadContacted,
  updateCompany,
  deactivateCompany,
  reactivateCompany,
} from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { ConfirmButton } from "@/components/editor/ConfirmButton";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function toDateInput(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function AdminCorporatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ lead?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = searchParams ? await searchParams : undefined;
  const [t, leads, companies] = await Promise.all([
    getTranslations("admin"),
    prisma.corporateLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.companyProfile.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        organization: {
          select: { name: true, slug: true, _count: { select: { members: true } } },
        },
      },
    }),
  ]);
  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  const prefillLead = sp?.lead
    ? leads.find((l) => l.id === sp.lead) ?? null
    : null;

  const STATUSES = ["pending", "active", "grace", "expired"] as const;

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
                      <div className="flex items-center gap-2">
                        {l.status === "new" ? (
                          <form action={markLeadContacted}>
                            <input type="hidden" name="id" value={l.id} />
                            <Button type="submit" variant="secondary" size="sm">
                              {t("markContacted")}
                            </Button>
                          </form>
                        ) : null}
                        {l.status !== "converted" ? (
                          <a
                            href={`?lead=${l.id}#activate`}
                            className="rounded-11 border border-surface-dark bg-surface-dark px-3 py-1.5 text-xs font-medium text-surface-dark-foreground transition-colors hover:bg-surface-dark/90"
                          >
                            {t("activateFromLead")}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("converted")}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="activate" className="scroll-mt-24">
        <h2 className="font-display text-2xl">{t("activate")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("activateDescription")}
        </p>
        {prefillLead ? (
          <p className="mt-3 rounded-11 border border-primary bg-primary/30 px-4 py-2 text-sm">
            {t("prefilledFromLead", { company: prefillLead.companyName })}
          </p>
        ) : null}
        <form
          key={prefillLead?.id ?? "blank"}
          action={activateCompany}
          className="mt-6 grid gap-4 rounded-11 border border-border/60 bg-background p-6 md:grid-cols-2"
        >
          {prefillLead ? (
            <input type="hidden" name="leadId" value={prefillLead.id} />
          ) : null}
          <div>
            <Label htmlFor="companyName">{t("companyName")}</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={prefillLead?.companyName ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="slug">{t("slug")}</Label>
            <Input
              id="slug"
              name="slug"
              placeholder="acme"
              defaultValue={prefillLead ? slugify(prefillLead.companyName) : ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="ownerEmail">{t("ownerEmail")}</Label>
            <Input
              id="ownerEmail"
              type="email"
              name="ownerEmail"
              defaultValue={prefillLead?.email ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="ownerName">{t("ownerName")}</Label>
            <Input
              id="ownerName"
              name="ownerName"
              defaultValue={prefillLead?.contactName ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="billingEmail">{t("billingEmail")}</Label>
            <Input
              id="billingEmail"
              type="email"
              name="billingEmail"
              defaultValue={prefillLead?.email ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="seatCount">{t("seats")}</Label>
            <Input
              id="seatCount"
              name="seatCount"
              type="number"
              min={1}
              defaultValue={prefillLead?.seatTarget ?? 10}
            />
          </div>
          <div>
            <Label htmlFor="endsAt">{t("endsAt")}</Label>
            <Input id="endsAt" name="endsAt" type="date" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={prefillLead?.message ?? ""}
            />
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
        <div className="mt-4 space-y-4">
          {companies.length === 0 ? (
            <p className="rounded-11 border border-border/60 bg-background px-4 py-6 text-center text-sm text-muted-foreground">
              —
            </p>
          ) : (
            companies.map((c) => (
              <div
                key={c.organizationId}
                className="rounded-11 border border-border/60 bg-background p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{c.organization.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.organization._count.members} / {c.seatCount}{" "}
                      {t("seatsUsed")} · {c.subscriptionStatus}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.subscriptionStatus === "expired" ? (
                      <form action={reactivateCompany}>
                        <input
                          type="hidden"
                          name="organizationId"
                          value={c.organizationId}
                        />
                        <Button type="submit" variant="secondary" size="sm">
                          {t("reactivate")}
                        </Button>
                      </form>
                    ) : (
                      <form action={deactivateCompany}>
                        <input
                          type="hidden"
                          name="organizationId"
                          value={c.organizationId}
                        />
                        <ConfirmButton
                          confirmText={t("deactivateConfirm", {
                            company: c.organization.name,
                          })}
                          className="rounded-11 border border-border px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-muted"
                        >
                          {t("deactivate")}
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                </div>

                <form
                  action={updateCompany}
                  className="mt-4 grid gap-3 border-t border-border/60 pt-4 md:grid-cols-4"
                >
                  <input
                    type="hidden"
                    name="organizationId"
                    value={c.organizationId}
                  />
                  <div>
                    <Label htmlFor={`seats-${c.organizationId}`}>
                      {t("seats")}
                    </Label>
                    <Input
                      id={`seats-${c.organizationId}`}
                      name="seatCount"
                      type="number"
                      min={c.organization._count.members}
                      defaultValue={c.seatCount}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`status-${c.organizationId}`}>
                      {t("status")}
                    </Label>
                    <select
                      id={`status-${c.organizationId}`}
                      name="subscriptionStatus"
                      defaultValue={c.subscriptionStatus}
                      className="h-11 w-full rounded-11 border border-border bg-background px-3 text-sm"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`ends-${c.organizationId}`}>
                      {t("endsAt")}
                    </Label>
                    <Input
                      id={`ends-${c.organizationId}`}
                      name="endsAt"
                      type="date"
                      defaultValue={toDateInput(c.subscriptionEndsAt)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`billing-${c.organizationId}`}>
                      {t("billingEmail")}
                    </Label>
                    <Input
                      id={`billing-${c.organizationId}`}
                      name="billingEmail"
                      type="email"
                      defaultValue={c.billingEmail}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Button type="submit" variant="secondary" size="sm">
                      {t("saveCompany")}
                    </Button>
                  </div>
                </form>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
