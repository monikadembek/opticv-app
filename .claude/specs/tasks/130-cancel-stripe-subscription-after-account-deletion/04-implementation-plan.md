# Implementation Plan — Task 130: Cancel Stripe subscription on account deletion

## Inputs

- Spec: `02-spec.md`
- Review: `03-spec-review.md` (PASS. Non-critical issues 1–2 and unclear sections 1–3 are settled below. Issues 3–4 need no code change.)

## Overview

| Layer | Change |
| --- | --- |
| Backend: Stripe | New `StripeService.cancelAllSubscriptionsForCustomer()` lists the customer's subscriptions, then cancels each non-final one immediately without proration |
| Backend: Users | `deleteAccount()` calls it first and turns any failure into `InternalServerErrorException('Failed to delete account.')` before anything is deleted |
| Backend: Modules | `UsersModule` imports `StripeModule`. The resulting module cycle is resolved with `forwardRef` |
| Frontend: Settings | New `hasActivePaidSubscription` computed. The confirm dialog message adds the cancellation sentence only when it is `true` |
| Frontend: Terms | §15 "By you" sentence replaced, `Last updated` date bumped |
| DB / Shared types | None |

## Decisions resolving open review points

- **Review issue 1 (`resource_missing` scope).** Only the *list* phase tolerates `resource_missing`. Listing and canceling are two separate phases: first collect the subscriptions, then cancel them. That way a `resource_missing` from a `cancel` call is not swallowed and aborts the deletion, as the spec requires.
- **Review issue 2 (subscription disappears between list and cancel).** No special handling. The error goes up, the deletion aborts, and a retry succeeds. This matches the spec's "abort on any Stripe failure".
- **Unclear 1 (Terms wording).** The new §15 "By you" sentence (final text): *"If you have a paid plan, deleting your account cancels it immediately. It won't renew and you won't be charged again. The unused part of the current billing period is not refunded, but your right of withdrawal (section 7) still applies."*
- **Unclear 2 (Last updated date).** Set to the implementation date (`20 October 2026`).
- **Unclear 3 (module wiring).** Use `forwardRef` on both module-level edges of the cycle. Restructuring modules is out of scope (minimal footprint). The cycle exists only between modules and in file imports, not between providers: `StripeService` doesn't depend on `UsersService`. So the `StripeService` constructor injection in `UsersService` doesn't need `@Inject(forwardRef(...))`.

---

## Step 1 — Backend: `StripeService.cancelAllSubscriptionsForCustomer`

**File:** `apps/opticv-be/src/app/stripe/stripe.service.ts` (modify)

Signature:

```ts
async cancelAllSubscriptionsForCustomer(stripeCustomerId: string): Promise<void>
```

1. Add a module-level constant `FINAL_STRIPE_SUBSCRIPTION_STATUSES` holding `'canceled'` and `'incomplete_expired'`. Type it against `Stripe.Subscription.Status`.
2. **List phase.** Inside `try`, iterate `this.stripe.subscriptions.list({ customer: stripeCustomerId, status: 'all', limit: 100 })` with `for await` (Stripe auto-pagination, so all pages are read). Collect the subscriptions whose `status` is not in the final set.
   - `catch`: if the error is `instanceof Stripe.errors.StripeInvalidRequestError` and `error.code === 'resource_missing'`, call `this.logger.warn(...)` with the customer id and return. Re-throw any other error unchanged.
3. **Cancel phase,** outside the `try`. For each collected subscription, run `await this.stripe.subscriptions.cancel(subscription.id, { prorate: false, invoice_now: false })` one after another. Don't catch errors here.
4. After each successful cancel, call `this.logger.log(...)` with the subscription id and customer id. This matches the logger usage in the class.
5. Don't touch the database. Webhooks stay the only writer of `Subscription` state.

## Step 2 — Backend: module wiring

**File:** `apps/opticv-be/src/app/users/users.module.ts` (modify)

- Add `forwardRef(() => StripeModule)` to `imports`. Import `forwardRef` from `@nestjs/common`.

