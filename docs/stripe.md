# Stripe Webhook Handling — Q&A Notes

Notes from a discussion about how Stripe webhook handling works in this codebase (`apps/opticv-be/src/app/stripe/`), captured on 2026-08-11 during work on the `107-stripe-integration` branch.

## Explain to me handling stripe webhook

Looking at the current implementation (`stripe.controller.ts`, `stripe.service.ts`, `stripe.module.ts`):

### The core problem webhooks solve

Checkout Sessions and redirect URLs aren't reliable signals that a payment succeeded — the user's browser could close before hitting your `success_url`, or a subscription could later fail to renew with no user in the loop at all. Stripe's webhook is the source of truth: it pushes server-to-server events whenever something changes on their side.

### 1. Raw body requirement

Signature verification (`stripe.webhooks.constructEvent`) needs the **exact raw bytes** Stripe sent — not the JSON-parsed body — because the signature is an HMAC over the raw payload. Any re-serialization (even reordering keys) breaks verification.

That's what an earlier commit (`f87998e`) set up: enabling `rawBody` on the request. In `stripe.controller.ts`, `@Req() request: RawBodyRequest<Request>` pulls that raw buffer via `request.rawBody`, and `main.ts`/`app.module.ts` must have `rawBody: true` passed to `NestFactory.create` plus raw-body handling configured so this route specifically bypasses the global JSON body parser.

### 2. Signature verification (`stripe.service.ts`)

```ts
verifyAndConstructEvent(rawBody: Buffer, signature: string): Stripe.Event {
  return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
```

This does two things at once: confirms the payload really came from Stripe (not a forged request hitting your public endpoint), and parses it into a typed `Stripe.Event`. The `stripe-signature` header contains a timestamp + HMAC-SHA256 signature; `constructEvent` recomputes it using your webhook signing secret and throws if they don't match. The controller catches that failure and returns `400` rather than `500` — a bad signature isn't a server error, it's a rejected/malformed request.

### 3. Idempotency and ordering

Stripe **can and will** redeliver the same event (retries on timeout/non-2xx, or duplicate delivery), and events aren't guaranteed to arrive in the order they occurred. Two implications:

- **`handleSubscriptionUpdated`/`handleSubscriptionDeleted` are idempotent by construction** — they upsert against `stripeCustomerId` using the latest data straight from the event, so replaying the same event twice is harmless (it just re-writes the same values).
- **Ordering risk**: if `customer.subscription.updated` for a downgrade arrives before `checkout.session.completed` for an upgrade (out of order), you could momentarily process stale state. This is fairly low risk here since each event fetches/uses the subscription's _current_ state from Stripe rather than trusting deltas — `handleCheckoutSessionCompleted` calls `this.stripe.subscriptions.retrieve(...)` instead of trusting only the session object.

### 4. Fast, unauthenticated, unthrottled by design

Three things stand out in the controller and are intentional for webhooks specifically:

- **No auth guard** — Stripe can't send a Supabase JWT; signature verification _is_ the auth.
- **`@SkipThrottle()`** — Stripe can burst-deliver many events; rate-limiting them would cause dropped/retried webhooks.
- **Always returns 200** (`{ received: true }`) once signature verification passes, even for unhandled event types (the `default: break` in the switch). Returning non-2xx tells Stripe to retry — you only want that for genuine processing failures, not "we don't care about this event type."

### Error propagation

If `handleCheckoutSessionCompleted`/`handleSubscriptionUpdated` throw (e.g., a transient DB error), that exception propagates up through the controller uncaught, NestJS returns a 500, and Stripe will retry — which is correct behavior. Nothing in the switch cases is wrapped in a try/catch that would swallow errors before the `return { received: true }`.

---

## When does the `checkout.session.completed` event happen?

`checkout.session.completed` fires the moment a customer finishes the Stripe-hosted checkout flow successfully — they filled in payment details and Stripe accepted it. It's triggered right after the browser redirect to `success_url` would happen (`stripe.service.ts`, `createCheckoutSession`), but as a separate, independent server-to-server event.

In this setup (`mode: 'subscription'`):

- It fires **once**, right when the initial subscription is created and the first invoice is paid (or set up for the trial). It's the "checkout finished" event, not a recurring billing event.
- At that point, `session.subscription` is populated with the newly created subscription's ID, which is why `handleCheckoutSessionCompleted` retrieves the full subscription object to read price/tier/period data.
- It does **not** fire again for renewals — that's what `customer.subscription.updated`/`invoice.paid` are for. Checkout Session completion is specifically about the checkout UI flow ending in success, not ongoing subscription state.

