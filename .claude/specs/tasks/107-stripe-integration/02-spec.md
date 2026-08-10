# Task Specification

## Source

Task 107 — Setup Stripe in dev mode (`docs/tasks-list.md`)

## Goal

Wire up Stripe subscription billing end-to-end in **test mode**: Stripe Checkout for upgrading FREE → BASIC/PRO, a webhook that keeps the `Subscription` table in sync with Stripe, and a Stripe Customer Portal link for users to manage/cancel/switch their plan. No real bank account or live payments are involved — Stripe test mode covers all of this.

## Context

- `Subscription` model (`apps/opticv-be/prisma/schema.prisma:87-107`) already has `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `currentPeriodStart/End`, `cancelAtPeriodEnd` — scaffolded but unused.
- `SubscriptionTier` (`FREE | BASIC | PRO`) and `TIER_LIMITS` already exist in `@opticv/datatypes` (from task 106/quota work) and are enforced by `QuotaService` (`apps/opticv-be/src/app/quota/quota.service.ts`).
- `UsersService.getProfile()` returns `UserProfile.subscription: { tier, status }` — consumed by the frontend `settings` page and `UserSettingsApiService`.
- Config pattern: env vars declared in `apps/opticv-be/config/env/{NODE_ENV}.env`, validated in `apps/opticv-be/config/validation.ts` (Joi), mapped in `apps/opticv-be/config/configuration.ts`, read via `ConfigService`.
- There is an existing webhook precedent (`UsersController` Supabase webhook) but it uses a shared-secret header, not raw-body HMAC — Stripe webhooks require true raw request body for signature verification, which is a new pattern for this codebase (`rawBody: true` in `NestFactory.create`, `express.raw()` on that one route only).
- `CurrentUser` decorator (`apps/opticv-be/src/app/auth/decorators/current-user.decorator.ts`) reads `request.user` (Prisma `UserModel`) — set by whatever auth guard runs before it (Supabase JWT verification — outside this task's scope, already in place per `AuthModule`).
- Frontend: `UserSettingsApiService` (`apps/opticv-web/src/app/core/services/user-settings-api.service.ts`) uses `httpResource` for GET data and plain `HttpClient` methods for mutations; `settings.ts`/`settings.html` render the current tier/usage.

## Scope

### In scope

1. **Stripe dashboard (test mode)** — manual setup steps (documented here, performed by the user):
   - Create two Products: "OptiCV Basic" and "OptiCV Pro".
   - Create one recurring monthly Price per product, USD: BASIC = $9.99/mo, PRO = $19.99/mo.
   - Grab test-mode Secret Key, and (via Stripe CLI, for local dev) a webhook signing secret.
   - Enable the Stripe Customer Portal (test mode) and configure it to allow plan switching between the BASIC/PRO prices and cancellation.
2. **Backend `StripeModule`** (`apps/opticv-be/src/app/stripe/`):
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO` added to env files + Joi validation + `configuration.ts`.
   - `StripeService` wrapping the `stripe` Node SDK client.
   - `POST /api/stripe/checkout-session` — authenticated; body `{ tier: 'BASIC' | 'PRO' }`; creates or reuses a Stripe Customer for the user, creates a Checkout Session (`mode: 'subscription'`), returns `{ url }`.
   - `POST /api/stripe/portal-session` — authenticated; creates a Stripe Billing Portal session for the user's `stripeCustomerId`, returns `{ url }`.
   - `POST /api/stripe/webhook` — **unauthenticated**, raw body, verifies `Stripe-Signature` via `STRIPE_WEBHOOK_SECRET`. Handles:
     - `checkout.session.completed` → look up user by `client_reference_id`/metadata, upsert `Subscription` with `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `tier` (mapped from price ID), `status: 'ACTIVE'`, `currentPeriodStart/End`.
     - `customer.subscription.updated` → update `tier`/`status`/`currentPeriodStart/End`/`cancelAtPeriodEnd` from the subscription object (covers plan switches and cancel-at-period-end made via the portal).
     - `customer.subscription.deleted` → set `tier: 'FREE'`, `status: 'CANCELED'`, clear `stripeSubscriptionId`/`stripePriceId`.
   - `main.ts`: enable `rawBody: true` on `NestFactory.create`; apply `express.raw({ type: 'application/json' })` only to the webhook route (so all other routes keep using Nest's default JSON body parser).
3. **Frontend**:
   - `UserSettingsApiService`: add `createCheckoutSession(tier)` and `createPortalSession()` methods (`POST` returning `{ url }`), then `window.location.href = url` on the calling component side (full-page redirect to Stripe-hosted pages — no in-app Stripe Elements in this task).
   - Settings page: add an "Upgrade" section — for FREE users, buttons to upgrade to BASIC/PRO (calls checkout-session, redirects); for BASIC/PRO users, a "Manage billing" button (calls portal-session, redirects) instead of upgrade buttons. Reuses existing tier display already on the settings page.
4. **Local webhook testing docs** — a short section (in this spec / follow-up dev note) on running `stripe listen --forward-to localhost:3000/api/stripe/webhook` and copying the CLI-provided signing secret into `development.env`.

### Out of scope

- Live/production Stripe mode, real bank account, payouts.
- Annual billing interval (monthly only, per decision).
- A custom in-app "switch plan" endpoint — plan switching/cancellation is delegated entirely to the Stripe Customer Portal.
- Proration logic, trials, coupons/discounts.
- Changes to `QuotaService` limit values or `TIER_LIMITS` — this task only makes tier changes reachable via real billing events; the limits themselves are already correct.
- Invoice/receipt UI in-app (Stripe's hosted pages/emails cover this).
- Backend auth/JWT verification changes (already in place).

## Behavior

### Checkout (upgrade) flow

1. User on `/settings`, currently FREE, clicks "Upgrade to BASIC" (or PRO).
2. Frontend calls `POST /api/stripe/checkout-session` with `{ tier: 'BASIC' }`.
3. Backend: loads the current user, creates a Stripe Customer if `subscription.stripeCustomerId` is null (stores the id immediately), creates a Checkout Session with `line_items: [{ price: STRIPE_PRICE_BASIC, quantity: 1 }]`, `mode: 'subscription'`, `client_reference_id: user.id`, `success_url`/`cancel_url` pointing back to `${FRONTEND_URL}/settings` (with a query flag to show a success/cancel toast).
4. Backend returns `{ url: session.url }`; frontend redirects the browser to it.
5. User completes payment on Stripe's hosted Checkout page (test card `4242 4242 4242 4242`).
6. Stripe fires `checkout.session.completed` to the webhook; backend updates `Subscription` (tier, status, Stripe ids, period dates).
7. Stripe redirects the browser back to `success_url`; frontend reloads `userProfile` (existing `reloadUserProfile()`), now showing the new tier.

### Manage billing (existing subscriber) flow

1. User on `/settings`, currently BASIC or PRO, clicks "Manage billing".
2. Frontend calls `POST /api/stripe/portal-session` (no body needed — backend uses the authenticated user's `stripeCustomerId`).
3. Backend creates a Billing Portal session (`return_url: ${FRONTEND_URL}/settings`), returns `{ url }`.
4. Frontend redirects; user can update payment method, switch BASIC↔PRO, or cancel, all on Stripe's hosted portal.
5. Any change triggers `customer.subscription.updated` (or `.deleted` on cancel) → webhook keeps `Subscription` in sync.
6. On return to `/settings`, frontend reloads the profile.

### Webhook signature verification

- Route must receive the **raw, unparsed** request body (Buffer) — required by `stripe.webhooks.constructEvent(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET)`.
- If signature verification fails, respond `400` and do not process the event.
- Unhandled event types are acknowledged with `200` and ignored (no-op), to avoid Stripe retry storms.

## Edge Cases

- **Webhook arrives before/without a matching user** (e.g. manual Stripe dashboard test event): look up by `client_reference_id` (checkout events) or by `stripeCustomerId` (subscription events); if no match, log a warning and return `200` (nothing to do, don't fail the delivery).
- **User already has a `stripeCustomerId`** on a second upgrade attempt: reuse it instead of creating a duplicate Stripe Customer.
- **Checkout session abandoned** (user closes tab): no webhook fires beyond nothing; `Subscription` stays unchanged. No cleanup needed.
- **Price ID → tier mapping**: must be resolvable both ways (env `STRIPE_PRICE_BASIC`/`STRIPE_PRICE_PRO` → tier) since webhook events carry price IDs, not tier names. Unknown price ID on an incoming event → log error, skip tier update (don't crash the webhook handler / don't silently default to FREE).
- **Race: webhook vs. quota check** — out of scope to fully solve here; existing `QuotaService.checkAndConsume` reads `Subscription.tier` at call time, so once the webhook lands the new tier applies immediately; no additional locking needed.
- **Portal session requested with no `stripeCustomerId`** (user somehow never checked out, e.g. manually set to BASIC in DB for testing): return a clear `400`/`ForbiddenException` rather than calling Stripe with an empty id.
- **Downgrade via portal to a canceled state with `cancelAtPeriodEnd: true`**: tier stays at current paid tier until `customer.subscription.deleted` actually fires at period end; store `cancelAtPeriodEnd` so the frontend can show "cancels on `<date>`" (display is optional/nice-to-have, not blocking).

## Data / API

### Env vars (new)

`apps/opticv-be/config/env/development.env` (and Joi schema in `validation.ts`, mapping in `configuration.ts`):

- `STRIPE_SECRET_KEY` (required, string)
- `STRIPE_WEBHOOK_SECRET` (required, string — from `stripe listen` output in dev)
- `STRIPE_PRICE_BASIC` (required, string — Stripe Price ID)
- `STRIPE_PRICE_PRO` (required, string — Stripe Price ID)

### Endpoints (new, under `StripeController`, prefix `/api/stripe`)

| Method | Path                        | Auth          | Body                            | Response         |
| ------ | --------------------------- | ------------- | -------------------------------- | ----------------- |
| POST   | `/stripe/checkout-session`  | required      | `{ tier: 'BASIC' \| 'PRO' }`     | `{ url: string }` |
| POST   | `/stripe/portal-session`    | required      | —                                 | `{ url: string }` |
| POST   | `/stripe/webhook`           | none (Stripe signature instead) | raw Stripe event | `{ received: true }` |

### Prisma

No schema changes — `Subscription` fields already support this (`stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `tier`, `status`).

### Datatypes

No new shared types strictly required; optionally extend `UserProfile.subscription` with `cancelAtPeriodEnd?: boolean` and `currentPeriodEnd?: string` if the frontend is to display "cancels on \<date\>" (nice-to-have per Edge Cases — confirm with user before adding if pursued).

## Acceptance (DEV)

- `npm exec nx build opticv-be` and `npm exec nx typecheck opticv-be` pass.
- `npm exec nx lint opticv-be` passes.
- Unit tests added for `StripeService` (checkout session creation, portal session creation, price↔tier mapping) and webhook handler (signature failure → 400; `checkout.session.completed` → Subscription upserted; `customer.subscription.deleted` → tier reset to FREE).
- Manual E2E in dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook` running; upgrade FREE → BASIC via Checkout with test card `4242 4242 4242 4242`; confirm `Subscription` row updates (Prisma Studio) and settings page reflects new tier; open portal, cancel subscription, confirm webhook flips tier back to FREE.
- No breaking changes to existing quota enforcement or settings page behavior for users who haven't touched billing.
