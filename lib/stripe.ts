import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key
  ? new Stripe(key, { apiVersion: "2026-03-25.dahlia" })
  : (null as unknown as Stripe);

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