**Edge case:** for subscriptions with a payment method that requires additional confirmation (e.g., certain bank debits or delayed-notification methods), `checkout.session.completed` can fire before the payment has actually settled — `payment_status` on the session would be `unpaid` in that case rather than `paid`. The handler currently doesn't check `session.payment_status` before activating the subscription — it goes straight from event received to `status: 'ACTIVE'`. For card payments (the common case) this isn't an issue since they settle synchronously, but if delayed payment methods are ever accepted, this is a gap to close by checking `session.payment_status === 'paid'` first, or by relying on `customer.subscription.updated`/`invoice.paid` to flip status instead.

---

## checkout.session.completed fires once when the subscription is created, and we fill currentPeriodEnd etc. from the Stripe subscription. But when do we update that field when the subscription automatically renews? Do we handle that?

**Short answer: no, this is not currently handled correctly — it's a real gap.**

Evidence: `stripe.controller.spec.ts` explicitly tests `invoice.paid` as a no-op/unhandled event type today.

### Why `customer.subscription.updated` doesn't reliably cover renewals

On a normal automatic renewal (subscription hits the end of its billing period, Stripe successfully charges the customer again), Stripe's actual event sequence is:

1. `invoice.created` — the renewal invoice is generated
2. `invoice.paid` (or `invoice.payment_succeeded`) — payment for the new period succeeds
3. `customer.subscription.updated` — **only if something about the subscription object actually changed**

That third one is the catch. Whether a routine renewal produces a `customer.subscription.updated` event is inconsistent — straightforward renewals with no plan/quantity/status change don't reliably trigger it. `invoice.paid` is the reliable, Stripe-recommended signal for "a billing cycle successfully renewed" — Stripe's own docs point at `invoice.paid`/`invoice.payment_succeeded` for updating period dates and granting continued access, not `customer.subscription.updated`.

Currently the controller only handles:

- `checkout.session.completed` (initial subscribe)
- `customer.subscription.updated` (plan/status changes)
- `customer.subscription.deleted` (cancellation)

There's no `invoice.paid` case, so on renewal, if Stripe doesn't also happen to emit `subscription.updated`, `currentPeriodStart`/`currentPeriodEnd` in the `Subscription` table go stale — silently. Nothing errors; the row just stops reflecting reality.

### What to add

A case for `invoice.paid` (or `invoice.payment_succeeded` — near-duplicates, but `invoice.paid` is the one Stripe currently recommends) that:

