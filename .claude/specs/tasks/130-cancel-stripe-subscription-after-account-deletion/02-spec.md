# Task Specification

## Source

Azure DevOps Task: 130 — Automatically cancel Stripe subscription when account is deleted

## Goal

When a user deletes their account, cancel every Stripe subscription they still have, so they are not charged after the account is gone.

- Cancel all non-canceled subscriptions on the user's Stripe customer **immediately**, with **no proration refund**.
- Cancel in Stripe **before** deleting anything. If the cancellation fails, abort the deletion. Nothing is deleted and the user gets an error and can retry.
- Update the user-facing text: the delete-account confirm dialog and Terms of Use §15 must say the subscription is canceled automatically.

## Context

- **Backend: account deletion.** `apps/opticv-be/src/app/users/users.service.ts`, `deleteAccount(supabaseId)`:
  1. Looks up the `User` (only `id` today).
  2. Deletes R2 objects for all `CvDocument`s. Each failure is logged and skipped.
  3. `prisma.user.delete()` deletes the user. `Subscription` and other relations cascade (`onDelete: Cascade`).
  4. Deletes the Supabase auth user with the service-role client. On error it throws `InternalServerErrorException('Failed to delete account.')`.
  - It never calls Stripe, so the subscription keeps renewing. This is the bug.
- **Backend: Stripe.** `apps/opticv-be/src/app/stripe/stripe.service.ts` (`StripeService`, exported from `StripeModule`):
  - Holds the `Stripe` client (`apiVersion: '2026-07-29.dahlia'`). It already does checkout, the billing portal and webhook handlers.
  - `handleSubscriptionDeleted` (`customer.subscription.deleted` webhook) looks up the `Subscription` row by `stripeCustomerId`. If no row exists, it logs a warning and returns.
- **DB.** In `Subscription` (`schema.prisma`), `stripeCustomerId` and `stripeSubscriptionId` are nullable and unique. A user who never started checkout has no `stripeCustomerId`.
- **Module wiring.** `UsersModule` does not import `StripeModule`. There is a dependency cycle risk: `StripeModule → AuthModule → UsersModule`. If `UsersModule` imports `StripeModule`, that closes a cycle.
- **Frontend.** `apps/opticv-web/src/app/features/settings/settings.ts`, `onDeleteAccount()`: opens a PrimeNG confirm dialog with the message *"This will permanently delete your account and all associated data. This action cannot be undone."* On error it shows a toast with `err.error.message` and falls back to a generic message.
- **Terms of Use.** `apps/opticv-web/src/app/features/legal/terms-of-use/terms-of-use.html`, §15 "Ending the agreement", "By you" currently says: *"If you have a paid plan, please cancel it in Settings → Manage billing before deleting your account."* The page header shows `Last updated: 16 October 2026`.

## Scope

### In scope

- `StripeService`: a new public method that cancels all of a customer's non-canceled subscriptions immediately, with no proration.
- `UsersService.deleteAccount()`: call that method first, before R2, DB and Supabase deletion, when the user has a `stripeCustomerId`.
- Module wiring so `UsersService` can use `StripeService`, with the circular dependency resolved.
- Settings confirm dialog: add a sentence saying the paid subscription is canceled immediately. Show it **only** to users with an active paid subscription (see Behavior step 1).
- Terms of Use §15: replace the "please cancel first" sentence with wording that says deletion cancels the subscription automatically. Update the `Last updated` date.
- Unit tests:
  - BE: `stripe.service.spec.ts` for the new method, and `users.service.spec.ts` for `deleteAccount` ordering and failure.
  - FE: adjust `settings.spec.ts` / `terms-of-use.spec.ts` if they assert the changed text.

### Out of scope

- Refunds of any kind. 14-day withdrawal refunds stay a manual process.
- Deleting the Stripe customer object.
- Changes to webhook handlers.
- Making the whole deletion transactional or compensating across R2, DB and Supabase. Only the Stripe step is added, in front of the existing steps.
- Privacy Policy changes.
- Any other Terms sections, for example §16, which mentions "delete your account and cancel your subscription". That wording is still accurate.

## Behavior

1. The user clicks **Delete account** in Settings. The confirm dialog shows the existing message. For a user with an active paid subscription, it adds a sentence along the lines of: *"Your paid subscription will be canceled immediately and will not renew."*
   - The sentence is shown only when the loaded profile (`userProfile.value()?.subscription`) has `tier` other than `FREE` and `status` other than `CANCELED`, so `ACTIVE`, `TRIALING` or `PAST_DUE`.
   - It is not shown for free users, for canceled subscriptions, or when the profile or subscription is not loaded (`null` / `undefined`).
   - The condition is used only for the dialog text. The backend cancels subscriptions no matter what the frontend shows (Behavior step 4).
2. The user confirms. The frontend calls the existing delete-account endpoint with no API change.
3. The backend loads the user together with `subscription.stripeCustomerId`.
4. If `stripeCustomerId` is set:
   1. List all subscriptions for that customer in Stripe (`status: 'all'`, all pages).
   2. For each subscription whose status is not `canceled` or `incomplete_expired`, cancel it immediately. Use `subscriptions.cancel` with `prorate: false` and `invoice_now: false`.
   3. If any Stripe call throws, log the error with the user id and customer id, and throw `InternalServerErrorException('Failed to delete account.')`. No R2 objects, DB rows or Supabase user are deleted.
