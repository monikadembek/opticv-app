# Implementation Done — Task 107 (Stripe Integration)

## Summary

Stripe test-mode subscription billing was implemented end-to-end: a backend `StripeModule` exposing `checkout-session`, `portal-session`, and `webhook` endpoints; webhook handlers for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, plus two additional handlers (`invoice.paid`, `invoice.payment_failed`) not in the original spec; `UserProfile.subscription` extended with `cancelAtPeriodEnd`/`currentPeriodEnd`; and frontend "Upgrade to Basic/Pro" and "Manage billing" buttons on the settings page with success/canceled toast handling.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Stripe dashboard test-mode setup (Products, Prices, Portal config) | Not implemented | Manual user-performed step per spec; not code |
| Env vars `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO` + Joi validation + `configuration.ts` | Implemented | `validation.ts`, `configuration.ts` |
| `StripeService` wrapping Stripe SDK | Implemented | `stripe.service.ts` |
| `POST /api/stripe/checkout-session` | Implemented | `stripe.controller.ts` |
| `POST /api/stripe/portal-session` | Implemented | `stripe.controller.ts` |
| `POST /api/stripe/webhook` (raw body, signature verification) | Implemented | `stripe.controller.ts`, `main.ts` (`rawBody: true`) |
| `checkout.session.completed` handler (upsert Subscription) | Implemented | `stripe.service.ts` |
| `customer.subscription.updated` handler | Implemented | `stripe.service.ts` |
| `customer.subscription.deleted` handler (reset to FREE/CANCELED) | Implemented | `stripe.service.ts` |
| Webhook signature failure → 400 | Implemented | `stripe.controller.ts` |
| Unhandled event types → 200 no-op | Implemented | `stripe.controller.ts` default switch branch |
| `UserSettingsApiService.createCheckoutSession(tier)` / `createPortalSession()` | Implemented | `user-settings-api.service.ts` |
| Settings page: Upgrade buttons (FREE) / Manage billing button (BASIC/PRO) | Implemented | `settings.ts`, `settings.html` |
| Local webhook testing documentation | Implemented | `docs/stripe.md` (see Deviations — different location than planned) |
| Reuse existing `stripeCustomerId` on repeat upgrade (no duplicate Customer) | Implemented | `stripe.service.ts` (`getOrCreateCustomer`) |
| Portal session with no `stripeCustomerId` → 403 | Implemented | `stripe.service.ts` (`ForbiddenException`) |
| Unknown price ID → log and skip tier update, no crash | Implemented | `stripe.service.ts` (`priceIdToTier` returns `null`, callers branch on it) |
| `cancelAtPeriodEnd`/`currentPeriodEnd` added to `UserProfile.subscription` | Implemented | `datatypes.ts`, `users.service.ts` (3 methods), `user-profile.dto.ts` |
| Unit tests: `StripeService` (checkout, portal, price↔tier mapping) | Implemented | `stripe.service.spec.ts` |
| Unit tests: webhook handler (signature failure, checkout completed, subscription deleted) | Implemented | `stripe.controller.spec.ts`, `stripe.service.spec.ts` |
| No breaking changes to existing quota/settings behavior | Implemented | `users.controller.spec.ts`/`users.service.spec.ts` pass with mechanical shape updates only |

## Files

### Created

- `apps/opticv-be/src/app/stripe/stripe.module.ts`
- `apps/opticv-be/src/app/stripe/stripe.service.ts`
- `apps/opticv-be/src/app/stripe/stripe.service.spec.ts`
- `apps/opticv-be/src/app/stripe/stripe.controller.ts`
- `apps/opticv-be/src/app/stripe/stripe.controller.spec.ts`
- `apps/opticv-be/src/app/stripe/dto/create-checkout-session.dto.ts`
- `docs/stripe.md`

### Modified

- `apps/opticv-be/src/main.ts` (`rawBody: true`)
- `apps/opticv-be/config/configuration.ts` (+`stripe` config section)
- `apps/opticv-be/config/validation.ts` (+4 Joi rules)
- `apps/opticv-be/src/app/app.module.ts` (import `StripeModule`)
- `apps/opticv-be/src/app/users/users.service.ts` (extend `subscription` object in 3 methods)
- `apps/opticv-be/src/app/users/dto/user-profile.dto.ts` (+`cancelAtPeriodEnd`, `currentPeriodEnd`)
- `apps/opticv-be/src/app/users/users.controller.spec.ts` (mechanical update for new subscription fields)
- `apps/opticv-be/src/app/users/users.service.spec.ts` (mechanical update for new subscription fields)
- `packages/shared/datatypes/src/lib/datatypes.ts` (extend `UserProfile.subscription`)
- `apps/opticv-web/src/app/core/services/user-settings-api.service.ts` (+2 methods)
- `apps/opticv-web/src/app/features/settings/settings.ts` (+upgrade/portal handlers, query-param toast)
- `apps/opticv-web/src/app/features/settings/settings.html` (Subscription section buttons)
- `apps/opticv-web/src/app/features/settings/settings.spec.ts` (updated for new buttons/handlers)

Not observed in this diff scope (env value files are gitignored/untracked, per plan's "confirm with user" note and code review's finding #2):

- `apps/opticv-be/config/env/development.env`
- `apps/opticv-be/config/env/staging.env`
- `apps/opticv-be/config/env/production.env`

## Components

| Component | Status |
| --- | --- |
| `StripeModule` | Exist |
| `StripeService` | Exist |
| `StripeController` | Exist |
| `CreateCheckoutSessionDto` | Exist |

## Stores

No stores specified in the implementation plan for this task (frontend uses component-local signals, not an NgRx store). N/A.

## Deviations

1. **Two additional webhook event handlers beyond the plan**: `handleInvoicePaid` (`invoice.paid`) and `handleInvoicePaymentFailed` (`invoice.payment_failed`) were added to `stripe.service.ts` and wired into `stripe.controller.ts`'s event switch, alongside the three planned handlers (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).
2. **Local webhook testing documentation was written to a new file `docs/stripe.md`**, rather than as a subsection added to `docs/tasks-list.md` as stated in the plan. `docs/stripe.md` is structured as Q&A notes rather than a step-by-step CLI guide.
3. **Staging/production env files**: plan called for placeholder Stripe keys in `staging.env`/`production.env`; per code review (`05-code-review.md`), `production.env` has the four keys present but empty, and `staging.env` has them populated with real-looking test-mode values rather than placeholders. Both files are gitignored/untracked, not visible in this task's git diff.
4. **`handleCheckoutSessionCompleted`'s `create` branch omits `tier` on an unmatched price ID** rather than the `update` branch's equivalent skip, relying on the Prisma schema's `tier` field default (`FREE`) instead of an explicit skip — noted in code review as a code smell, not corrected as of this report.

## Additional Implementation

- `handleInvoicePaid` and `handleInvoicePaymentFailed` methods in `stripe.service.ts`, and their corresponding `invoice.paid`/`invoice.payment_failed` cases in `stripe.controller.ts`'s webhook switch, plus associated unit tests in `stripe.service.spec.ts`/`stripe.controller.spec.ts` — additional implementation not covered by the original spec/plan documents (see Deviations #1).
- `docs/stripe.md` — a Q&A-style writeup of webhook handling, raw-body requirements, signature verification, idempotency, and the `PAST_DUE`/renewal gap — additional implementation not covered by the original spec/plan documents.
