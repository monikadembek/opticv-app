# Code Review — Task 107: Stripe Integration

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation covers all in-scope spec requirements (checkout session, portal session, webhook signature verification, the three required event handlers, frontend upgrade/manage-billing buttons) and follows the pre-implementation decisions from the plan. All Stripe-related backend tests (28) and users tests (33) pass, and `npm exec nx lint`/`typecheck` show no Stripe-related errors. Issues found are a handful of unguarded nullable/cast values in the webhook handlers and two undocumented-but-reasoned deviations from the plan (extra webhook events, missing staging/production env placeholders).

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. **Unsafe cast instead of narrowing — `stripe.service.ts:212`.** `handleSubscriptionUpdated` does `const stripeCustomerId = subscription.customer as string;`. Stripe's `Subscription.customer` field is typed `string | Stripe.Customer | Stripe.DeletedCustomer`; if Stripe ever sends an expanded customer object here, the cast silently produces a non-string value used as a Prisma `where` filter instead of failing loudly or narrowing like `handleInvoicePaid`/`handleInvoicePaymentFailed` already do (`stripe.service.ts:279-282`, `327-330`).
2. **Same unguarded cast — `stripe.service.ts:351`.** `handleSubscriptionDeleted` repeats the `subscription.customer as string` pattern from issue #1.
3. **`priceForTier` calls `getOrThrow` on every checkout/webhook invocation (`stripe.service.ts:41-46`).** Minor inefficiency/code smell: the getter re-reads two config values from `ConfigService` on every call to `priceIdToTier`/`createCheckoutSession` rather than resolving them once in the constructor alongside `this.stripe`.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`) + Joi validation + `configuration.ts` | Covered | `validation.ts:22-25`, `configuration.ts:30-35` |
| `POST /api/stripe/checkout-session` | Covered | `stripe.controller.ts:32-47`, matches spec request/response shape |
| `POST /api/stripe/portal-session` | Covered | `stripe.controller.ts:49-60` |
| `POST /api/stripe/webhook` (raw body, signature verification, `{received:true}`) | Covered | `stripe.controller.ts:62-110` |
| `checkout.session.completed` handler | Covered | `stripe.service.ts:134-208` |
| `customer.subscription.updated` handler | Covered | `stripe.service.ts:210-259` |
| `customer.subscription.deleted` handler | Covered | `stripe.service.ts:349-374` |
| `main.ts` `rawBody: true` | Covered | `main.ts:16` |
| Webhook signature failure → 400 | Covered | `stripe.controller.ts:84-87`, tested in `stripe.controller.spec.ts:82-90` |
| Unhandled event types → 200 no-op | Covered | `stripe.controller.ts:105-106`, tested `stripe.controller.spec.ts:92-106` |
| Reuse existing `stripeCustomerId` on repeat upgrade | Covered | `stripe.service.ts:60-62`, tested |
| Portal session with no `stripeCustomerId` → 403 | Covered | `stripe.service.ts:110-112`, tested |
| Unknown price ID → log error, skip tier update, don't crash | Partial | Correctly skipped in `handleSubscriptionUpdated` (tested). In `handleCheckoutSessionCompleted`'s `create` branch (new `Subscription` row with no prior record), omitting `tier` falls through to the Prisma schema default `FREE` rather than truly "skipping" — see Code Smells. Low practical impact since every user already has a `Subscription` row from `upsertUser`, making this `create` branch effectively unreachable. |
| `cancelAtPeriodEnd`/`currentPeriodEnd` added to `UserProfile.subscription` | Covered | `datatypes.ts:162-167`, populated in all 3 `UsersService` methods |
| Frontend: checkout session + redirect (FREE users) | Covered | `settings.ts:310-332`, `settings.html:153-174` |
| Frontend: portal session + redirect (paid users) | Covered | `settings.ts:334-356`, `settings.html:175-187` |
| Frontend: `?billing=success` / `?billing=canceled` toast | Covered | `settings.ts:137-150` |
| "View invoices" button removed | Covered | Not present in `settings.html` |
| Backend unit tests (checkout, portal, price↔tier mapping, webhook handlers) | Covered | `stripe.service.spec.ts`, `stripe.controller.spec.ts` — 28 tests, all passing |
| No breaking changes to existing quota/settings behavior | Covered | `users.controller.spec.ts`/`users.service.spec.ts` pass with only mechanical `subscription` shape updates |

## Plan Deviations

1. **Two extra webhook event handlers not in the spec's event list.** The spec (`02-spec.md:35-38`) and plan (`04-implementation-plan.md`) only call for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. The implementation adds `handleInvoicePaid` and `handleInvoicePaymentFailed` (`stripe.service.ts:261-347`, wired in `stripe.controller.ts:99-104`), justified in `docs/stripe.md:63-101` as fixing a real gap where `customer.subscription.updated` doesn't reliably fire on routine renewals. This is a reasonable, documented engineering call, but it is scope beyond what was specified/planned and was not confirmed with the user beforehand per this workflow's "do not add new requirements" rule — flagging for visibility, not as a defect.
2. **Staging/production env files were not updated with Stripe placeholders as the plan specified.** Plan step 2 says to add all four Stripe keys as placeholders to `staging.env` and `production.env` "so Joi validation doesn't break other environments' config loading." `production.env` has the four keys present but empty; `staging.env` has them populated with real-looking test-mode values instead of placeholders. (Note: both files are gitignored/untracked, so this is a plan-fidelity note, not a leaked-secret issue.)

## Null Safety Issues

1. **`stripe.service.ts:212` (`handleSubscriptionUpdated`) and `stripe.service.ts:351` (`handleSubscriptionDeleted`)** — `subscription.customer as string` forces a type instead of narrowing `string | Stripe.Customer | Stripe.DeletedCustomer` the way `handleInvoicePaid`/`handleInvoicePaymentFailed` do. If Stripe ever sends an expanded customer object on these event types, the cast produces a non-string value passed straight into a Prisma `where: { stripeCustomerId }` unique lookup.
2. **`stripe.service.ts:279-282` / `327-330`** — `stripeCustomerId` from `invoice.customer` is correctly narrowed to `string | undefined`, but the `undefined` case is not guarded before use in `this.prisma.subscription.findUnique({ where: { stripeCustomerId } })` (`stripe.service.ts:284-286`, `332-334`). An `invoice.customer` of `null` (Stripe types it nullable) would pass `undefined` into a Prisma unique-where lookup rather than being caught and logged the way a missing subscription ID already is a few lines above in the same handler.

## Code Smells

1. **`handleCheckoutSessionCompleted`'s `create` branch can silently default a new subscription to `FREE` tier on an unknown price ID** (`stripe.service.ts:178-193`), contradicting the spec's explicit "don't silently default to FREE" edge case, because the Prisma schema's `tier` field defaults to `FREE` when omitted from `create`. Effectively unreachable today since `UsersService.upsertUser` always creates a `Subscription` row up front (so this webhook only ever hits the `update` branch in practice) — but the code as written doesn't structurally prevent it.
2. **Duplicated `tier`/`status`/period-date upsert payload shape** across `handleCheckoutSessionCompleted`, `handleSubscriptionUpdated`, and `handleInvoicePaid` (`stripe.service.ts:178-207`, `243-258`, `308-321`) — three near-identical blocks building period-date objects from `item.current_period_start/end`. Not flagged as a Critical issue since each handler's edge-case logic (create vs. update, status mapping, warning conditions) differs enough that a shared helper would need several parameters, but worth noting as duplication.

## Recommendation

- Fix critical issues before merge — **none are Critical**; the Non-Critical/Null Safety items (unsafe `as string` casts, unguarded `undefined` customer id) are low-probability-but-real correctness risks and reasonable to fix before merge given how cheap the fix is (mirror the narrowing already used in the invoice handlers). Otherwise **safe to merge as-is** once those are addressed or explicitly accepted.
