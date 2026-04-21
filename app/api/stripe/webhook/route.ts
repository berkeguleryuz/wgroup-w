import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ ok: false, error: "stripe not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id || (s.metadata?.userId ?? null);
      const subscriptionId =
        typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
      if (userId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertFromSubscription(userId, sub);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const userId =
        (sub.metadata?.userId as string | undefined) ??
        (await userIdFromCustomer(sub.customer));
      if (userId) await upsertFromSubscription(userId, sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.individualSubscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "canceled", cancelAtPeriodEnd: false },
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}

async function userIdFromCustomer(customer: Stripe.Subscription["customer"]) {
  const customerId = typeof customer === "string" ? customer : customer.id;
  const existing = await prisma.individualSubscription.findUnique({
    where: { stripeCustomerId: customerId },
  });
  return existing?.userId ?? null;
}

async function upsertFromSubscription(userId: string, sub: Stripe.Subscription) {
  const plan =
    sub.items.data[0]?.price.recurring?.interval === "year" ? "yearly" : "monthly";

  const periodEndUnix =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    sub.items.data[0]?.current_period_end ??
    Math.floor(Date.now() / 1000);

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  await prisma.individualSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status,
      currentPeriodEnd: new Date(periodEndUnix * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status,
      currentPeriodEnd: new Date(periodEndUnix * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}
