# Corporate Stripe Checkout — Design

Date: 2026-07-02 · Status: approved by user (chat)

## Goal

Organization owners can buy/manage the corporate subscription with a card via
Stripe Checkout, alongside the existing manual (sales-led) activation path.

## Packages (already created in Stripe, test mode)

| Plan | Price ID env | Price | Seats |
|---|---|---|---|
| `corp_small` | `STRIPE_PRICE_CORP_SMALL` | €399.95/year | up to 10 |
| `corp_large` | `STRIPE_PRICE_CORP_LARGE` | €749.95/year | unlimited |

Individual plans: €19.95/month, €199.95/year (`STRIPE_PRICE_MONTHLY/YEARLY`).

## Data model

`CompanyProfile` gains nullable Stripe fields (manual path keeps them null):

- `stripeCustomerId String? @unique`
- `stripeSubscriptionId String? @unique`
- `plan String?` — `"corp_small" | "corp_large"`, null = manual
- `cancelAtPeriodEnd Boolean @default(false)`
- `lastEventAt DateTime?` — out-of-order event guard (same pattern as
  `IndividualSubscription`)

`subscriptionStatus` stays the source of truth for access
(`isCompanyAccessValid` unchanged). Stripe statuses map to it:
active/trialing → `active`, past_due → `grace`, everything terminal
(canceled/unpaid/incomplete_expired) → `expired`.

## Checkout & billing (server actions, owner-only)

`app/[locale]/app/organization/billing/actions.ts`:

- `startCorporateCheckout(pkg: "small" | "large")` — mirrors individual
  `startCheckout`: reuse/create Stripe customer (metadata `organizationId`),
  subscription-mode Checkout with `subscription_data.metadata.organizationId`
  + `plan`; if org already has an active/trialing/grace Stripe sub, return the
  Billing Portal URL instead (double-billing protection).
- `openCorporateBillingPortal()` — portal for the org's customer.
- `upgradeCorporatePlan()` — small→large only: update the subscription item to
  the large price with prorations; webhook syncs state.

## Webhook

Extend `app/api/stripe/webhook/route.ts`: if the subscription (or checkout
session) metadata carries `organizationId`, update `CompanyProfile` instead of
`IndividualSubscription`. Plan derived from the price ID. `corp_small` also
sets `seatCount = 10`. Same idempotency (`StripeEvent`) and `lastEventAt`
out-of-order guards. Customer-ID fallback lookup added for corporate.

## Seat enforcement

- `assertSeatCapacity` (invite actions) becomes plan-aware: `corp_large` →
  unlimited; otherwise limit = `seatCount` (manual orgs keep admin-set
  seatCount). Exceeding the limit requires a package upgrade — surfaced in the
  error message.
- Inviting users works regardless of the invitee's individual subscription
  status (already true today; access flows from org membership).

## UI

Owner dashboard (`/app/organization`): a "Plan & Billing" section — two
package cards with price + seat limit, subscribe buttons (client components
mirroring `SubscribeButton`), manage-billing button when a Stripe sub exists,
upgrade button on `corp_small`. Unlimited seats shown as "∞" in stats.
Translations added to `lib/i18n/{tr,en,de}.json`.

## Add-ons (future, out of scope)

Storage etc. will be extra recurring line items on the same Stripe
subscription; no schema change required now.

## Testing

`stripe listen --forward-to localhost:3000/api/stripe/webhook` + card
4242 4242 4242 4242; verify CompanyProfile flips to `active`, seat limits
enforced on invite, upgrade switches plan.
