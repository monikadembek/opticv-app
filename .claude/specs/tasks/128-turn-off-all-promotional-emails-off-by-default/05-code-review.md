# Code Review — Task 128: Turn all promotional emails off by default

Reviewed range: `10fed38..HEAD` (commits `32b5f90` and `1574a13`) on branch `128-turn-off-all-promotional-emails-by-default`.

### Summary

- Overall result: **PASS WITH ISSUES**
- Justification: The implementation matches the revised spec and plan exactly. The schema default is `false`, the migration contains only the `ALTER ... SET DEFAULT false`, the frontend initial signal is `false`, and the tests that cover default values are updated. No production logic changed apart from the default values, and no conventions are broken. The remaining issues are cosmetic: Prettier reformatting unrelated lines in one test file, and a missing trailing newline in the migration. An incorrect commit message found during review has been fixed.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. ~~**Commit message is incorrect.** It said "set productUpdatesEnabled to **true** by default", but the change sets it to `false`.~~ **Fixed:** the commit was reworded before pushing (`d998f1c` → `32b5f90`) and now says "to false by default".
2. **`apps/opticv-be/prisma/migrations/20261019114230_product_updates_opt_in/migration.sql:2`:** the file has no trailing newline (`\ No newline at end of file`). This is trivial, but it differs from the other migration files.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `productUpdatesEnabled` defaults to `false` in the Prisma schema | Covered | `schema.prisma:116` |
| Migration changes the column default to `false` | Covered | `20261019114230_product_updates_opt_in/migration.sql` |
| No reset of existing rows (revised spec) | Covered | The migration has no `UPDATE` |
| `weeklyTipsEnabled` default unchanged (`false`) | Covered | `schema.prisma:117` untouched |
| Settings toggle is off before the profile loads (including SSR) | Covered | `settings.ts:83` → `signal(false)` |
| Opt-in/opt-out persists; error revert unchanged | Covered | `onNotificationToggle` untouched; existing tests still pass |
| BE unit test for a newly created default row | Covered | `users.service.spec.ts:272-287` mocks and asserts `false`/`false`; still asserts `create: { userId }` (no hard-coded flag) |
| FE unit test for the initial default | Covered | `settings.spec.ts:854-858`. The test reads the signal before `detectChanges`, so it checks the real initial value, not the synced one |
| No API or shared-type changes | Covered | `@opticv/datatypes`, DTOs and controller untouched |

### Plan Deviations

1. **Unrelated reformatting in `apps/opticv-be/src/app/users/users.service.spec.ts`.** Prettier reformatted lines outside the plan's scope: `mockUser` (lines 10-14), the `upsertUser` idempotency test (lines 128-135) and the `updateDisplayName` expectation (lines 221-224). These are formatting-only changes with no change in behavior, but they go beyond Step 4 ("change only the test that represents a newly created default row") and add noise to the diff.
2. **`apps/opticv-be/src/app/stripe/stripe.service.spec.ts:136-138`** (commit `1574a13`) changed outside the plan. It fixes the failing test found during verification by aligning the regex with `/terms-of-use` and `/privacy-policy`. The fix is correct, has its own commit, and doesn't touch task 128 logic.
3. The migration file was written by hand instead of being generated with `migrate dev --create-only`. This is because `migrate dev` can't be used against the shared dev DB. The SQL content matches what the plan expects.

### Null Safety Issues

None.

### Code Smells

None.

### Recommendation

- **Merge as-is.**