**File:** `apps/opticv-be/src/app/auth/auth.module.ts` (modify)

- Change `imports: [UsersModule]` to `imports: [forwardRef(() => UsersModule)]`. Keep `exports` as is.

Verify: start the backend with `npm run start-be:dev` and check that Nest bootstraps without "can't resolve dependencies" or "undefined module at index" errors.

## Step 3 — Backend: `UsersService.deleteAccount`

**File:** `apps/opticv-be/src/app/users/users.service.ts` (modify)

1. Inject `private readonly stripeService: StripeService` in the constructor, after `subscriptionService`.
2. Widen the user lookup to `select: { id: true, subscription: { select: { stripeCustomerId: true } } }`.
3. Right after the `NotFoundException` check and before the `cvDocument.findMany` / R2 loop:
   - Read `const stripeCustomerId = user.subscription?.stripeCustomerId`. `subscription` and `stripeCustomerId` are both nullable, so never assume either is non-null.
   - If it is set, `await this.stripeService.cancelAllSubscriptionsForCustomer(stripeCustomerId)` inside `try`.
   - `catch (error)`: `this.logger.error(...)` with user id, customer id and `${error}`, matching the existing log style. Then `throw new InternalServerErrorException('Failed to delete account.')`.
4. Leave the rest of the method unchanged: R2 cleanup, `prisma.user.delete`, Supabase admin delete.

## Step 4 — Backend: unit tests for `StripeService`

**File:** `apps/opticv-be/src/app/stripe/stripe.service.spec.ts` (modify)

1. Extend `mockStripeClient.subscriptions` with `list: jest.fn()` and `cancel: jest.fn()`.
2. Update the `jest.mock('stripe', ...)` factory so the mocked constructor also exposes the real `errors` namespace (`jest.requireActual('stripe').errors`). The `instanceof Stripe.errors.StripeInvalidRequestError` check then works in tests.
3. Add a helper that turns an array (or a thrown error) into an async iterable for `list` to return.
4. New `describe('cancelAllSubscriptionsForCustomer')`:
   - It lists with `{ customer, status: 'all', limit: 100 }`.
   - It cancels `active`, `trialing`, `past_due`, `unpaid`, `incomplete` and `paused` subscriptions with `{ prorate: false, invoice_now: false }`.
   - It skips `canceled` and `incomplete_expired`. `cancel` is not called for them.
   - It makes no `cancel` calls when the list is empty.
   - On `resource_missing` from `list`, it resolves without throwing and makes no `cancel` call.
   - It re-throws other list errors, such as a generic `Error` or `StripeAPIError`.
   - It re-throws a `cancel` failure, *including* a `resource_missing` from `cancel`.
   - It doesn't call any `mockPrisma` method.

## Step 5 — Backend: unit tests for `UsersService.deleteAccount`

**File:** `apps/opticv-be/src/app/users/users.service.spec.ts` (modify)

1. Add `mockStripeService = { cancelAllSubscriptionsForCustomer: jest.fn().mockResolvedValue(undefined) }` and register it as `{ provide: StripeService, useValue: mockStripeService }`.
2. Extend `mockPrisma` with `cvDocument.findMany` and `user.delete`.
3. Add `jest.mock('@supabase/supabase-js', ...)`. Its `createClient` returns `{ auth: { admin: { deleteUser: mockDeleteUser } } }`, and `mockDeleteUser` resolves `{ error: null }` by default. `mockConfig.getOrThrow` returns test values for `supabase.url` and `supabase.serviceRoleKey`.
4. New `describe('deleteAccount')`. There are no existing `deleteAccount` tests, so this is a new block:
   - If the user is not found, it throws `NotFoundException` and calls neither Stripe nor any deletion.
   - With `stripeCustomerId`, it calls `cancelAllSubscriptionsForCustomer('cus_x')` **before** `cvDocument.findMany`, `r2.delete`, `prisma.user.delete` and `deleteUser`. Check the order with `mock.invocationCallOrder`.
   - With no subscription row, or `stripeCustomerId: null`, it doesn't call Stripe and the deletion completes.
   - If Stripe rejects, it throws `InternalServerErrorException('Failed to delete account.')` and calls none of `findMany`, `r2.delete`, `user.delete` or `deleteUser`.
   - If Stripe resolves (this covers the `resource_missing` path, which resolves inside `StripeService`), the full deletion runs.

