# Implementation Plan — Task 87: User Notifications

Source spec: `02-spec.md` — Review: `03-spec-review.md` (PASS WITH ISSUES, no blockers)

---

## Step 1 — Prisma schema

File: `apps/opticv-be/prisma/schema.prisma`

1. Add a new `Notification` model, placed after the `Subscription` model (mirrors its shape):

   ```prisma
   model Notification {
     id     String @id @default(uuid())
     userId String @unique
     user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

     productUpdatesEnabled Boolean @default(true)
     weeklyTipsEnabled     Boolean @default(false)

     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     @@map("notifications")
   }
   ```

2. In the `User` model's relations block, add:

   ```prisma
   notification Notification?
   ```

   Place it alongside `subscription Subscription?`.

3. Run migration:

   ```bash
   npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma --name add_notifications
   ```

4. Run client generation (also triggered by migrate, but verify explicitly):

   ```bash
   npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma
   ```

---

## Step 2 — Shared types (`@opticv/datatypes`)

File: `packages/shared/datatypes/src/lib/datatypes.ts`

1. Add near `SubscriptionStatus` (before `UserProfile`):

   ```ts
   export type NotificationType = 'PRODUCT_UPDATES' | 'WEEKLY_TIPS';

   export type NotificationPreferences = {
     productUpdatesEnabled: boolean;
     weeklyTipsEnabled: boolean;
   };
   ```

2. Extend the existing `UserProfile` type (lines 148–157) by adding one field:

   ```ts
   notifications: NotificationPreferences;
   ```

3. Rebuild the library so consuming apps pick up the change:

   ```bash
   npm exec nx build datatypes
   ```

---

## Step 3 — Backend DTOs

### 3a. New file: `apps/opticv-be/src/app/users/dto/update-notification-preference.dto.ts`

Mirror `update-display-name.dto.ts`'s structure (`class-validator` + `@nestjs/swagger`):

```ts
import { IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { NotificationType } from '@opticv/datatypes';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ enum: ['PRODUCT_UPDATES', 'WEEKLY_TIPS'] })
  @IsIn(['PRODUCT_UPDATES', 'WEEKLY_TIPS'])
  type!: NotificationType;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
```

### 3b. Modify: `apps/opticv-be/src/app/users/dto/user-profile.dto.ts`

