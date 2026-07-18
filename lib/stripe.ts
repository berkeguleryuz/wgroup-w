import "server-only";

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key
  ? new Stripe(key, { apiVersion: "2026-03-25.dahlia" })
  : (null as unknown as Stripe);

// Stripe Tax must first be activated in the Stripe Dashboard (Settings → Tax),
// otherwise checkout creation with automatic_tax fails — hence the env gate.
// When on: 19% German VAT at home, destination-country VAT for EU B2C (OSS),
// reverse charge for EU B2B with a validated VAT ID, untaxed outside the EU.
export const STRIPE_AUTOMATIC_TAX =
  process.env.STRIPE_AUTOMATIC_TAX === "1" ||
  process.env.STRIPE_AUTOMATIC_TAX === "true";

// Bank-transfer (customer balance / virtual IBAN) invoices — requires the
// "Bank transfers" payment method to be activated in the Stripe Dashboard.
export const STRIPE_BANK_TRANSFER =
  process.env.STRIPE_BANK_TRANSFER === "1" ||
  process.env.STRIPE_BANK_TRANSFER === "true";

export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY || "";
export const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY || "";

export type PlanInterval = "monthly" | "yearly";

export function priceIdFor(plan: PlanInterval) {
  return plan === "monthly" ? STRIPE_PRICE_MONTHLY : STRIPE_PRICE_YEARLY;
}

// Corporate packages (yearly). "small" caps the org at 10 seats; "large" is
// unlimited. Plan slugs are persisted on CompanyProfile.plan.
export const STRIPE_PRICE_CORP_SMALL = process.env.STRIPE_PRICE_CORP_SMALL || "";
export const STRIPE_PRICE_CORP_LARGE = process.env.STRIPE_PRICE_CORP_LARGE || "";

export type CorporatePackage = "small" | "large";
export type CorporatePlan = "corp_small" | "corp_large";

export const CORP_SMALL_MAX_SEATS = 10;

export function corpPriceIdFor(pkg: CorporatePackage) {
  return pkg === "small" ? STRIPE_PRICE_CORP_SMALL : STRIPE_PRICE_CORP_LARGE;
}

export function corpPlanFromPriceId(priceId: string): CorporatePlan | null {
  if (priceId && priceId === STRIPE_PRICE_CORP_SMALL) return "corp_small";
  if (priceId && priceId === STRIPE_PRICE_CORP_LARGE) return "corp_large";
  return null;
}
