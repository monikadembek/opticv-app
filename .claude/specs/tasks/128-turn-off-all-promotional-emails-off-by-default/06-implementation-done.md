# Implementation Done — Task 128: Turn all promotional emails off by default

Delivered in commits `32b5f90` and `1574a13` on branch `128-turn-off-all-promotional-emails-by-default` (base `10fed38`).

## Summary

The `productUpdatesEnabled` notification preference now defaults to `false` in the Prisma schema and in a new migration that changes the column default. `weeklyTipsEnabled` stays `false`, so both promotional email preferences are opt-in. The Settings page initializes the "Product updates" toggle to `false` before the user profile loads. Unit tests for the default values are updated in the backend and frontend. Existing database rows aren't modified, following the revised spec.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Prisma schema: `productUpdatesEnabled Boolean @default(false)` | Implemented | `apps/opticv-be/prisma/schema.prisma` |
| New migration that changes the column default to `false` | Implemented | `20261019114230_product_updates_opt_in/migration.sql` |
| No reset of existing `productUpdatesEnabled = true` rows | Implemented | The migration contains no `UPDATE` statement |
| `weeklyTipsEnabled` default unchanged (`false`) | Implemented | Unchanged in the schema |
| New user gets both preferences `false` | Implemented | Via the schema default; `ensureNotificationPreferences` unchanged |
| Settings "Product updates" toggle off before the profile loads | Implemented | `settings.ts`: `productUpdatesEnabled = signal(false)` |
| Opt-in / opt-out persists; error revert unchanged | Implemented | `onNotificationToggle` and the PATCH endpoint unchanged |
| BE unit test updated for a newly created default row | Implemented | `users.service.spec.ts`, `getProfile` default-row test |
| FE unit test updated for the initial default | Implemented | `settings.spec.ts`, "defaults Product updates to disabled" |
| No API or shared-type changes | Implemented | `@opticv/datatypes`, DTOs and controller unchanged |
| Prisma client regenerated | Implemented | Run by the user with `prisma migrate deploy` + `prisma generate`; the generated client is gitignored |

## Files

### Created

- `apps/opticv-be/prisma/migrations/20261019114230_product_updates_opt_in/migration.sql`
- `.claude/specs/tasks/128-turn-off-all-promotional-emails-off-by-default/00-raw-task.md`
- `.claude/specs/tasks/128-turn-off-all-promotional-emails-off-by-default/02-spec.md`
- `.claude/specs/tasks/128-turn-off-all-promotional-emails-off-by-default/03-spec-review.md`
- `.claude/specs/tasks/128-turn-off-all-promotional-emails-off-by-default/04-implementation-plan.md`
- `.claude/specs/tasks/128-turn-off-all-promotional-emails-off-by-default/05-code-review.md` (not yet committed)
- `.claude/specs/tasks/128-turn-off-all-promotional-emails-off-by-default/06-implementation-done.md` (this file, not yet committed)

### Modified

- `apps/opticv-be/prisma/schema.prisma`
- `apps/opticv-be/src/app/users/users.service.spec.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
- `apps/opticv-be/src/app/stripe/stripe.service.spec.ts`
- `docs/tasks-list.md`

## Components

| Component (from plan) | Status |
| --- | --- |
| `Settings` (`apps/opticv-web/src/app/features/settings/settings.ts`) — modified, not new | Exist |

## Stores

No stores in the plan.

## Deviations

1. The migration SQL was written by hand instead of being generated with `prisma migrate dev --create-only`. The user applied it with `prisma migrate deploy`, because the shared development database contains schema changes from the unmerged branch `117-cv-builder`, and because migration `20261015120000_enable_rls` fails on the shadow database used by `migrate dev`.
2. The data reset (`UPDATE ... SET false`) from the original spec and plan was removed. The spec and plan were then revised to match: the app isn't in production yet and the database holds only test users.
3. Prettier reformatted lines in `users.service.spec.ts` outside the planned test (`mockUser`, the `upsertUser` idempotency test, the `updateDisplayName` expectation). These are formatting-only changes.
4. The migration file has no trailing newline.

## Additional Implementation

> Additional implementation not covered by the original documents.

- `apps/opticv-be/src/app/stripe/stripe.service.spec.ts` (commit `1574a13`): the checkout `terms_of_service_acceptance` message regex was updated from `/terms` and `/privacy` to `/terms-of-use` and `/privacy-policy`. The test was failing before this task started.
- `docs/tasks-list.md`: the task 128 entry was updated with its status (`in progress`), a time range, an implementation summary, and a note about adding unsubscribe links when promotional emails are prepared.
