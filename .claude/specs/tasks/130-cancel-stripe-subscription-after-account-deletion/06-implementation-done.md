# Implementation Done — Task 130: Cancel Stripe subscription on account deletion

Commits covered: `1de03d7` (implementation) and `8463f9d` (code review fixes). Diff range: `git diff HEAD~2 HEAD`.

Preconditions:

| Input | State |
| --- | --- |
| `02-spec.md` | Present |
| `03-spec-review.md` | Present. Result: **PASS** |
| `04-implementation-plan.md` | Present |

## Summary

Deleting an account now cancels the user's Stripe subscriptions first.

- **Backend.** `StripeService.cancelAllSubscriptionsForCustomer()` lists every subscription on the customer (`status: 'all'`, auto-pagination). It cancels each one not in `canceled` / `incomplete_expired` with `prorate: false` and `invoice_now: false`. A `resource_missing` error during listing is logged as a warning and treated as nothing to cancel.
- `UsersService.deleteAccount()` loads `subscription.stripeCustomerId` and calls the new method before R2, DB and Supabase deletion. Any failure is logged and turned into `InternalServerErrorException('Failed to delete account.')`.
- **Module wiring.** `UsersModule` imports `StripeModule`, and the module cycle is resolved with `forwardRef`.
- **Frontend.** The Settings delete-account confirm dialog adds a cancellation sentence for users with an active paid subscription.
- **Terms of Use.** §15 "By you" is reworded and the `Last updated` date is bumped to 20 October 2026.
- Unit tests were added on both sides. The error message that the code review flagged as critical was restored to `'Failed to delete account.'` in the follow-up commit.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| New `StripeService` method that cancels all non-canceled subscriptions of a customer immediately, no proration | Implemented | `cancelAllSubscriptionsForCustomer(stripeCustomerId: string): Promise<void>` |
| List subscriptions with `status: 'all'`, all pages | Implemented | `for await` over `subscriptions.list({ customer, status: 'all', limit: 100 })` |
| Skip `canceled` / `incomplete_expired`, cancel all other statuses | Implemented | `FINAL_STRIPE_SUBSCRIPTION_STATUSES` constant |
| Cancel with `prorate: false`, `invoice_now: false` | Implemented | |
| `resource_missing` on list → warn and continue deletion | Implemented | Tolerated only in the list phase |
| Stripe cancellation runs before R2 / DB / Supabase deletion | Implemented | Placed right after the `NotFoundException` check |
| Skip Stripe when there is no `stripeCustomerId` | Implemented | `user.subscription?.stripeCustomerId` with a truthy check |
| Stripe failure → log user id and customer id, throw `InternalServerErrorException('Failed to delete account.')`, nothing deleted | Implemented | Message restored in `8463f9d` |
| `deleteAccount` `select` widened to `subscription.stripeCustomerId`, no schema change / migration | Implemented | |
| `UsersService` can use `StripeService`, circular dependency resolved | Implemented | `forwardRef` in `users.module.ts` and `auth.module.ts` |
| Existing R2 cleanup, DB delete and Supabase delete steps unchanged | Implemented | |
| Endpoint route, request and response unchanged | Implemented | |
| Dialog sentence shown only for tier ≠ `FREE` and status `ACTIVE` / `TRIALING` / `PAST_DUE` | Implemented | `hasActivePaidSubscription` computed in `settings.ts` |
| Sentence not shown for FREE, CANCELED, missing profile or missing subscription | Implemented | |
| Frontend success and error handling of deletion unchanged | Implemented | |
| Terms §15 "By you" replaced with automatic-cancellation wording | Implemented | Text matches the plan's final wording |
| Terms `Last updated` date updated | Implemented | `20 October 2026` |
| BE test: cancels only non-final subscriptions with `prorate: false` | Implemented | `stripe.service.spec.ts` |
| BE test: no Stripe calls without `stripeCustomerId` | Implemented | `users.service.spec.ts` (`it.each`: no row / null id) |
| BE test: Stripe throws → `InternalServerErrorException`, no R2 / user delete / Supabase delete | Implemented | `users.service.spec.ts` |
| BE test: Stripe cancellation happens before any deletion | Implemented | `invocationCallOrder` assertions |
| BE test: `resource_missing` does not block deletion | Implemented | `stripe.service.spec.ts` (resolves). `users.service.spec.ts` (full deletion on resolve) |
| FE test: notice for paid tier with `ACTIVE` / `TRIALING` / `PAST_DUE` | Implemented | `settings.spec.ts` |
| FE test: notice omitted for FREE, CANCELED, missing profile or subscription | Implemented | `settings.spec.ts` |
| Adjust `terms-of-use.spec.ts` if it asserts changed text | Implemented | No change was needed. The file was not modified |
| Webhook handlers unchanged | Implemented | No changes to webhook handlers |

## Files

### Created

None. Task documents `00-raw-task.md` through `05-code-review.md` and this report are the only new files.

### Modified

| File |
| --- |
| `apps/opticv-be/src/app/stripe/stripe.service.ts` |
| `apps/opticv-be/src/app/stripe/stripe.service.spec.ts` |
| `apps/opticv-be/src/app/users/users.service.ts` |
| `apps/opticv-be/src/app/users/users.service.spec.ts` |
| `apps/opticv-be/src/app/users/users.module.ts` |
| `apps/opticv-be/src/app/auth/auth.module.ts` |
| `apps/opticv-web/src/app/features/settings/settings.ts` |
| `apps/opticv-web/src/app/features/settings/settings.spec.ts` |
| `apps/opticv-web/src/app/features/legal/terms-of-use/terms-of-use.html` |
| `CLAUDE.md` |
| `docs/tasks-list.md` |

## Components

| Component | State |
| --- | --- |
| `Settings` (`settings.ts`): `hasActivePaidSubscription` computed and conditional dialog message | Exist |
| `TermsOfUse` template (`terms-of-use.html`): updated §15 and date | Exist |
| `StripeService.cancelAllSubscriptionsForCustomer` (BE) | Exist |
| `UsersService.deleteAccount` Stripe step (BE) | Exist |

## Stores

The plan defines no stores.

## Deviations

1. **`auth.module.ts` exports.** The plan said "Keep `exports` as is". The implementation also wraps the `UsersModule` re-export as `forwardRef(() => UsersModule)` in `exports`.
2. **`stripe.service.spec.ts` list-error case.** The plan listed "generic `Error` or `StripeAPIError`". The test uses only `StripeAPIError`.
3. **`users.service.ts`.** The `currentPeriodEnd` expression in the profile mapping was reflowed to a single line. This formatting-only change is outside `deleteAccount`.
4. **`settings.ts` message construction.** The first commit used a ternary with two full strings. After review it was changed to append the notice to the base message, as the plan describes.
5. **`users.service.ts` error message.** The first commit used `'Failed to delete account because cancelling Stripe subscriptions failed.'`. It was changed to the planned `'Failed to delete account.'` in `8463f9d`.

## Additional Implementation

Additional implementation not covered by the original documents:

- `CLAUDE.md`: the "Run a single test file" example was changed from `-- --testFile=path/to/spec.ts` to `-- users.service.spec`, a Jest regex pattern.
- `docs/tasks-list.md`: the task 130 entry status changed to `in progress`, with a time stamp and two lines of description.
