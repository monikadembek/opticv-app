# Implementation Done — Task 87: User Notifications

## Summary

Backend: added a `Notification` Prisma model (1:1 with `User`), a migration for the `notifications` table, a `PATCH /api/users/me/notifications` endpoint (guarded by `SupabaseGuard`, validated via `UpdateNotificationPreferenceDto`), and extended `UsersService.getProfile` / `updateDisplayName` / new `updateNotificationPreference` to include/upsert notification preferences. Shared `NotificationType` / `NotificationPreferences` types were added to `@opticv/datatypes` and `UserProfile` was extended with a `notifications` field. Frontend: `UserSettingsApiService` gained `updateNotificationPreference`, and `settings.ts` / `settings.html` wire the existing "Product updates" / "Job-search tips" toggle switches to call it on click, syncing from the loaded profile and reverting with an error toast on failure. Unit tests were added/extended on both backend and frontend covering the new behavior.

---

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| New Prisma model `Notification` (table `notifications`), 1:1 to `User` via unique `userId` FK, `productUpdatesEnabled` / `weeklyTipsEnabled` booleans | Implemented | `schema.prisma` |
| Prisma migration for the new table | Implemented | `migrations/20260715143946_add_notifications/migration.sql` |
| Shared type `NotificationPreferences` (`{ productUpdatesEnabled, weeklyTipsEnabled }`) | Implemented | `datatypes.ts` |
| Shared type `NotificationType` (`'PRODUCT_UPDATES' \| 'WEEKLY_TIPS'`) | Implemented | `datatypes.ts` |
| `UserProfile` extended with `notifications: NotificationPreferences` | Implemented | `datatypes.ts` |
| `PATCH /api/users/me/notifications` endpoint, guarded by `SupabaseGuard`, accepts `{ type, enabled }`, updates one preference, returns `UserProfile` | Implemented | `users.controller.ts`, `users.service.ts` |
| `GET /api/users/me` includes `notifications`, upserting a default row if none exists | Implemented | `users.service.ts` (`getProfile` via `ensureNotificationPreferences`) |
| Frontend `UserSettingsApiService.updateNotificationPreference(type, enabled)` | Implemented | `user-settings-api.service.ts` |
| `settings.ts` — toggle signals initialized from `UserProfile.notifications` via existing profile-sync `effect()` | Implemented | `settings.ts` |
| `settings.ts` — toggle handlers call `updateNotificationPreference` immediately on click, revert + error toast (`MessageService`) on failure | Implemented | `settings.ts` (`onNotificationToggle`) |
| `settings.html` — toggle switches bound to new handler | Implemented | `settings.html` |
| Unit tests: `UsersService` (`getProfile`, `updateNotificationPreference`) | Implemented | `users.service.spec.ts` |
| Unit tests: `UsersController` (`updateNotificationPreference`) | Implemented | `users.controller.spec.ts` |
| Unit tests: DTO validation | Implemented | `update-notification-preference.dto.spec.ts` |
| Unit tests: `settings.spec.ts` (sync from profile, toggle success/error/revert) | Implemented | `settings.spec.ts` |
| Unit tests: `user-settings-api.service.spec.ts` | Implemented | `user-settings-api.service.spec.ts` |

---

## Files

### Created

- `apps/opticv-be/prisma/migrations/20260715143946_add_notifications/migration.sql`
- `apps/opticv-be/src/app/users/dto/update-notification-preference.dto.ts`
- `apps/opticv-be/src/app/users/dto/update-notification-preference.dto.spec.ts`

### Modified

- `apps/opticv-be/prisma/schema.prisma`
- `apps/opticv-be/src/app/users/dto/user-profile.dto.ts`
- `apps/opticv-be/src/app/users/users.controller.ts`
- `apps/opticv-be/src/app/users/users.controller.spec.ts`
- `apps/opticv-be/src/app/users/users.service.ts`
- `apps/opticv-be/src/app/users/users.service.spec.ts`
- `apps/opticv-web/src/app/core/services/user-settings-api.service.ts`
- `apps/opticv-web/src/app/core/services/user-settings-api.service.spec.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `packages/shared/datatypes/src/lib/datatypes.ts`
- `docs/tasks-list.md`

---

## Components

| Component | Status |
| --- | --- |
| `NotificationPreferencesDto` (nested DTO on `UserProfileDto`) | Exist |
| `UpdateNotificationPreferenceDto` | Exist |
| `UsersController.updateNotificationPreference` endpoint | Exist |
| `UsersService.updateNotificationPreference` method | Exist |
| `UsersService.ensureNotificationPreferences` (private helper) | Exist |
| `UserSettingsApiService.updateNotificationPreference` method | Exist |
| `Settings.onNotificationToggle` handler | Exist |

---

## Stores

Not applicable — no NgRx Signal Store was specified or required for this task; state is held in component-local signals (`productUpdatesEnabled`, `weeklyTipsEnabled`) as specified.

---

## Deviations

- `UsersService.updateNotificationPreference` (`users.service.ts`) reuses the `subscription` object from the initial `findUnique` call (made before the notification upsert) to build the returned `UserProfile`, rather than re-fetching `subscription` via a second `findUnique` after the upsert as described in the plan's Step 4.
- `UsersService.getProfile` and `updateDisplayName` both call a shared private helper `ensureNotificationPreferences(userId)` to upsert/read the notification row, as specified in the plan's Step 4 note about extracting a helper to avoid duplicating upsert logic. `updateNotificationPreference` does not use this helper — it performs its own inline `prisma.notification.upsert` call with the specific field set, since its create/update payload shape differs from the helper's no-op default upsert.

---

## Additional Implementation

None.
