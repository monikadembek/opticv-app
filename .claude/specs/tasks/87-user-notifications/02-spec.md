# Task Specification

## Source

Azure DevOps Task: 87 — Add notifications (BE & FE)

## Goal

Let users persist two notification preferences ("Product updates" and "Job-search tips") from the Account Settings page. Add a `Notification` table related 1:1 to `User`, expose a backend endpoint to update a single preference at a time, include the saved preferences in the user profile response, and wire the existing (currently local-only) toggle switches in the settings page to call the backend on click.

## Context

- Frontend: `apps/opticv-web/src/app/features/settings/` (`settings.ts` / `settings.html`) — the "Notifications" section already renders two `p-toggleswitch` controls (lines 217–252 of `settings.html`) bound to local signals `productUpdatesEnabled` / `weeklyTipsEnabled` in `settings.ts`. These are currently **not persisted** anywhere.
- Backend: `apps/opticv-be/src/app/users/` — `UsersController`, `UsersService`, DTOs in `users/dto/`. Existing pattern to mirror: `PATCH me/display-name` (`UpdateDisplayNameDto` → `UsersService.updateDisplayName`).
- Data access: Prisma 7, schema at `apps/opticv-be/prisma/schema.prisma`. Current user resolution is via `SupabaseGuard` + `@CurrentUser() user: UserModel` (guard attaches `request.user`, service methods key lookups off `user.supabaseId`).
- Shared types: `packages/shared/datatypes/src/lib/datatypes.ts` — `UserProfile` type (currently `id`, `email`, `displayName`, `avatarUrl`, `subscription`) is the precedent for adding a `notifications` field.

## Scope

### In scope

- New Prisma model `Notification` (table name `notifications`), 1:1 relation to `User` via `userId` (unique FK), with `productUpdatesEnabled` and `weeklyTipsEnabled` boolean columns.
- Prisma migration for the new table.
- New shared type `NotificationPreferences` in `@opticv/datatypes` (`{ productUpdatesEnabled: boolean; weeklyTipsEnabled: boolean }`), and extending `UserProfile` with a `notifications: NotificationPreferences` field.
- Backend: `PATCH /api/users/me/notifications` endpoint, guarded by `SupabaseGuard`, accepting `{ type: 'PRODUCT_UPDATES' | 'WEEKLY_TIPS', enabled: boolean }`, updating exactly one preference per call (upserting the `Notification` row on first write), returning the updated `UserProfile`.
- Backend: `GET /api/users/me` (`UsersService.getProfile`) updated to include the user's `notifications` preferences (upserting a default row — both `true`/`false` per current UI defaults — if none exists yet, so existing users without a row don't 404/break).
- Frontend: `UserSettingsApiService` — new `updateNotificationPreference(type, enabled)` method calling the new endpoint.
- Frontend: `settings.ts` — `productUpdatesEnabled` / `weeklyTipsEnabled` initialized from the loaded `UserProfile.notifications` (via the same `effect()` that already syncs `fullNameModel`/`newEmailModel` from `userProfile.value()`), and toggle change handlers that call `updateNotificationPreference` immediately on switch click, with error feedback via `MessageService` on failure (reverting the toggle to its prior value).
- Unit tests: backend (`UsersService`, `UsersController`) and frontend (`settings.spec.ts`, `user-settings-api.service.spec.ts` if present) covering the new behavior.

### Out of scope

- Actually sending product-update or job-tip notifications/emails (this task only persists the on/off preference).
- Any additional notification types beyond "Product updates" and "Job-search tips".
- Any notification-preference UI outside Account Settings.
- Changing the existing "change email" (Supabase-driven) or "delete account" flows.

## Behavior