5. If `stripeCustomerId` is not set (a free user who never checked out), skip step 4.
6. The existing steps run unchanged: R2 cleanup, DB user delete, Supabase auth user delete.
7. The frontend's success and error handling is unchanged. It signs out and redirects to `/login` on success, and shows a toast on error.
8. Stripe then sends `customer.subscription.deleted` webhooks. If the DB row is already gone, the existing handler logs a "no subscription row found" warning and returns. This is acceptable.

## Edge Cases

- **No Stripe customer.** No Stripe calls are made and deletion goes ahead as today.
- **Customer exists but has no subscriptions, or all are canceled.** Nothing is canceled and deletion goes ahead.
- **Subscription already set to cancel at period end** (`cancelAtPeriodEnd = true`). It is still canceled immediately, because it is not yet in `canceled` status.
- **Subscription in Stripe that the DB never recorded** (missed webhook). It is caught because the code lists by customer, not by the stored `stripeSubscriptionId`.
- **Several active subscriptions.** All are canceled. If one fails partway, deletion is aborted. The ones already canceled stay canceled, and a retry skips them because their status is now `canceled`.
- **Stripe reports the customer was deleted or doesn't exist** (`resource_missing` on list). This is treated as having nothing to cancel, so it is logged as a warning and deletion goes ahead. A customer removed in Stripe cannot be charged.
- **Stripe outage or network error.** Deletion is aborted with a 500 and the user can retry.
- **Stripe cancellation succeeds, then a later deletion step fails.** The subscription stays canceled and the 500 is returned as today (see Assumptions).
- **Webhook arrives after the user row is deleted.** It is already handled with a warning log, as in Behavior step 8.

## Data / API

- **Endpoints:** no change. The delete-account endpoint keeps its route, request and response, and failures still return 500 with `'Failed to delete account.'`.
- **New method:** `StripeService.cancelAllSubscriptionsForCustomer(stripeCustomerId: string): Promise<void>`. The name is a suggestion.
- **Module:** `UsersModule` must get access to `StripeService`. The cycle (`UsersModule → StripeModule → AuthModule → UsersModule`) has to be resolved. The usual NestJS way is `forwardRef(() => StripeModule)` / `forwardRef(() => AuthModule)` on the cyclic imports. The final choice is left to the implementation plan.
- **DB:** no schema changes and no migration. `deleteAccount` only widens its `select` to include `subscription.stripeCustomerId`.
- **Shared types (`@opticv/datatypes`):** no change.

## Assumptions

- "Immediately, no refund" means `prorate: false` and `invoice_now: false` on `subscriptions.cancel`. No credit notes and no refunds are issued.
- Subscriptions in `canceled` or `incomplete_expired` status are final and skipped. Every other status (`active`, `trialing`, `past_due`, `unpaid`, `incomplete`, `paused`) is canceled.
- Changing the Terms makes them more favorable to the user. A `Last updated` date bump is enough, and the 14-day advance notice in §16 does not apply.
- If Stripe reports that the customer no longer exists (`resource_missing` when listing subscriptions), there is nothing left to cancel. It is logged as a warning and deletion goes ahead. This is the one deliberate exception to "abort deletion on any Stripe failure", because a customer removed from Stripe cannot be charged.
- If Stripe cancellation succeeds but a later step fails (`prisma.user.delete` or the Supabase admin delete throws 500), the subscription stays canceled and is not restored. The user loses the paid plan but may still have an account. They can retry the deletion, and the retry skips the already-canceled subscriptions. Any `Subscription` row that remains is downgraded to FREE by the existing `customer.subscription.deleted` webhook. This is accepted, because the user explicitly asked for their account to be deleted.
- "Paid or active subscription", the condition for the dialog sentence, means a paid tier (`BASIC` / `PRO`) with status `ACTIVE`, `TRIALING` or `PAST_DUE`. Free users also have status `ACTIVE`, so status alone isn't enough.
- A subscription set to cancel at period end (`cancelAtPeriodEnd = true`) still counts as active for the dialog, because it is canceled immediately anyway.
- The final wording of the dialog and Terms sentences may be refined during implementation, but must keep the meaning above.

## Acceptance (DEV)

- `npm exec nx run-many -t lint typecheck test build` passes for `opticv-be` and `opticv-web`.
- BE tests cover:
  - Cancels only non-final subscriptions, with `prorate: false`.
  - No Stripe calls when there is no `stripeCustomerId`.
  - When Stripe throws, `deleteAccount` throws `InternalServerErrorException` and does not call R2, `prisma.user.delete` or the Supabase admin delete.
  - Stripe cancellation happens before any deletion.
  - `resource_missing` on the customer does not block deletion.
- FE tests (`settings.spec.ts`) cover:
  - The confirm message includes the cancellation sentence for a paid tier with status `ACTIVE`, `TRIALING` or `PAST_DUE`.
  - It omits the sentence for a `FREE` tier, for status `CANCELED`, and for a missing profile or subscription.
- The Terms §15 text is updated, and related tests pass.
- No breaking API changes and no DB migration.
