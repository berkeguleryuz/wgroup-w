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

  // Idempotency: skip events we've already fully processed. The processed-marker
  // is written only AFTER successful handling (below), so a failure leaves no
  // row and Stripe's retry reprocesses cleanly instead of being deduped away.
  const seen = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (seen) return NextResponse.json({ ok: true, deduped: true });

  const eventAt = new Date(event.created * 1000);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id || (s.metadata?.userId ?? null);
        const subscriptionId =
          typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
        if (userId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(userId, sub, eventAt);
        } else {
          console.warn(`[stripe] checkout.session.completed unresolved`, {
            eventId: event.id,
            userId,
            subscriptionId,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          (sub.metadata?.userId as string | undefined) ??
          (await userIdFromCustomer(sub.customer));
        if (userId) await upsertFromSubscription(userId, sub, eventAt);
        else
          console.warn(`[stripe] ${event.type} unresolved userId`, {
            eventId: event.id,
            subscriptionId: sub.id,
          });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        // Don't let a late, out-of-order delete clobber a newer active state.
        await prisma.individualSubscription.updateMany({
          where: {
            stripeSubscriptionId: sub.id,
            OR: [{ lastEventAt: null }, { lastEventAt: { lte: eventAt } }],
          },
          data: { status: "canceled", cancelAtPeriodEnd: false, lastEventAt: eventAt },
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe] handler error for ${event.type} (${event.id}):`, err);
    // 500 → Stripe retries. No processed-marker was written, so the retry runs.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Mark processed only after success.
  await prisma.stripeEvent
    .create({ data: { id: event.id, type: event.type } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}

async function userIdFromCustomer(customer: Stripe.Subscription["customer"]) {
  const customerId = typeof customer === "string" ? customer : customer.id;
  const existing = await prisma.individualSubscription.findUnique({
    where: { stripeCustomerId: customerId },
  });
  return existing?.userId ?? null;
}

async function upsertFromSubscription(
  userId: string,
  sub: Stripe.Subscription,
  eventAt: Date,
) {
  // Out-of-order guard: skip if we've already applied a newer event for this user.
  const current = await prisma.individualSubscription.findUnique({
    where: { userId },
    select: { lastEventAt: true },
  });
  // >= (not >) so a same-second, out-of-order event can't overwrite newer state
  // (e.g. resurrect a just-canceled sub). Same-state duplicates are idempotent.
  if (current?.lastEventAt && current.lastEventAt >= eventAt) return;

  const plan =
    sub.items.data[0]?.price.recurring?.interval === "year" ? "yearly" : "monthly";

  const periodEndUnix = sub.items.data[0]?.current_period_end;
  // Display-only; if Stripe omits it, derive a sensible end from the interval
  // rather than stamping "now" (which would read as already-expired).
  const fallbackEnd = new Date(
    Date.now() + (plan === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
  );

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  await prisma.individualSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status,
      currentPeriodEnd: periodEndUnix
        ? new Date(periodEndUnix * 1000)
        : fallbackEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      lastEventAt: eventAt,
    },
    update: {
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status,
      ...(periodEndUnix ? { currentPeriodEnd: new Date(periodEndUnix * 1000) } : {}),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      lastEventAt: eventAt,
    },
  });
}
