"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { localizedPath } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { isNextRedirect } from "@/lib/utils";
import {
  stripe,
  STRIPE_AUTOMATIC_TAX,
  STRIPE_BANK_TRANSFER,
} from "@/lib/stripe";

/** Refresh the billing page and flash a one-shot toast (`?toast=<key>`). */
async function backToBilling(toast: string, emsg?: string) {
  revalidatePath("/", "layout");
  const locale = await getLocale();
  const q = emsg ? `&emsg=${encodeURIComponent(emsg)}` : "";
  redirect(localizedPath(locale, `/app/admin/billing?toast=${toast}${q}`));
}

/**
 * Create (and finalize) a Stripe invoice for a company — the path for
 * manually-activated B2B deals, so that even bank-transfer customers get a
 * proper Stripe invoice that flows into the DATEV export. auto_advance stays
 * off: Stripe never emails or dunns the customer on its own; the admin shares
 * the hosted invoice / PDF link.
 */
export async function createCompanyInvoice(formData: FormData) {
  await requireRole(["admin"]);
  try {
    if (!stripe) throw new Error("Stripe yapılandırılmamış");

    const organizationId = String(formData.get("organizationId") || "");
    const description = String(formData.get("description") || "").trim();
    const amountRaw = String(formData.get("amountEur") || "").replace(",", ".");
    const dueDays = Math.max(1, Number(formData.get("dueDays") || 14));
    const vatId = String(formData.get("vatId") || "").trim();
    const country = String(formData.get("country") || "").trim().toUpperCase();
    const line1 = String(formData.get("line1") || "").trim();
    const postalCode = String(formData.get("postalCode") || "").trim();
    const city = String(formData.get("city") || "").trim();

    const amountCents = Math.round(Number(amountRaw) * 100);
    if (!organizationId || !description || !Number.isFinite(amountCents) || amountCents <= 0) {
      throw new Error("Eksik veya hatalı alan");
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { organizationId },
      include: { organization: { select: { name: true } } },
    });
    if (!profile) throw new Error("Şirket bulunamadı");

    // Ensure a Stripe customer exists (manual companies usually have none yet).
    let customerId = profile.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.billingEmail,
        name: profile.organization.name,
        metadata: { organizationId },
      });
      customerId = customer.id;
      await prisma.companyProfile.update({
        where: { organizationId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Billing address — required by Stripe Tax to determine the VAT treatment
    // (DE 19% vs reverse charge vs non-EU untaxed).
    if (country && line1 && city) {
      await stripe.customers.update(customerId, {
        address: { country, line1, postal_code: postalCode, city },
      });
    }

    // EU VAT ID → validated by Stripe; with Stripe Tax on, a valid foreign EU
    // VAT ID flips the invoice to reverse charge with the mandatory note.
    if (vatId) {
      const existing = await stripe.customers.listTaxIds(customerId, { limit: 10 });
      if (!existing.data.some((t) => t.value === vatId)) {
        await stripe.customers.createTaxId(customerId, {
          type: "eu_vat",
          value: vatId,
        });
      }
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: dueDays,
      auto_advance: false,
      metadata: { organizationId },
      ...(STRIPE_AUTOMATIC_TAX ? { automatic_tax: { enabled: true } } : {}),
      // Bank transfer via customer balance: the invoice shows a virtual IBAN,
      // Stripe reconciles the incoming transfer and marks the invoice paid.
      ...(STRIPE_BANK_TRANSFER
        ? {
            payment_settings: {
              payment_method_types: ["customer_balance", "card"] as const,
              payment_method_options: {
                customer_balance: {
                  funding_type: "bank_transfer" as const,
                  bank_transfer: {
                    type: "eu_bank_transfer" as const,
                    eu_bank_transfer: { country: "DE" },
                  },
                },
              },
            },
          }
        : {}),
    });

    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      description,
      amount: amountCents,
      currency: "eur",
    });

    await stripe.invoices.finalizeInvoice(invoice.id!, { auto_advance: false });

    await backToBilling("saved");
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    await backToBilling("error", (e as Error).message);
  }
}
