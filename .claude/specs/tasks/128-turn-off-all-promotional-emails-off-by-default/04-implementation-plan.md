# Implementation Plan — Task 128: Turn all promotional emails off by default

## Inputs

- Spec: `02-spec.md`
- Review: `03-spec-review.md` (PASS WITH ISSUES; non-critical issues 1–4 are handled below)

## Overview

| Layer | Change |
| --- | --- |
| DB / Prisma | `productUpdatesEnabled` default `true` → `false`; a new migration changes the column default (no data reset) |
| Backend | No production code change; `ensureNotificationPreferences` already relies on the schema default. Unit test update only |
| Frontend | Initial `productUpdatesEnabled` signal `true` → `false`; unit test update |
| Shared types | None |

---

## Step 1 — Prisma schema

**File:** `apps/opticv-be/prisma/schema.prisma` (modify)

- In `model Notification`, change `productUpdatesEnabled Boolean @default(true)` to `@default(false)`.
- Leave `weeklyTipsEnabled` and everything else unchanged.

## Step 2 — Migration (schema default only)

**File:** `apps/opticv-be/prisma/migrations/<timestamp>_product_updates_opt_in/migration.sql` (create)

The `product_updates_opt_in` name is a suggestion (review issue 4); `<timestamp>` is whatever Prisma generates.

1. The migration contains only `ALTER TABLE "notifications" ALTER COLUMN "productUpdatesEnabled" SET DEFAULT false;`.
2. No data reset: the app isn't in production yet and the database holds only test users. This makes review issues 1 and 3 (adding the `UPDATE` by hand, reversibility) no longer relevant.
3. Apply locally with `npm exec prisma migrate dev`. This also regenerates the Prisma client in `apps/opticv-be/src/generated/prisma/`.
4. Check that `npm exec prisma migrate status` reports everything up to date with no drift.

Staging and production get the migration through the existing `npm run prisma:migrate:staging` / `prisma:migrate:production` scripts during deployment. That isn't part of this implementation step.

## Step 3 — Backend: users service

**File:** `apps/opticv-be/src/app/users/users.service.ts`: **no change**.

- `ensureNotificationPreferences` (`create: { userId }`) picks up the new DB default automatically.
- `updateNotificationPreference` sets only the requested field when it creates a row. The other field falls back to the schema defaults (both now `false`).
- `upsertUser` doesn't touch `Notification` (confirmed), so no other code path writes `true` on creation.

## Step 4 — Backend: unit tests

**File:** `apps/opticv-be/src/app/users/users.service.spec.ts` (modify)

Change only the test that represents a newly created default row. Leave the shared fixture data alone (review issue 2):

- In `describe('getProfile')` → `it('upserts a default notification row and includes it in the profile')`:
  - Add a `mockPrisma.notification.upsert.mockResolvedValueOnce(...)` that returns `{ productUpdatesEnabled: false, weeklyTipsEnabled: false }`, the new defaults.
  - Change the `result.notifications` expectation to `{ productUpdatesEnabled: false, weeklyTipsEnabled: false }`.
  - Keep the existing `toHaveBeenCalledWith({ where, create: { userId }, update: {} })` assertion. It shows that the service doesn't hard-code any flag value and relies on the schema default.
- Don't change the `beforeEach` mock, the `updateDisplayName` expectation, or the other `updateNotificationPreference` tests. They use `true` as ordinary stored data, not as a default.

## Step 5 — Frontend: Settings component

**File:** `apps/opticv-web/src/app/features/settings/settings.ts` (modify)

- Change `readonly productUpdatesEnabled = signal(true);` to `signal(false)`.
- Change nothing else. The `effect` that syncs from `profile.notifications` and `onNotificationToggle` (optimistic update and revert) stay as they are.
- Because the initial value is `false`, both SSR output and the pre-hydration render show the toggle as off until the profile loads (this answers the review's ambiguity about Behavior §5).

**File:** `apps/opticv-web/src/app/features/settings/settings.html`: **no change**.

## Step 6 — Frontend: unit tests

**File:** `apps/opticv-web/src/app/features/settings/settings.spec.ts` (modify)

- In `describe('notifications card')`, rename `it('defaults Product updates to enabled')` to `'defaults Product updates to disabled'` and change the expectation to `toBe(false)`.
- Leave `mockProfile` (`productUpdatesEnabled: true`) and the `onNotificationToggle` tests unchanged. They test syncing and revert from a stored `true` value, which is still a valid state after a user opts in.

**File:** `apps/opticv-web/src/app/features/settings/settings-privacy.spec.ts`: **no change** (fixture data only).

## Step 7 — Verification

Run from the workspace root:

1. `npm exec nx test opticv-be`
2. `npm exec nx test opticv-web`
3. `npm exec nx run-many -t lint`
4. `npm exec nx run-many -t typecheck`
5. `npm exec nx build opticv-be` and `npm exec nx build opticv-web`
6. `npm exec nx format:check` (run `format:write` if needed)
7. Manual check with the dev servers:
   - A newly created user sees both toggles off on `/settings`.
   - Turning "Product updates" on, then reloading, keeps it on. Turning it off, then reloading, keeps it off.

## Acceptance checklist

- [ ] Schema default is `false` for `productUpdatesEnabled`
- [ ] The migration contains only the `ALTER ... SET DEFAULT false`, and `migrate status` is clean
- [ ] FE initial signal is `false`
- [ ] BE and FE unit tests are updated and all tests pass
- [ ] Lint, typecheck, format and builds pass
- [ ] No API or shared-type changes