Add a `NotificationPreferencesDto` nested class (mirrors `SubscriptionDto`'s pattern) and a required `notifications` field on `UserProfileDto`:

```ts
class NotificationPreferencesDto {
  @ApiProperty()
  productUpdatesEnabled!: boolean;

  @ApiProperty()
  weeklyTipsEnabled!: boolean;
}
```

Add to `UserProfileDto`:

```ts
@ApiProperty({ type: NotificationPreferencesDto })
notifications!: NotificationPreferencesDto;
```

Import `NotificationPreferences` type is not required here since the DTO class is structurally compatible; no import changes needed beyond what's already present.

---

## Step 4 — Backend service (`UsersService`)

File: `apps/opticv-be/src/app/users/users.service.ts`

1. Import `NotificationType` and `NotificationPreferences` from `@opticv/datatypes` (extend existing type-only import on line 13), and `UpdateNotificationPreferenceDto` from `./dto/update-notification-preference.dto`.

2. Modify `getProfile(supabaseId: string)`:
   - Change the `include` to also include `notification: true` alongside `subscription: true`.
   - After confirming the user exists, upsert the `Notification` row:
     ```ts
     const notification = await this.prisma.notification.upsert({
       where: { userId: user.id },
       create: { userId: user.id },
       update: {},
     });
     ```
     (Relies on Prisma schema defaults `productUpdatesEnabled: true`, `weeklyTipsEnabled: false` for the `create` case; `update: {}` is a no-op when the row already exists.)
   - Add `notifications: { productUpdatesEnabled: notification.productUpdatesEnabled, weeklyTipsEnabled: notification.weeklyTipsEnabled }` to the returned `UserProfile` object.

3. Modify `updateDisplayName(...)`:
   - Since `UserProfile` now requires `notifications`, extend the `include` on both the `findUnique` and `update` calls to also fetch `notification: true`.
   - If `updatedUser.notification` is `null` (pre-existing user with no row yet), upsert a default `Notification` row the same way as in `getProfile`, then use its values. To avoid duplicating the upsert logic, extract a small private helper:
     ```ts
     private async ensureNotificationPreferences(userId: string): Promise<NotificationPreferences> {
       const notification = await this.prisma.notification.upsert({
         where: { userId },
         create: { userId },
         update: {},
       });
       return {
         productUpdatesEnabled: notification.productUpdatesEnabled,
         weeklyTipsEnabled: notification.weeklyTipsEnabled,
       };
     }
     ```
   - Use `ensureNotificationPreferences(user.id)` in both `getProfile` and `updateDisplayName` to build the `notifications` field. This keeps `updateDisplayName`'s own `include` unchanged (no need to add `notification: true` there) since the helper performs its own upsert/read.

4. Add new method `updateNotificationPreference(supabaseId: string, dto: UpdateNotificationPreferenceDto): Promise<UserProfile>`:
   - Find the user by `supabaseId` (same `findUnique` + `NotFoundException` pattern as `updateDisplayName`).
   - Build the field to update: `const field = dto.type === 'PRODUCT_UPDATES' ? 'productUpdatesEnabled' : 'weeklyTipsEnabled';`
   - Upsert:
     ```ts
     const notification = await this.prisma.notification.upsert({
       where: { userId: user.id },
       create: { userId: user.id, [field]: dto.enabled },
       update: { [field]: dto.enabled },
     });
     ```
   - Return the mapped `UserProfile`, re-fetching `subscription` via `findUnique` with `include: { subscription: true }` on `user.id` (same shape as `updateDisplayName`'s return), and setting `notifications` from the just-upserted `notification` row directly (no extra query needed for that part).

5. Type-safety note for step 4's dynamic key assignment: since `field` is a `'productUpdatesEnabled' | 'weeklyTipsEnabled'` union (not `string`), the computed-property object literals are safely typed — no `any`/`@ts-ignore` needed.

---

## Step 5 — Backend controller (`UsersController`)

File: `apps/opticv-be/src/app/users/users.controller.ts`

1. Import `UpdateNotificationPreferenceDto` from `./dto/update-notification-preference.dto`.

2. Add new endpoint after `updateDisplayName` (lines 96–113), mirroring its guard/decorator structure:

   ```ts
   @Patch('me/notifications')
   @UseGuards(SupabaseGuard)
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Update a notification preference' })
   @ApiResponse({
     status: 200,
     type: UserProfileDto,
     description: 'Updated user profile',
   })
   @ApiResponse({ status: 400, description: 'Validation failed' })
   @ApiResponse({ status: 401, description: 'Unauthorized' })
   @ApiResponse({ status: 404, description: 'User not found' })
   async updateNotificationPreference(
     @CurrentUser() user: UserModel,
     @Body() dto: UpdateNotificationPreferenceDto,
   ): Promise<UserProfileDto> {
     return this.usersService.updateNotificationPreference(user.supabaseId, dto);
   }
   ```

---

## Step 6 — Backend unit tests

### 6a. `apps/opticv-be/src/app/users/users.service.spec.ts`

Extend `mockPrisma` with a `notification` mock:

```ts
notification: {
  upsert: jest.fn(),
},
```

Add test cases:

- `getProfile`:
  - existing describe block does not currently exist for `getProfile` — add one.
  - "upserts a default notification row and includes it in the profile" — `mockPrisma.user.findUnique` resolves a user with `subscription`, `mockPrisma.notification.upsert` resolves `{ productUpdatesEnabled: true, weeklyTipsEnabled: false }`; assert `notification.upsert` called with `{ where: { userId: ... }, create: { userId: ... }, update: {} }` and the returned profile has `notifications` set accordingly.
  - "throws NotFoundException when user does not exist" (if not already covered elsewhere for `getProfile` specifically — confirm and add if missing).
- `updateDisplayName`: update existing "updates the display name..." test's expected result to include a `notifications` field, since `ensureNotificationPreferences` is now called; mock `mockPrisma.notification.upsert` to resolve default values for this test.
- `updateNotificationPreference` (new describe block):
  - "throws NotFoundException when user does not exist".
  - "upserts productUpdatesEnabled and returns the updated profile" — assert `notification.upsert` called with `create: { userId: 'user-id', productUpdatesEnabled: false }, update: { productUpdatesEnabled: false }` for `{ type: 'PRODUCT_UPDATES', enabled: false }`.
  - "upserts weeklyTipsEnabled and returns the updated profile" — same shape for `WEEKLY_TIPS`.

### 6b. `apps/opticv-be/src/app/users/users.controller.spec.ts`

Add a test for the new `updateNotificationPreference` endpoint following the existing pattern for `updateDisplayName` (mock `usersService.updateNotificationPreference`, assert controller delegates with `user.supabaseId` and the DTO).

### 6c. New file: `apps/opticv-be/src/app/users/dto/update-notification-preference.dto.spec.ts`

Mirror `update-display-name.dto.spec.ts`'s structure — validate via `class-validator`'s `validate()`:

- valid DTO (`type: 'PRODUCT_UPDATES', enabled: true`) passes with no errors.
- invalid `type` (e.g. `'BOGUS'`) fails with an error on the `type` property.
- non-boolean `enabled` fails with an error on the `enabled` property.

---

## Step 7 — Frontend API service

File: `apps/opticv-web/src/app/core/services/user-settings-api.service.ts`

1. Extend the `import type { UsageStatus, UserProfile } from '@opticv/datatypes';` to also import `NotificationType`.

2. Add new method after `updateDisplayName`:

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

---

## Step 8 — Frontend `settings.ts`

File: `apps/opticv-web/src/app/features/settings/settings.ts`

1. Import `NotificationType` alongside the existing `LimitedFeature, UserProfile` type-only import.

2. Extend the `effect()` in the constructor (currently lines 113–119) to also sync the two notification signals from `profile.notifications`:

   ```ts
   constructor() {
     effect(() => {
       const profile = this.userProfile.value();
       if (profile) {
         this.fullNameModel.set({ displayName: profile.displayName ?? '' });
         this.newEmailModel.set({ newEmail: profile.email ?? '' });
         this.productUpdatesEnabled.set(profile.notifications.productUpdatesEnabled);
         this.weeklyTipsEnabled.set(profile.notifications.weeklyTipsEnabled);
       }
     });
   }
   ```

3. Add new method `onNotificationToggle(type: NotificationType, enabled: boolean): void`, placed after `onFullNameUpdateSubmit` (mirrors its `catchError`/`MessageService` pattern, but is optimistic — set first, revert on failure):

   ```ts
   onNotificationToggle(type: NotificationType, enabled: boolean): void {
     const signal =
       type === 'PRODUCT_UPDATES'
         ? this.productUpdatesEnabled
         : this.weeklyTipsEnabled;
     const previousValue = !enabled;

     signal.set(enabled);

     this.userSettingsApiService
       .updateNotificationPreference(type, enabled)
       .pipe(
         catchError((err) => {
           const message =
             (err as { error?: { message?: string } })?.error?.message ??
             'Failed to update notification preference. Please try again.';
           this.messageService.add({
             severity: 'error',
             summary: 'Update Error',
             detail: message,
           });
           signal.set(previousValue);
           return EMPTY;
         }),
       )
       .subscribe();
   }
   ```

   Note: `previousValue` is derived as `!enabled` because the caller passes the new toggle value; this matches the existing template's `(ngModelChange)` semantics where `$event` is the value the switch was just set to.

---

## Step 9 — Frontend `settings.html`

File: `apps/opticv-web/src/app/features/settings/settings.html` (lines 232–249)

Replace the two `(ngModelChange)` bindings:

```html
<p-toggleswitch
  [ngModel]="productUpdatesEnabled()"
  (ngModelChange)="onNotificationToggle('PRODUCT_UPDATES', $event)"
  [ngModelOptions]="{ standalone: true }"
  ariaLabel="Product updates"
/>
```

```html
<p-toggleswitch
  [ngModel]="weeklyTipsEnabled()"
  (ngModelChange)="onNotificationToggle('WEEKLY_TIPS', $event)"
  [ngModelOptions]="{ standalone: true }"
  ariaLabel="Weekly job-search tips"
/>
```

---

## Step 10 — Frontend unit tests

### 10a. `apps/opticv-web/src/app/features/settings/settings.spec.ts`

Read the existing file first to match its harness/mocking conventions (likely mocks `UserSettingsApiService`). Add:

- Test that after `userProfile` resource resolves with a profile containing `notifications: { productUpdatesEnabled: false, weeklyTipsEnabled: true }`, the component's `productUpdatesEnabled()` and `weeklyTipsEnabled()` signals reflect those values.
- Test `onNotificationToggle('PRODUCT_UPDATES', false)`:
  - calls `userSettingsApiService.updateNotificationPreference('PRODUCT_UPDATES', false)`.
  - on success (mocked observable emits), signal remains `false`.
  - on error (mocked observable throws), signal reverts to its prior value (`true`) and `messageService.add` is called with `severity: 'error'`.
- Same pair of success/error tests for `onNotificationToggle('WEEKLY_TIPS', ...)`.

### 10b. `apps/opticv-web/src/app/core/services/user-settings-api.service.spec.ts`

Add a `describe('updateNotificationPreference', ...)` block mirroring the `deleteAccount` block's structure (lines 54–80):

- "PATCHes /api/users/me/notifications with type and enabled" — call `service.updateNotificationPreference('PRODUCT_UPDATES', true)`, assert `httpMock.expectOne(...)` request method is `PATCH` and body is `{ type: 'PRODUCT_UPDATES', enabled: true }`, flush a mock `UserProfile`.
- "propagates HTTP errors" — same pattern as `deleteAccount`'s equivalent test.

---

## Step 11 — Verification checklist

Run in order, fixing any failures before proceeding to the next:

1. `npm exec nx build datatypes`
2. `npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma`
3. `npm exec nx typecheck opticv-be`
4. `npm exec nx typecheck opticv-web`
5. `npm exec nx test opticv-be`
6. `npm exec nx test opticv-web`
7. `npm exec nx build opticv-be`
8. `npm exec nx build opticv-web`
9. `npm exec nx lint opticv-be`
10. `npm exec nx lint opticv-web`
11. Manual check: start backend + frontend, log in, open Account Settings, toggle each switch, reload the page, confirm both toggles persist their new state.

---

## Notes carried over from spec review (non-blocking, applied above)

- `getProfile`'s upsert-on-read is intentionally a new pattern (not mirrored from `Subscription`'s write-once-at-sync approach) — implemented via the shared `ensureNotificationPreferences` helper to avoid duplicating upsert logic across `getProfile` and `updateDisplayName`.
- `@IsIn` is a first use of that validator in this codebase but is a standard `class-validator` decorator — used as specified.
- No debouncing/locking is added to the toggle switches, consistent with the spec's explicit design choice (differs from the `isSavingName`-guarded name form, but this divergence is accepted per the spec).