1. Reads `invoice.subscription` to get the subscription ID
2. Retrieves the subscription from Stripe (or reads period data off the invoice's line items, which also carry `period.start`/`period.end`)
3. Upserts `currentPeriodStart`/`currentPeriodEnd` (and `status: 'ACTIVE'`) the same way `handleSubscriptionUpdated` does

Also worth handling: `invoice.payment_failed`, so a failed renewal charge reflects as `PAST_DUE` rather than silently staying `ACTIVE` with a stale period end. Stripe will already flip the subscription's `status` to `past_due` in that case, but this is currently only caught via `subscription.updated`, which has the same reliability question as above.

**Status: implemented.** `handleInvoicePaid` and `handleInvoicePaymentFailed` were added to `stripe.service.ts`, wired into the `invoice.paid`/`invoice.payment_failed` cases in `stripe.controller.ts`'s webhook switch, following the same pattern as `handleSubscriptionUpdated`:

- `handleInvoicePaid` — reads `invoice.subscription`, retrieves the subscription from Stripe, and upserts `status: 'ACTIVE'` plus refreshed `stripePriceId`/`currentPeriodStart`/`currentPeriodEnd` on the matching `Subscription` row (matched by `stripeCustomerId`). No-ops with a warning if the invoice has no subscription id or no row matches the customer.
- `handleInvoicePaymentFailed` — sets `status: 'PAST_DUE'` on the matching row. No-ops with a warning if no row matches the customer.

Both are covered by unit tests in `stripe.service.spec.ts` and `stripe.controller.spec.ts` (renewal-update path, no-subscription-id path, no-matching-row path, and controller delegation).

---

## If we get status PAST_DUE, how is this handled? Does Stripe handle it automatically?

`PAST_DUE` means a renewal invoice payment failed, but Stripe hasn't given up yet.

### What Stripe handles automatically

Governed by Dashboard settings (Settings → Billing → Automatic collection / Smart Retries), not application code:

- **Retries** — Stripe (via Smart Retries, ML-scheduled) re-attempts the charge over a configurable window (commonly up to ~2–4 weeks depending on settings).
- **Emails** — Stripe can automatically send the customer "your payment failed, please update your card" emails during this window (also a Dashboard toggle).
- **Resolution** — one of two things eventually happens, each firing its own webhook:
  - Retry succeeds → `invoice.paid` fires again → `handleInvoicePaid` flips status back to `ACTIVE` and refreshes the period. This part is handled by the current code.
  - All retries exhausted → subscription status moves to `canceled` (or `unpaid`, depending on the "Cancel subscription" vs "Mark uncollectible" dunning setting) → `customer.subscription.deleted` (or another `subscription.updated`) fires.

So Stripe automates chasing the card holder. **It does not automatically restrict what the app lets the user do** — that's the application's responsibility.

### Gap: PAST_DUE is stored but not enforced

`status` is written to the `Subscription` table and passed through into `UserProfile` (`users.service.ts`) for display only. There is no guard or check anywhere gating CV generation/premium features based on `status !== 'PAST_DUE'`. Today, a user whose card fails keeps full `BASIC`/`PRO` access indefinitely until Stripe eventually cancels the subscription outright (which could be weeks later) — no earlier feature-gating happens on the app side.

### Suggested pattern (not yet implemented)

- Treat tier gating as `tier !== 'FREE' && status === 'ACTIVE'` (or explicitly allow `TRIALING` too) wherever tier is currently checked for feature access.
- Surface a "payment failed, update your card" banner in the frontend when `status === 'PAST_DUE'`, pointing the user at the billing portal session (`createPortalSession`, `stripe.controller.ts`), since Stripe's portal lets customers update their payment method directly.

**Status: not yet implemented — follow-up work.**

---

### Prepare staging environemnt to handle Stripe webhook

Stripe CLI's listen command can forward events to any reachable URL, not just localhost, so it works against your Render staging deployment too. You have two real options:

Option 1: Point the CLI listener at your Render staging URL (closest to what you're doing now)

stripe listen --forward-to https://your-staging-app.onrender.com/api/stripe/webhook

This still runs stripe listen locally, but instead of forwarding to localhost:3000, it forwards straight to your deployed staging backend. Two things to get right:

- Webhook secret: stripe listen generates its own ephemeral whsec\_... signing secret each time you start it (printed in the terminal). Your staging environment's STRIPE_WEBHOOK_SECRET env var must match that value for constructEvent to pass — so you'd need to update Render's env var to the CLI's printed secret before testing, and remember it's different from whatever secret you use for a "real" webhook endpoint.
- This is genuinely just for ad hoc testing — you wouldn't leave stripe listen running against staging long-term since it depends on your local terminal session staying open.

Option 2: Register a real webhook endpoint in the Stripe Dashboard pointing at staging (recommended for actual staging validation)

Since staging is a real publicly reachable URL (not localhost), you don't need the CLI listener/forwarding trick at all — you can register it as a proper webhook endpoint:

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: https://your-staging-app.onrender.com/api/stripe/webhook
3. Select the events you handle: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed
4. Stripe gives you a stable signing secret for that endpoint — set that as STRIPE_WEBHOOK_SECRET in Render's env vars for the staging service
5. Do this in test mode (toggle top-left in Dashboard) so you're using test API keys/cards, not live ones — assuming staging uses your sk*test*... key already

This is better for staging specifically because: it doesn't depend on your laptop/terminal being open, it's how production will work anyway (validating the real deployed flow end-to-end), and Stripe's Dashboard gives you a webhook event log with retry/replay buttons per endpoint for debugging failed deliveries — genuinely useful once you're past local dev.

My recommendation: use Option 2. It tests the actual thing you're shipping (a public HTTPS endpoint Stripe hits directly), rather than a CLI relay that only exists while your terminal is open.

One thing worth confirming on your end: does your Render staging service actually run with NODE_ENV pointed at an env file that has stripe.webhookSecret/stripe.secretKey set to test-mode values? Want me to check apps/opticv-be/config/env/ and how the Stripe config keys are validated, to make sure staging is wired to read them correctly?
