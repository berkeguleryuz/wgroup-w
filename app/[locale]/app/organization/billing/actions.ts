"use server";

import { getLocale } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";
import {
  stripe,
  corpPriceIdFor,
  STRIPE_PRICE_CORP_LARGE,
  type CorporatePackage,
} from "@/lib/stripe";
import { localizedPath } from "@/lib/i18n/routing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function returnUrl() {
  const locale = await getLocale();
  return `${APP_URL}${localizedPath(locale, "/app/organization")}`;
}

/** Whether the org already has a live Stripe subscription (double-billing guard). */
function hasLiveStripeSub(profile: {
  stripeSubscriptionId: string | null;
  subscriptionStatus: string;
}) {
  return (
    !!profile.stripeSubscriptionId &&
    (profile.subscriptionStatus === "active" ||
      profile.subscriptionStatus === "grace")
  );
}

export async function startCorporateCheckout(
  pkg: CorporatePackage,
): Promise<string | null> {
  const { session, membership } = await requireOrgOwner();
  if (!stripe) throw new Error("Stripe not configured");

  const organizationId = membership.organizationId;
  const profile = await prisma.companyProfile.findUnique({
    where: { organizationId },
  });
  if (!profile) return null;

  const url = await returnUrl();

  // Already on a live Stripe subscription → billing portal, not a second
  // checkout (which would double-bill the company).
  if (hasLiveStripeSub(profile)) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId!,
      return_url: url,
    });
    return portal.url;
  }

  const customerId =
    profile.stripeCustomerId ||
    (
      await stripe.customers.create({
        email: profile.billingEmail || session.user.email,
        name: membership.organization.name,
        metadata: { organizationId },
      })
    ).id;

  if (!profile.stripeCustomerId) {
    await prisma.companyProfile.update({
      where: { organizationId },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: corpPriceIdFor(pkg), quantity: 1 }],
    success_url: `${url}?ok=1`,
    cancel_url: `${url}?cancel=1`,
    metadata: { organizationId },
    subscription_data: { metadata: { organizationId } },
  });

  return checkout.url;
}

export async function openCorporateBillingPortal(): Promise<string | null> {
  const { membership } = await requireOrgOwner();
  if (!stripe) throw new Error("Stripe not configured");

  const profile = await prisma.companyProfile.findUnique({
    where: { organizationId: membership.organizationId },
  });
  if (!profile?.stripeCustomerId) return null;

  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: await returnUrl(),
  });
  return portal.url;
}

/**
 * Upgrade corp_small → corp_large in place (prorated). State flips via the
 * customer.subscription.updated webhook, not here.
 */
export async function upgradeCorporatePlan(): Promise<{ ok: boolean; error?: string }> {
  const { membership } = await requireOrgOwner();
  if (!stripe) throw new Error("Stripe not configured");

  const profile = await prisma.companyProfile.findUnique({
    where: { organizationId: membership.organizationId },
  });
  if (!profile?.stripeSubscriptionId || profile.plan !== "corp_small") {
    return { ok: false, error: "no upgradable subscription" };
  }

  const sub = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId);
  const item = sub.items.data[0];
  if (!item) return { ok: false, error: "subscription has no items" };

  await stripe.subscriptions.update(sub.id, {
    items: [{ id: item.id, price: STRIPE_PRICE_CORP_LARGE }],
    proration_behavior: "create_prorations",
  });

  return { ok: true };
}
