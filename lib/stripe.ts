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