## Step 6 — Frontend: Settings confirm dialog

**File:** `apps/opticv-web/src/app/features/settings/settings.ts` (modify)

1. Add a `readonly hasActivePaidSubscription = computed<boolean>(...)` next to the other subscription computeds:
   - Read `this.userProfile.value()?.subscription`.
   - Return `true` only when the subscription exists, `tier !== 'FREE'`, and `status` is `'ACTIVE'`, `'TRIALING'` or `'PAST_DUE'`. Return `false` for anything else, including an unloaded or `null` profile or subscription.
2. In `onDeleteAccount()`, build the `message` from the existing base sentence. Append `' Your paid subscription will be canceled immediately and will not renew.'` only when `this.hasActivePaidSubscription()` is `true`.
3. No other changes to `onDeleteAccount()` or its error and success handling.

## Step 7 — Frontend: Settings unit tests

**File:** `apps/opticv-web/src/app/features/settings/settings.spec.ts` (modify)

In `describe('onDeleteAccount')`, add tests that read `confirmSpy.mock.calls[0][0].message`:

- `PRO` + `ACTIVE`, `BASIC` + `TRIALING` and `PRO` + `PAST_DUE` each contain the cancellation sentence. Use `it.each` or separate cases.
- `PRO` + `ACTIVE` with `cancelAtPeriodEnd: true` contains the sentence.
- `FREE` + `ACTIVE`, `PRO` + `CANCELED`, `subscription: null`, and a profile that hasn't loaded do not contain it, but still contain the base sentence.

Existing `onDeleteAccount` tests stay unchanged.

## Step 8 — Frontend: Terms of Use

**File:** `apps/opticv-web/src/app/features/legal/terms-of-use/terms-of-use.html` (modify)

1. In §15 "By you", replace *"If you have a paid plan, please cancel it in Settings → Manage billing before deleting your account."* with the final text from "Decisions" above.
2. Change `Last updated: 16 October 2026` to `Last updated: 20 October 2026`.
3. Leave §16 and all other sections unchanged.

**File:** `apps/opticv-web/src/app/features/legal/terms-of-use/terms-of-use.spec.ts`. No change expected, because it doesn't assert the changed text. Confirm by running the tests.

## Step 9 — Verification

1. `npm exec nx run-many -t lint typecheck test -p opticv-be opticv-web`
2. `npm exec nx run-many -t build -p opticv-be opticv-web`
3. `npm exec nx format:check`
4. Manual check (Stripe test mode, `stripe listen` forwarding to the dev backend):
   - Paid user → Settings → Delete account. The dialog shows the cancellation sentence. After confirming, the subscription is `canceled` in the Stripe Dashboard with no proration invoice. The backend logs a "no subscription row found" warning for the `customer.subscription.deleted` webhook.
   - Free user → the dialog has no cancellation sentence and deletion works as before.

## Files

| File | Action |
| --- | --- |
| `apps/opticv-be/src/app/stripe/stripe.service.ts` | Modify |
| `apps/opticv-be/src/app/stripe/stripe.service.spec.ts` | Modify |
| `apps/opticv-be/src/app/users/users.service.ts` | Modify |
| `apps/opticv-be/src/app/users/users.service.spec.ts` | Modify |
| `apps/opticv-be/src/app/users/users.module.ts` | Modify |
| `apps/opticv-be/src/app/auth/auth.module.ts` | Modify |
| `apps/opticv-web/src/app/features/settings/settings.ts` | Modify |
| `apps/opticv-web/src/app/features/settings/settings.spec.ts` | Modify |
| `apps/opticv-web/src/app/features/legal/terms-of-use/terms-of-use.html` | Modify |