1. On loading Account Settings, `UserSettingsApiService` fetches `GET /api/users/me` as it already does. The response now includes a `notifications` object.
2. The existing `effect()` in `settings.ts` that reacts to `userProfile.value()` is extended to also set `productUpdatesEnabled` and `weeklyTipsEnabled` signals from `profile.notifications.productUpdatesEnabled` / `.weeklyTipsEnabled`.
3. When the user clicks the "Product updates" switch:
   - The local signal updates immediately via `(ngModelChange)` (existing behavior, optimistic).
   - `updateNotificationPreference('PRODUCT_UPDATES', <new value>)` is called.
   - On success: no further action needed (state already reflects the new value).
   - On failure: the signal is reverted to its previous value and an error toast is shown via `MessageService` (consistent with `onFullNameUpdateSubmit`'s error handling pattern).
4. Same flow for the "Job-search tips" switch with `type: 'WEEKLY_TIPS'`.
5. Backend: `PATCH /api/users/me/notifications` receives `{ type, enabled }`, resolves the user by `supabaseId` (via `@CurrentUser()`), upserts a `Notification` row (`create` with both fields at their default plus the changed one set, `update` sets only the field matching `type`), and returns the full updated `UserProfile` (mirroring `updateDisplayName`'s return shape).
6. `GET /api/users/me`: if no `Notification` row exists for the user yet (e.g. pre-existing users created before this feature), one is created on the fly with defaults (`productUpdatesEnabled: true`, `weeklyTipsEnabled: false` — matching today's hardcoded FE defaults) so the response always includes a `notifications` object.

## Edge Cases

- **User has no `Notification` row yet** (existing users, or first load before any toggle click): `getProfile` upserts a default row rather than returning `null`/omitting the field, so the FE never has to guess defaults itself.
- **Invalid `type` value sent to the endpoint**: rejected with a 400 via DTO validation (`@IsIn(['PRODUCT_UPDATES', 'WEEKLY_TIPS'])` or equivalent enum validator).
- **Concurrent double-click of the same switch**: each click fires an independent PATCH call in the order clicked; last response wins (no debouncing/locking added — matches the existing lack of guarding on other settings actions like display name).
- **PATCH fails (network error, 401, 404 user not found)**: toggle visually reverts to its pre-click state; error toast shown. User is not signed out or redirected (consistent with `onFullNameUpdateSubmit` error handling, distinct from the account-deletion flow).
- **User row deleted between guard check and service call**: `NotFoundException` thrown, consistent with existing `updateDisplayName`/`getProfile` behavior.

## Data / API

### Prisma schema (`apps/opticv-be/prisma/schema.prisma`)

```prisma
model Notification {
  id                    String  @id @default(uuid())
  userId                String  @unique
  user                  User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  productUpdatesEnabled Boolean @default(true)
  weeklyTipsEnabled     Boolean @default(false)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("notifications")
}
```

Add `notification Notification?` to the `User` model's relations block.

Migration required via `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma`.

### Shared types (`packages/shared/datatypes/src/lib/datatypes.ts`)

```ts
export type NotificationType = 'PRODUCT_UPDATES' | 'WEEKLY_TIPS';

export type NotificationPreferences = {
  productUpdatesEnabled: boolean;
  weeklyTipsEnabled: boolean;
};
```

Extend `UserProfile`:

```ts
export type UserProfile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  subscription: { tier: SubscriptionTier; status: SubscriptionStatus } | null;
  notifications: NotificationPreferences;
};
```

### Backend

- New DTO `apps/opticv-be/src/app/users/dto/update-notification-preference.dto.ts`:
  ```ts
  export class UpdateNotificationPreferenceDto {
    @IsIn(['PRODUCT_UPDATES', 'WEEKLY_TIPS'])
    type!: NotificationType;

    @IsBoolean()
    enabled!: boolean;
  }
  ```
- `UserProfileDto` gets a nested `NotificationPreferencesDto` (`productUpdatesEnabled: boolean; weeklyTipsEnabled: boolean`) added as `notifications` field.
- `UsersController` — new endpoint:
  ```ts
  @Patch('me/notifications')
  @UseGuards(SupabaseGuard)
  @HttpCode(HttpStatus.OK)
  async updateNotificationPreference(
    @CurrentUser() user: UserModel,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateNotificationPreference(user.supabaseId, dto);
  }
  ```
- `UsersService`:
  - `getProfile` — after finding the user, upsert `Notification` (`prisma.notification.upsert(...)`) and include it in the mapped `UserProfile` return.
  - New `updateNotificationPreference(supabaseId, dto)` — finds user, upserts the `Notification` row setting only the field matching `dto.type` to `dto.enabled` (defaults for the other field on create), returns the mapped `UserProfile` (same shape as `getProfile`/`updateDisplayName`).

### Frontend

- `UserSettingsApiService` — new method:
  ```ts
  updateNotificationPreference(
    type: NotificationType,
    enabled: boolean,
  ): Observable<UserProfile> {
    return this.http.patch<UserProfile>(
      `${environment.apiUrl}/users/me/notifications`,
      { type, enabled },
    );
  }
  ```
- `settings.ts` — extend the existing profile-sync `effect()` to set `productUpdatesEnabled`/`weeklyTipsEnabled` from `profile.notifications`; add `onNotificationToggle(type: NotificationType, enabled: boolean)` handler called from both `p-toggleswitch` `(ngModelChange)` bindings, replacing the current direct `.set($event)` calls.
- `settings.html` — update the two `p-toggleswitch` bindings to call `onNotificationToggle('PRODUCT_UPDATES', $event)` / `onNotificationToggle('WEEKLY_TIPS', $event)` instead of `productUpdatesEnabled.set($event)` / `weeklyTipsEnabled.set($event)`.

## Acceptance (DEV)

- `npm exec nx build opticv-be` and `npm exec nx build opticv-web` pass.
- `npm exec nx typecheck opticv-be` and `npm exec nx typecheck opticv-web` pass.
- Prisma migration created and applied cleanly against a dev database; `npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma` succeeds.
- Unit tests added/updated for: `UsersService.getProfile` (includes default-created notifications), `UsersService.updateNotificationPreference`, `UsersController` new endpoint, `settings.spec.ts` (toggle click calls service, reverts on error), and `UserSettingsApiService` if a spec file exists for it.
- No breaking changes to existing `GET /api/users/me` or `PATCH /api/users/me/display-name` consumers (response is additive only).
- Manual check: toggling either switch in Account Settings persists across a page reload.
