# Task Specification

## Source

Azure DevOps Task: 128 — Turn "Product updates" emails off by default

## Goal

Make every promotional email preference opt-in (off by default) to comply with Polish law. Polish law requires prior consent for commercial communication sent by email.

- Change the default of `Notification.productUpdatesEnabled` from `true` to `false`.
- Make the Settings page show the "Product updates" toggle as off until the user's real preference has loaded.

`weeklyTipsEnabled` ("Job-search tips") already defaults to `false`. It stays unchanged.

## Context

- **DB / Prisma:** the `Notification` model in `apps/opticv-be/prisma/schema.prisma` (table `notifications`) has two flags:
  - `productUpdatesEnabled Boolean @default(true)`: the flag this task fixes.
  - `weeklyTipsEnabled Boolean @default(false)`: already opt-in.
- **Backend:** `apps/opticv-be/src/app/users/users.service.ts`
  - `ensureNotificationPreferences(userId)` creates the user's `Notification` row lazily (`upsert` with `create: { userId }`) the first time the profile is read, so the new row gets the schema defaults.
  - `updateNotificationPreference()` upserts a single flag from `PATCH` with `{ type: 'PRODUCT_UPDATES' | 'WEEKLY_TIPS', enabled }`.
- **Frontend:** `apps/opticv-web/src/app/features/settings/settings.ts`
  - `productUpdatesEnabled = signal(true)` is the initial value before the profile loads. It is later overwritten from `profile.notifications`.
  - `settings.html` renders the "Product updates" and "Job-search tips" toggles in the Notifications section.
- **Email sending:** the codebase does not send promotional emails yet. So this task only fixes the stored consent state and the defaults.
- **Privacy policy** (`features/legal/privacy-policy/privacy-policy.html`) already says these emails are sent based on consent (Art. 6(1)(a)). No change is needed.

## Scope

### In scope

- Prisma schema: `productUpdatesEnabled Boolean @default(false)`.
- A new Prisma migration that changes the column default: `ALTER TABLE "notifications" ALTER COLUMN "productUpdatesEnabled" SET DEFAULT false;`
- Frontend: change the initial `productUpdatesEnabled` signal value in `settings.ts` to `false`.
- Update the existing unit tests (BE `users.service.spec.ts`, FE `settings.spec.ts`) where they assume `true` as the default or newly created value. Add or adjust tests for the new defaults.

### Out of scope

- Resetting existing `productUpdatesEnabled = true` rows. This was originally planned but dropped: the app isn't in production yet and the database holds only a few test users.
- A consent audit trail (consent timestamps, consent log, consent source). Track it as a separate task.
- Sending promotional emails or unsubscribe links.
- Changes to the `weeklyTipsEnabled` default, which is already `false`.
- Changes to privacy policy wording, toggle labels or descriptions.
- Changes to the `PATCH` notification preference endpoint contract.

## Behavior

1. **New user:** the first profile read lazily creates the `Notification` row with `productUpdatesEnabled = false` and `weeklyTipsEnabled = false`. The Settings page shows both toggles off.
2. **Existing user (after the migration is deployed):** both stored values stay as they are. Only rows created after the migration get the new `false` default.
3. **Opt-in:** the user turns on "Product updates" in Settings. `PATCH` stores `true`, and the value persists across reloads. This works the same as today.
4. **Opt-out:** turning the toggle off stores `false`. This works the same as today.
5. **Settings page loading:** before the profile response arrives, the "Product updates" toggle shows as off (`false`). It never briefly shows as on before the data arrives.
6. **Preference update fails:** the existing behavior stays (revert to the previous value and show an error toast).

## Edge Cases

- **User without a `Notification` row** at migration time: their row is created later with the new `false` default.
- **Existing test users with `productUpdatesEnabled = true`:** they keep `true`. If needed, the value can be switched off manually in Settings.
- **`updateNotificationPreference` creating a row** (an `upsert` create branch for `WEEKLY_TIPS`): the field that isn't set falls back to the new `false` default for `productUpdatesEnabled`.
- **Re-running the migration / migrating a fresh DB:** the statement is idempotent and safe on an empty table.
- **Staging/production:** the migration is applied with `npm run prisma:migrate:staging` / `prisma:migrate:production` (`migrate deploy`).

## Data / API

- **Endpoints:** no changes. `GET` profile and `PATCH` notification preference keep their current contracts.
- **Models / shared types:** `NotificationPreferences` in `@opticv/datatypes` doesn't change (it's still two booleans).
- **DB changes:**
  - `schema.prisma`: `productUpdatesEnabled Boolean @default(false)`.
  - A new migration in `apps/opticv-be/prisma/migrations/<timestamp>_product_updates_opt_in/migration.sql` containing only the `ALTER COLUMN ... SET DEFAULT false` statement above.
  - Regenerate the Prisma client (`npm exec prisma generate` from `apps/opticv-be`).

## Assumptions

- "Promotional emails" means exactly the two existing preference types, `PRODUCT_UPDATES` and `WEEKLY_TIPS`. No other email categories exist in the codebase.
- The app isn't in production yet and the database holds only test users, so existing rows don't need a data migration.

## Acceptance (DEV)

- `npm exec nx build opticv-be` and `npm exec nx build opticv-web` pass.
- `npm exec nx lint` / `typecheck` pass for both apps.
- The migration applies cleanly and the column default is `false`.
- A newly created `Notification` row has `productUpdatesEnabled = false` and `weeklyTipsEnabled = false`.
- The Settings page shows "Product updates" off for new users and while the profile is loading.
- Turning the toggle on and off still persists correctly.
- Unit tests are updated or added (BE `users.service.spec.ts`, FE `settings.spec.ts`) and all tests pass.
- No breaking API changes.
