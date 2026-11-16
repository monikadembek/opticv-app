# Code Review — Task 130: Cancel Stripe subscription on account deletion

Reviewed commit: `1de03d7` (`git diff HEAD~1 HEAD`)

Checks run during review:

| Check | Result |
| --- | --- |
| `nx test opticv-be` (`users.service.spec`, `stripe.service.spec`) | **FAIL**: 1 failed, 53 passed |
| `nx test opticv-web` (`settings.spec`, `terms-of-use.spec`) | PASS (71 tests) |
| `nx run-many -t lint typecheck` (opticv-be, opticv-web) | PASS. No errors, and no warnings in the changed files |
| `prettier --check` on the changed app files | PASS |
| Backend bootstrap with the new `forwardRef` wiring (plan Step 2) | Not verified in this review |

### Summary

- Overall result: **FAIL**
- The Stripe cancellation logic, ordering, `resource_missing` handling, module wiring and frontend dialog/Terms changes match the spec and plan, and are well tested. However, `UsersService.deleteAccount` throws a different error message than the spec requires (`'Failed to delete account.'`). This breaks the spec's "Endpoints: no change" contract and makes the backend unit test suite fail. That fails the DEV acceptance criterion "`lint typecheck test build` passes". It is a one-line fix.

### Conventions Violations

#### Critical (must fix before merge)

1. **`apps/opticv-be/src/app/users/users.service.ts:254-256`**: the Stripe failure path throws `new InternalServerErrorException('Failed to delete account because cancelling Stripe subscriptions failed.')`.
   - Spec §Behavior 4.3 and §Data/API require exactly `'Failed to delete account.'` ("failures still return 500 with `'Failed to delete account.'`"). Plan Step 3 requires it too.
   - Consequence: `users.service.spec.ts:618-620` (`deleteAccount › aborts the deletion when Stripe cancellation fails`) fails:
     ```
     Expected message: "Failed to delete account."
     Received message: "Failed to delete account because cancelling Stripe subscriptions failed."
     ```
   - The frontend shows `err.error.message` in the toast, so this internal detail would also reach users. It also uses British "cancelling", while the rest of the change uses "canceled".

#### Non-Critical (should fix)

1. **`apps/opticv-web/src/app/features/settings/settings.ts:202-204`**: the base sentence *"This will permanently delete your account… cannot be undone."* is written out twice, once in each branch of the ternary. Plan Step 6.2 says to build the message from the base sentence and *append* the notice. Duplicating it makes the two branches easy to let drift apart.
2. **`apps/opticv-be/src/app/users/users.service.ts:128-129`**: the `currentPeriodEnd` expression in `updateNotificationPreferences`/profile mapping was reformatted, which is unrelated to this task (minimal-footprint rule). It's harmless because it's a Prettier-only reflow, but it adds noise to the diff.
3. **`docs/tasks-list.md`** (task 130): status is set to `in progress`. The new description lines have typos: "subscriprions", and "abort deleting account without cancelling the subscriptions first" reads ambiguously. Docs only.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| New `StripeService` method that cancels all non-canceled subscriptions immediately, no proration | Covered | `stripe.service.ts:139-176`. `prorate: false`, `invoice_now: false` |
| List with `status: 'all'`, all pages | Covered | `for await` auto-pagination, `limit: 100` |
| Skip `canceled` / `incomplete_expired`, cancel all other statuses | Covered | `FINAL_STRIPE_SUBSCRIPTION_STATUSES` (`stripe.service.ts:25-26`) |
| `resource_missing` on list → warn and continue deletion | Covered | Only the list phase tolerates it. A `resource_missing` from cancel is rethrown, as the plan decided |
| Stripe step runs before R2 / DB / Supabase deletion | Covered | `users.service.ts:244-258`. Order checked via `invocationCallOrder` |
| Skip Stripe when there's no `stripeCustomerId` (null subscription or null id) | Covered | Optional chaining plus a truthy check |
| Any Stripe failure → log with user id and customer id, abort, nothing deleted | Covered | Logging and abort are correct. Tested |
| Failure returns 500 with `'Failed to delete account.'` (no API change) | **Missing** | Message changed. See Critical 1 |
| `select` widened to `subscription.stripeCustomerId`, no schema change | Covered | `users.service.ts:234-237` |
| Module wiring with the cycle resolved | Covered | `forwardRef` in `users.module.ts:20` and `auth.module.ts:7,12`. Bootstrap not verified in this review |
| Dialog sentence only for paid tier + `ACTIVE`/`TRIALING`/`PAST_DUE` | Covered | `settings.ts:143-150` (`hasActivePaidSubscription`) |
| No sentence for FREE, CANCELED, null subscription or unloaded profile | Covered | Tested in `settings.spec.ts` |
| Paid subscription with `cancelAtPeriodEnd` still shows the sentence | Covered | Tested |
| Terms §15 "By you" sentence replaced and `Last updated` bumped | Covered | Wording matches the plan text. Date is `20 October 2026`. §16 unchanged |
| BE tests: only non-final canceled with `prorate: false`; no Stripe calls without a customer; Stripe throws → `InternalServerErrorException` and no deletes; order; `resource_missing` | Partial | All cases exist, but the "Stripe throws" test currently fails (Critical 1) |
| FE tests for the dialog notice | Covered | `settings.spec.ts:1099-1185` |
| `lint typecheck test build` passes | **Missing** | The `opticv-be` test target fails. Build wasn't run in this review |
| No breaking API change / no migration | Partial | No migration. The error message change is an observable API change |

### Plan Deviations

1. **Step 3.3**: the error message differs from the plan's `'Failed to delete account.'` (see Critical 1).
2. **Step 2**: the plan said "Keep `exports` as is" for `AuthModule`. The implementation also wraps the re-export: `exports: [..., forwardRef(() => UsersModule)]` (`auth.module.ts:12`). Nest accepts `ForwardReference` in `exports`, so this works and is arguably needed for consistency. It is still a deviation from the written plan.
3. **Step 6.2**: the message is built as two full literal strings in a ternary, not by appending the notice to the base sentence (see Non-Critical 1).
4. **Step 4**: the plan's case "re-throws other list errors (e.g. generic `Error` or `StripeAPIError`)" is covered only with `StripeAPIError`. No test uses a plain `Error`. This is a minor gap, because the code rethrows everything that isn't `resource_missing`.

### Null Safety Issues

None. `user.subscription?.stripeCustomerId` is guarded with a truthy check before use (`users.service.ts:244-245`). `hasActivePaidSubscription` handles an unloaded profile and a `null` subscription (`settings.ts:144-147`).

### Code Smells

1. **Duplicated literal**: the base delete-account message is repeated in both ternary branches (`settings.ts:203-204`).
2. **Inline magic list**: `['ACTIVE', 'TRIALING', 'PAST_DUE']` in `settings.ts:149` is an untyped inline array. It's acceptable for one use, but a named constant typed against the subscription status type would match the backend's `FINAL_STRIPE_SUBSCRIPTION_STATUSES` style and catch typos at compile time.
3. **Leaky error message**: the 500 message exposes an internal step ("cancelling Stripe subscriptions failed") to the client. The detail belongs in the log, which already has it (`users.service.ts:251-253`).

### Recommendation

- **Fix critical issues before merge.** Restore `'Failed to delete account.'` in `users.service.ts:255`, then re-run `npm exec nx run-many -t lint typecheck test build` for `opticv-be` and `opticv-web`, and the backend bootstrap check from plan Step 2.
