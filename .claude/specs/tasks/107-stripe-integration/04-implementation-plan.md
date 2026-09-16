# Implementation Plan — Task 107 (Stripe Integration)

## Source

- Specification: `.claude/specs/tasks/107-stripe-integration/02-spec.md`
- Spec review: `.claude/specs/tasks/107-stripe-integration/03-spec-review.md` (PASS WITH ISSUES)

## Pre-implementation decisions (resolving spec-review open items)

These resolve the review's "Unclear or Ambiguous Sections" so implementation isn't blocked on judgment calls:

1. **`rawBody` mechanism (Non-Critical Issue #1).** Use `NestFactory.create(AppModule, { rawBody: true })` only. Do NOT add a separate `express.raw()` middleware layer — with `rawBody: true`, Nest's default body parser already populates `req.rawBody` as a `Buffer` on every route while still parsing `req.body` as JSON. The webhook controller reads `req.rawBody` directly; no route-specific middleware needed. This must be verified against the installed `@nestjs/platform-express` version during step 3 below — if `req.rawBody` is not populated as expected, stop and flag it rather than layering `express.raw()` on top.
2. **`Subscription` fetch in `StripeService` (Non-Critical Issue #2).** `StripeService` queries `Subscription` explicitly via `PrismaService` (`prisma.subscription.findUnique({ where: { userId } })`), the same way `UsersService.getProfile()` does — never assumes it's attached to `CurrentUser()`'s `UserModel`.
3. **Webhook user lookup order (Non-Critical Issue #3).** Deterministic order, not "or": for `checkout.session.completed`, look up by `client_reference_id` (= internal `User.id`) first — this is the primary key of truth from our side. For `customer.subscription.updated` / `.deleted` (which carry no `client_reference_id`), look up by `stripeCustomerId`. Do not fall back from one to the other.
4. **`cancelAtPeriodEnd`/`currentPeriodEnd` in `UserProfile.subscription` (Unclear Section #1).** Add both fields to the shared `UserProfile.subscription` type and populate them in `UsersService.getProfile()`/`updateDisplayName()`/`updateNotificationPreference()`. Do not build the frontend "cancels on ⟨date⟩" display — that stays nice-to-have/out of scope, but the data is exposed since it's a two-line addition and avoids a follow-up backend task purely to unblock a future frontend tweak.
5. **Success/cancel query flag (Unclear Section #2).** Use `?billing=success` and `?billing=canceled` on the `success_url`/`cancel_url` respectively. Settings component reads this query param on init (`ActivatedRoute.snapshot.queryParamMap`) and shows a `MessageService` toast: success → severity `success`, "Subscription updated." / canceled → severity `info`, "Checkout canceled.". After reading, no further action needed (no URL cleanup required for this task).
6. **Idempotency (Unclear Section #3).** No new idempotency table/locking. Document as a design property: all three webhook handlers use Prisma `upsert`/`update` keyed on `stripeSubscriptionId` or `userId`, which are naturally idempotent under Stripe's at-least-once redelivery — replaying the same event produces the same end state.

---

## Backend

### 1. Dependencies

- Add `stripe` (official Node SDK) to `apps/opticv-be`'s dependencies in the root `package.json` (npm workspace — single root `package.json` per existing convention). Install before writing any code that imports it, per rules.md "Order of operations".

### 2. Config wiring

- `apps/opticv-be/config/env/development.env`: add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO` (values filled in manually by the user from the Stripe dashboard/CLI — placeholders in the plan, not committed secrets).
- `apps/opticv-be/config/env/staging.env` and `production.env`: add the same four keys as placeholders (empty or `CHANGE_ME`) so Joi validation doesn't break other environments' config loading — confirm with user whether staging/production should be populated now or left as placeholders pending live setup (this task is dev-mode only per scope).
- `apps/opticv-be/config/validation.ts`: add to `validationSchema`:
  - `STRIPE_SECRET_KEY: Joi.string().required()`
  - `STRIPE_WEBHOOK_SECRET: Joi.string().required()`
  - `STRIPE_PRICE_BASIC: Joi.string().required()`
  - `STRIPE_PRICE_PRO: Joi.string().required()`
- `apps/opticv-be/config/configuration.ts`: add a `stripe` section:
  ```
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceBasic: process.env.STRIPE_PRICE_BASIC,
    pricePro: process.env.STRIPE_PRICE_PRO,
  }
  ```

### 3. `main.ts`

- Change `NestFactory.create(AppModule)` → `NestFactory.create(AppModule, { rawBody: true })`.
- No other change to `main.ts` — do not add `express.raw()` (see Pre-implementation decision #1).

### 4. Shared datatypes (`packages/shared/datatypes/src/lib/datatypes.ts`)

- Extend `UserProfile.subscription` (currently `{ tier: SubscriptionTier; status: SubscriptionStatus } | null`) to:
  ```
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  } | null;
  ```
- Rebuild `@opticv/datatypes` before touching dependent backend/frontend files (`^build` Nx dependency — run `npm exec nx build datatypes` or rely on `nx` task graph when building dependents).

### 5. `StripeModule` (`apps/opticv-be/src/app/stripe/`)

New directory, mirroring `QuotaModule`/`UsersModule` structure:

- **`stripe.module.ts`** — imports `PrismaModule`, `ConfigModule`; provides `StripeService`; declares `StripeController`; imports `AuthModule` (for `SupabaseGuard` on the two authenticated routes).
- **`stripe.service.ts`** — `StripeService`:
  - Constructs a `Stripe` client from `config.getOrThrow('stripe.secretKey')` in the constructor (per Stripe SDK convention, pinned `apiVersion`).
  - `getOrCreateCustomer(userId: string, email: string): Promise<string>` — reads `Subscription` via Prisma; if `stripeCustomerId` present, returns it; else calls `stripe.customers.create({ email, metadata: { userId } })`, persists the new id onto `Subscription` (upsert, since a `Subscription` row already exists per-user from `UsersService.upsertUser`), returns it.
  - `createCheckoutSession(userId: string, email: string, tier: 'BASIC' | 'PRO'): Promise<{ url: string }>` — resolves price id from `tier` via a private `priceForTier` map (`{ BASIC: config stripe.priceBasic, PRO: config stripe.pricePro }`); calls `getOrCreateCustomer`; creates a Checkout Session (`mode: 'subscription'`, `customer`, `line_items: [{ price, quantity: 1 }]`, `client_reference_id: userId`, `success_url: ${frontendUrl}/settings?billing=success`, `cancel_url: ${frontendUrl}/settings?billing=canceled`); returns `{ url: session.url }` — throw `InternalServerErrorException` if `session.url` is null (Stripe SDK types it nullable).
  - `createPortalSession(userId: string): Promise<{ url: string }>` — reads `Subscription`; if `stripeCustomerId` is null, throw `ForbiddenException` (per Edge Cases); else `stripe.billingPortal.sessions.create({ customer: stripeCustomerId, return_url: ${frontendUrl}/settings })`; returns `{ url: session.url }`.
  - `private priceIdToTier(priceId: string): 'BASIC' | 'PRO' | null` — reverse lookup against the same two configured price ids; returns `null` on no match (caller logs and skips, per Edge Cases — never defaults to `FREE`).
  - `verifyAndConstructEvent(rawBody: Buffer, signature: string): Stripe.Event` — wraps `stripe.webhooks.constructEvent(rawBody, signature, config.getOrThrow('stripe.webhookSecret'))`; lets `Stripe.errors.StripeSignatureVerificationError` propagate to the controller, which maps it to `400`.
  - `handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void>` — extracts the `Checkout.Session` object; looks up `User` by `id: session.client_reference_id` (Pre-implementation decision #3); if not found, log warning and return; else upsert `Subscription` (`tier` via `priceIdToTier` on the session's line item / subscription's price — see note below, `status: 'ACTIVE'`, `stripeCustomerId`, `stripeSubscriptionId: session.subscription`, `stripePriceId`, `currentPeriodStart/End` from the retrieved Stripe Subscription object — Checkout Session doesn't carry period dates directly, so this handler must call `stripe.subscriptions.retrieve(session.subscription)` to get them).
  - `handleSubscriptionUpdated(event: Stripe.Event): Promise<void>` — extracts `Stripe.Subscription`; looks up `Subscription` row by `stripeCustomerId: subscription.customer`; if not found, log warning and return; resolve `tier` via `priceIdToTier(subscription.items.data[0].price.id)` — if `null`, log error and skip the tier field only (still update status/dates/cancelAtPeriodEnd, per Edge Cases "don't crash the webhook handler"); update `status` (map Stripe subscription `status` → `SubscriptionStatus` enum — `active`→`ACTIVE`, `canceled`→`CANCELED`, `past_due`→`PAST_DUE`, `trialing`→`TRIALING`, default/unknown → leave unchanged and log), `currentPeriodStart/End`, `cancelAtPeriodEnd`.
  - `handleSubscriptionDeleted(event: Stripe.Event): Promise<void>` — extracts `Stripe.Subscription`; looks up by `stripeCustomerId: subscription.customer`; if not found, log warning and return; update `Subscription` to `tier: 'FREE'`, `status: 'CANCELED'`, `stripeSubscriptionId: null`, `stripePriceId: null`, `cancelAtPeriodEnd: false`.
- **`stripe.controller.ts`** — `StripeController`, `@Controller('stripe')`:
  - `POST /checkout-session` — `@UseGuards(SupabaseGuard)`, body validated via a new `CreateCheckoutSessionDto` (`tier: 'BASIC' | 'PRO'`, class-validator `@IsIn(['BASIC', 'PRO'])`); calls `stripeService.createCheckoutSession(user.id, user.email, dto.tier)`.
  - `POST /portal-session` — `@UseGuards(SupabaseGuard)`, no body; calls `stripeService.createPortalSession(user.id)`.
  - `POST /webhook` — no guard; `@Header('...')` not needed, instead reads `@Req() request: RawBodyRequest<Request>` (Nest's `RawBodyRequest` type wraps `rawBody?: Buffer`) and `@Headers('stripe-signature') signature: string`; if `request.rawBody` is undefined, throw `InternalServerErrorException` (misconfiguration, should never happen once `rawBody: true` is set); calls `stripeService.verifyAndConstructEvent`, catching signature errors to return `400`; on success, `switch (event.type)` over the three handled types (delegating to the three service methods) plus a `default` no-op branch; always returns `{ received: true }` with `200` except the `400` signature-failure path.
  - Apply `@SkipThrottle()` (from `@nestjs/throttler`) on the webhook route only — Stripe's webhook delivery from a small set of IPs at moderate volume shouldn't be subject to the per-IP `api-ip` throttle tier meant for browser clients; confirm with user if they'd rather leave throttling on (Stripe recommends against rate-limiting webhook endpoints).
- **DTO**: `apps/opticv-be/src/app/stripe/dto/create-checkout-session.dto.ts` — `CreateCheckoutSessionDto { tier: 'BASIC' | 'PRO' }` using `class-validator` (`@IsIn`), following the same pattern as `UpdateNotificationPreferenceDto`.

### 6. `AppModule`

- Import `StripeModule` into `apps/opticv-be/src/app/app.module.ts` imports array.

### 7. `UsersService` update

- `getProfile`, `updateDisplayName`, `updateNotificationPreference`: extend the `subscription` object literal in each method's return with `cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd` and `currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() ?? null` (matching the datatypes change in step 4).

### 8. Backend tests

- **`stripe.service.spec.ts`** (new, Jest, mocking `PrismaService` and the `stripe` SDK client the same way `quota.service.spec.ts` mocks Prisma):
  - `getOrCreateCustomer` — reuses existing `stripeCustomerId`; creates + persists a new one when absent.
  - `createCheckoutSession` — builds session with correct price id per tier; throws when Stripe returns a null `session.url`.
  - `createPortalSession` — throws `ForbiddenException` when `stripeCustomerId` is null; returns `{ url }` otherwise.
  - `priceIdToTier` (via a handler that exercises it, e.g. `handleSubscriptionUpdated`) — correct mapping for both configured price ids; `null`/skip on unknown price id.
  - `verifyAndConstructEvent` — propagates signature verification failure.
  - `handleCheckoutSessionCompleted` — upserts `Subscription` with tier/status/Stripe ids/period dates on match; no-op + warning log when `client_reference_id` doesn't resolve to a user.
  - `handleSubscriptionDeleted` — resets to `tier: FREE`, `status: CANCELED`, clears Stripe subscription/price ids.
- **`stripe.controller.spec.ts`** (new):
  - `POST /webhook` — signature failure → `400`; unhandled event type → `200` no-op; each of the three handled event types → delegates to the corresponding service method and returns `{ received: true }`.
  - `POST /checkout-session` / `POST /portal-session` — delegate to service with the authenticated user's id/email; DTO validation rejects a `tier` outside `BASIC`/`PRO`.

---

## Frontend

### 9. `UserSettingsApiService` (`apps/opticv-web/src/app/core/services/user-settings-api.service.ts`)

- Add:
  ```
  createCheckoutSession(tier: 'BASIC' | 'PRO'): Observable<{ url: string }>
  createPortalSession(): Observable<{ url: string }>
  ```
  Both `this.http.post<{ url: string }>(...)` against `${environment.apiUrl}/stripe/checkout-session` and `/stripe/portal-session` respectively, matching the existing `updateDisplayName`/`deleteAccount` method style (no `httpResource`, since these are one-shot mutations, not GET state).

### 10. `Settings` component (`apps/opticv-web/src/app/features/settings/settings.ts`)

- Inject `ActivatedRoute` (new import from `@angular/router`).
- Add `isRedirectingToCheckout = signal<'BASIC' | 'PRO' | null>(null)` and `isRedirectingToPortal = signal(false)` for per-button loading state (mirrors `isDeleting`/`isSavingName` pattern).
- `ngOnInit`: after the existing `reloadUserProfile()`/`reloadUsageStatus()` calls, read `this.route.snapshot.queryParamMap.get('billing')`; if `'success'`, show a `MessageService` success toast ("Subscription updated."); if `'canceled'`, show an info toast ("Checkout canceled."). No further action (per Pre-implementation decision #5).
- `onUpgrade(tier: 'BASIC' | 'PRO'): void` — sets `isRedirectingToCheckout(tier)`, calls `userSettingsApiService.createCheckoutSession(tier)`, on success sets `window.location.href = response.url`, on error shows an error toast and resets the signal (same `catchError` pattern as `onFullNameUpdateSubmit`).
- `onManageBilling(): void` — sets `isRedirectingToPortal(true)`, calls `userSettingsApiService.createPortalSession()`, on success `window.location.href = response.url`, on error toast + reset signal.

### 11. `Settings` template (`apps/opticv-web/src/app/features/settings/settings.html`)

- In the "Subscription" section (currently lines 120–169), replace the always-disabled `Manage billing`/`View invoices` button pair with conditional content:
  - `@if (userProfile.value()?.subscription?.tier === 'FREE')`: two enabled buttons, "Upgrade to Basic" and "Upgrade to Pro", each `(onClick)="onUpgrade('BASIC' | 'PRO')"`, `[loading]="isRedirectingToCheckout() === 'BASIC' | 'PRO'"`, `[disabled]="isRedirectingToCheckout() !== null"`.
  - `@else` (tier is BASIC or PRO): a single enabled "Manage billing" button, `(onClick)="onManageBilling()"`, `[loading]="isRedirectingToPortal()"`, `[disabled]="isRedirectingToPortal()"`. Drop the "View invoices" button entirely — Stripe's hosted portal covers invoice history (per spec's Out-of-scope: "Invoice/receipt UI in-app").
- Keep existing `aria-label`/`icon` conventions used elsewhere on `p-button` in this file.

### 12. Local webhook testing doc note

- No new file — add a short "Local Stripe webhook testing" subsection to `docs/tasks-list.md` under task 107 (or leave as a comment in this plan for the user to run manually, since it's a one-time dev workflow note, not app code):
  1. `stripe login` (once).
  2. `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
  3. Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` in `apps/opticv-be/config/env/development.env`.
  4. Restart `npm run start-be:dev`.

---

## Verification / Acceptance

Run in this order after implementation:

1. `npm exec nx build datatypes` (shared type change must land first).
2. `npm exec nx lint opticv-be` and `npm exec nx lint opticv-web`.
3. `npm exec nx typecheck opticv-be` and `npm exec nx typecheck opticv-web`.
4. `npm exec nx test opticv-be` (new `stripe.service.spec.ts` / `stripe.controller.spec.ts` plus full suite for regressions).
5. `npm exec nx build opticv-be` and `npm exec nx build opticv-web`.
6. Manual E2E (dev mode, requires user to complete the Stripe dashboard steps in spec Scope item 1 first):
   - Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`, `npm run start-be:dev`, `npm exec nx serve opticv-web`.
   - FREE user clicks "Upgrade to Basic" → redirected to Stripe Checkout → pay with `4242 4242 4242 4242` → redirected back to `/settings?billing=success` → toast shown → tier shows `BASIC` after profile reload.
   - Click "Manage billing" → Stripe portal → cancel subscription → redirected back → webhook (`customer.subscription.deleted`) flips tier to `FREE` in Prisma Studio and on reload.
   - Confirm no regression: a user who never touches billing still sees FREE tier and usage quotas exactly as before (existing `settings.spec.ts` frontend tests and `users.controller.spec.ts`/`users.service.spec.ts` backend tests still pass unmodified aside from the `subscription` shape addition).

---

## Files to be created/modified

**New files:**

- `apps/opticv-be/src/app/stripe/stripe.module.ts`
- `apps/opticv-be/src/app/stripe/stripe.service.ts`
- `apps/opticv-be/src/app/stripe/stripe.service.spec.ts`
- `apps/opticv-be/src/app/stripe/stripe.controller.ts`
- `apps/opticv-be/src/app/stripe/stripe.controller.spec.ts`
- `apps/opticv-be/src/app/stripe/dto/create-checkout-session.dto.ts`

**Modified files:**

- `package.json` (add `stripe` dependency)
- `apps/opticv-be/src/main.ts` (`rawBody: true`)
- `apps/opticv-be/config/env/development.env` (+4 Stripe vars)
- `apps/opticv-be/config/env/staging.env` (+4 Stripe vars, placeholder)
- `apps/opticv-be/config/env/production.env` (+4 Stripe vars, placeholder)
- `apps/opticv-be/config/validation.ts` (+4 Joi rules)
- `apps/opticv-be/config/configuration.ts` (+`stripe` config section)
- `apps/opticv-be/src/app/app.module.ts` (import `StripeModule`)
- `apps/opticv-be/src/app/users/users.service.ts` (extend `subscription` object in 3 methods)
- `packages/shared/datatypes/src/lib/datatypes.ts` (extend `UserProfile.subscription`)
- `apps/opticv-web/src/app/core/services/user-settings-api.service.ts` (+2 methods)
- `apps/opticv-web/src/app/features/settings/settings.ts` (+upgrade/portal handlers, query-param toast)
- `apps/opticv-web/src/app/features/settings/settings.html` (Subscription section buttons)
- `docs/tasks-list.md` (local webhook testing note, update task 107 status)
