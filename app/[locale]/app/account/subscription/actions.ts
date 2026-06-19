"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, priceIdFor, type PlanInterval } from "@/lib/stripe";
import { localizedPath } from "@/lib/i18n/routing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function startCheckout(plan: PlanInterval): Promise<string | null> {
  const [session, locale] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getLocale(),
  ]);
  if (!session) return null;
  if (!stripe) throw new Error("Stripe not configured");

  const userId = session.user.id;
  const email = session.user.email;
  const returnUrl = `${APP_URL}${localizedPath(locale, "/app/account/subscription")}`;

  const existing = await prisma.individualSubscription.findUnique({
    where: { userId },
  });

  // Already subscribed → send to the billing portal instead of opening a second
  // checkout (which would create a duplicate, double-billing subscription).
  if (existing && (existing.status === "active" || existing.status === "trialing")) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: returnUrl,
    });
    return portal.url;
  }

  const customerId =
    existing?.stripeCustomerId ||
    (await stripe.customers.create({ email, metadata: { userId } })).id;

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    success_url: `${returnUrl}?ok=1`,
    cancel_url: `${returnUrl}?cancel=1`,
    client_reference_id: userId,
    metadata: { userId, plan },
  });

  return checkout.url;
}

export async function openBillingPortal(): Promise<string | null> {
  const [session, locale] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getLocale(),
  ]);
  if (!session) return null;
  if (!stripe) throw new Error("Stripe not configured");

  const sub = await prisma.individualSubscription.findUnique({
    where: { userId: session.user.id },
  });
  if (!sub) return null;

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${APP_URL}${localizedPath(locale, "/app/account/subscription")}`,
  });
  return portal.url;
}
