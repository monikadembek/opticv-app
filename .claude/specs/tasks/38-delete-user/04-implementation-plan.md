# Implementation Plan — Task 38: Delete user account (BE & FE)

## Review status

Spec review: **PASS WITH ISSUES** — the two critical issues from the review are resolved in this plan:

1. **Deletion order fixed:** DB record is deleted before Supabase auth user. If DB delete succeeds but Supabase auth delete fails, data is gone but the auth identity remains (user can still log in, but there will be no app data — acceptable). If DB delete fails, Supabase auth is never touched — no orphan state.
2. **Subscription data source fixed:** The settings page fetches profile + subscription from the new `GET /api/users/me` endpoint exclusively. `SupabaseService.currentUser()` is used only for the session token (via `AuthInterceptor`) — not as a data source for the page.

---

## Implementation order

Backend first (endpoints must exist before the frontend can call them), then shared types, then frontend.

---

## Step 1 — Backend: add `SUPABASE_SERVICE_ROLE_KEY` to config

### Files modified

**`apps/opticv-be/config/configuration.ts`**

Add `serviceRoleKey` to the `supabase` config section:

```
supabase: {
  url: process.env.SUPABASE_URL,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  webhookSecret: process.env.SUPABASE_WEBHOOK_SECRET,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
}
```

**`apps/opticv-be/config/validation.ts`**

Add Joi rule:

```
SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
```

**`apps/opticv-be/config/env/development.env`**

Add line (value to be filled in by developer from Supabase dashboard):

```
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

**`apps/opticv-be/config/env/production.env`**

Same addition as development.env.

---

## Step 2 — Backend: make `R2Service` injectable from `UsersModule`

`R2Service` is currently only provided inside `CvModule` (not exported). `UsersService` needs to use it.

### Files modified

**`apps/opticv-be/src/app/cv/cv.module.ts`**

Add `R2Service` to `exports` array so it can be consumed by importing modules:

```
exports: [R2Service]
```

**`apps/opticv-be/src/app/users/users.module.ts`**

Import `CvModule` to gain access to `R2Service`. Also import `ConfigModule` (needed for the Supabase Admin client inside `UsersService`):

```
imports: [PrismaModule, CvModule, ConfigModule]
```

> Note: `CvModule` already imports `AuthModule` which imports `UsersModule`. Check for circular dependency. If circular, move `R2Service` to a standalone `StorageModule` instead.

### Circular dependency check

`CvModule → AuthModule → UsersModule → CvModule` would be circular. To avoid this, move `R2Service` out of `CvModule` into a new `StorageModule`.

**New file: `apps/opticv-be/src/app/storage/storage.module.ts`**

```
imports: [ConfigModule]
providers: [R2Service]
exports: [R2Service]
```

**`apps/opticv-be/src/app/cv/cv.module.ts`**

Replace direct `R2Service` provider with `StorageModule` import.

**`apps/opticv-be/src/app/users/users.module.ts`**

Import `StorageModule` and `ConfigModule`.

**Move file:** `r2.service.ts` from `apps/opticv-be/src/app/cv/services/` to `apps/opticv-be/src/app/storage/`

Update the import path in `cv.service.ts` accordingly.

---

## Step 3 — Backend: update `UsersService`

**`apps/opticv-be/src/app/users/users.service.ts`**

Add two new methods:

### `getProfile(supabaseId: string)`

- Queries `prisma.user.findUnique({ where: { supabaseId }, include: { subscription: true } })`
- Returns `UserProfile` shape (id, email, displayName, avatarUrl, subscription tier+status)
- Throws `NotFoundException` if user not found

### `deleteAccount(supabaseId: string)`

Execution order:

1. `prisma.user.findUnique({ where: { supabaseId }, select: { id: true } })` — throws `NotFoundException` if not found
2. `prisma.cvDocument.findMany({ where: { userId }, select: { storageKey: true } })` — collect all R2 keys
3. For each `storageKey`: call `r2Service.delete(key)` inside a try/catch — catch logs with `Logger.error`, does not rethrow
4. `prisma.user.delete({ where: { id } })` — cascade deletes Subscription, CvDocument, JobApplication, OptimizationResult, UsageLog
5. Initialize Supabase Admin client inline using `createClient(supabaseUrl, serviceRoleKey)` and call `supabaseAdmin.auth.admin.deleteUser(supabaseId)` — on error, log with `Logger.error` and throw `InternalServerErrorException`
6. Return void

Dependencies to inject into `UsersService`:
- `PrismaService` (already present)
- `R2Service` (new, via `StorageModule`)
- `ConfigService` (new, for reading `supabase.url` and `supabase.serviceRoleKey`)

Constructor must be changed from property injection to use `inject()` pattern per conventions, or keep constructor-based (existing code uses constructor — keep consistent).

---

## Step 4 — Backend: update `UsersController`

**`apps/opticv-be/src/app/users/users.controller.ts`**

Add two new endpoints. Both use `@UseGuards(SupabaseGuard)` and `@CurrentUser()`.

### `GET /users/me`

```
@Get('me')
@UseGuards(SupabaseGuard)
@HttpCode(HttpStatus.OK)
async getProfile(@CurrentUser() user: UserModel): Promise<UserProfileDto>
```

- Calls `usersService.getProfile(user.supabaseId)`
- Returns `UserProfileDto`

### `DELETE /users/me`

```
@Delete('me')
@UseGuards(SupabaseGuard)
@HttpCode(HttpStatus.NO_CONTENT)
async deleteAccount(@CurrentUser() user: UserModel): Promise<void>
```

- Calls `usersService.deleteAccount(user.supabaseId)`
- Returns 204 on success
- `NotFoundException` → 404 (NestJS handles automatically)
- `InternalServerErrorException` → 500 (NestJS handles automatically)

Add Swagger decorators (`@ApiOperation`, `@ApiResponse`) consistent with existing controller style.

### New DTO file

**`apps/opticv-be/src/app/users/dto/user-profile.dto.ts`**

```ts
class SubscriptionDto {
  tier: 'FREE' | 'PRO' | 'PRO_ANNUAL' | 'SPRINT'
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING'
}

class UserProfileDto {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  subscription: SubscriptionDto | null
}
```

Use `@ApiProperty` decorators consistent with other DTOs.

---

## Step 5 — Shared types: add `UserProfile` to `@opticv/datatypes`

**`packages/shared/datatypes/src/lib/datatypes.ts`**

Append new types after existing `User` type:

```ts
export type SubscriptionTier = 'FREE' | 'PRO' | 'PRO_ANNUAL' | 'SPRINT';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
  } | null;
};
```

No existing types named `SubscriptionTier` or `SubscriptionStatus` exist in the file — safe to add.

---

## Step 6 — Frontend: new `UserSettingsApiService`

**New file: `apps/opticv-web/src/app/features/settings/services/user-settings-api.service.ts`**

- `providedIn: 'root'`
- Uses `inject(HttpClient)`
- Uses `environment.apiUrl` (same pattern as `CvApiService`)
- Two methods:
  - `getProfile(): Observable<UserProfile>` → `GET /users/me`
  - `deleteAccount(): Observable<void>` → `DELETE /users/me`

---

## Step 7 — Frontend: `Settings` page component

**New file: `apps/opticv-web/src/app/features/settings/settings.ts`**

- `ChangeDetectionStrategy.OnPush`
- `providers: [ConfirmationService]` (same pattern as `Dashboard`)
- Inject: `UserSettingsApiService`, `ConfirmationService`, `MessageService`, `Router`, `Supabase`
- Signals:
  - `profile = signal<UserProfile | null>(null)`
  - `isLoading = signal(true)`
  - `isDeleting = signal(false)`
  - `error = signal<string | null>(null)`
- `ngOnInit()`: calls `userSettingsApiService.getProfile()`, sets `profile` on success, sets `error` on failure, sets `isLoading(false)` in both cases
- `onDeleteAccount()`:
  - Opens `ConfirmationService.confirm()` with message and danger accept button (same pattern as `Dashboard.onDelete()`)
  - On accept:
    - `isDeleting.set(true)`
    - Calls `userSettingsApiService.deleteAccount()`
    - On success: calls `supabase.signOut()` then `router.navigate(['/login'])`
    - On error: shows `messageService.add({ severity: 'error', ... })`, `isDeleting.set(false)`
- Imports: `ButtonModule`, `ConfirmDialogModule`, `ProgressSpinnerModule`, `AvatarModule`

**New file: `apps/opticv-web/src/app/features/settings/settings.html`**

Template renders:

- Loading state: `@if (isLoading())` → `<p-progressSpinner>`
- Error state: `@if (error())` → error message paragraph
- Loaded state: `@if (profile())` →
  - `<p-avatar>` with `[label]` = first letter of `displayName ?? email` (uppercase), or `[image]` if `avatarUrl` is present
  - Display name (or email as fallback)
  - Email (read-only text)
  - Subscription tier badge (plain `<span>` with Tailwind class)
  - Subscription status badge
  - Defensive defaults for null subscription: show "FREE" / "ACTIVE"
  - "Delete account" `<p-button>` with `severity="danger"`, `[loading]="isDeleting()"`, `(onClick)="onDeleteAccount()"`
- `<p-confirmDialog>` component at bottom of template

---

## Step 8 — Frontend: register `/settings` route

**`apps/opticv-web/src/app/app.routes.ts`**

Add before the wildcard `**` route:

```ts
{
  path: 'settings',
  loadComponent: () =>
    import('./features/settings/settings').then((c) => c.Settings),
  canActivate: [authGuard],
},
```

---

## Step 9 — Frontend: add Settings link to top header

**`apps/opticv-web/src/app/layout/top-header/top-header.ts`**

In the `loggedInMenuItems` array inside the `effect()`, add:

```ts
{ label: 'Settings', route: '/settings' }
```

No template changes needed — the existing `<ng-template #item>` already renders `routerLink` for all menu items.

---

## Files created

| File | Type |
|---|---|
| `apps/opticv-be/src/app/storage/storage.module.ts` | New |
| `apps/opticv-be/src/app/storage/r2.service.ts` | Moved from `cv/services/` |
| `apps/opticv-be/src/app/users/dto/user-profile.dto.ts` | New |
| `apps/opticv-web/src/app/features/settings/settings.ts` | New |
| `apps/opticv-web/src/app/features/settings/settings.html` | New |
| `apps/opticv-web/src/app/features/settings/services/user-settings-api.service.ts` | New |

## Files modified

| File | Change |
|---|---|
| `apps/opticv-be/config/configuration.ts` | Add `supabase.serviceRoleKey` |
| `apps/opticv-be/config/validation.ts` | Add `SUPABASE_SERVICE_ROLE_KEY` Joi rule |
| `apps/opticv-be/config/env/development.env` | Add `SUPABASE_SERVICE_ROLE_KEY=` |
| `apps/opticv-be/config/env/production.env` | Add `SUPABASE_SERVICE_ROLE_KEY=` |
| `apps/opticv-be/src/app/cv/cv.module.ts` | Replace `R2Service` provider with `StorageModule` import; update `r2.service.ts` import path |
| `apps/opticv-be/src/app/cv/cv.service.ts` | Update `r2.service.ts` import path |
| `apps/opticv-be/src/app/users/users.module.ts` | Import `StorageModule`, `ConfigModule` |
| `apps/opticv-be/src/app/users/users.service.ts` | Add `getProfile()` and `deleteAccount()` methods; inject `R2Service`, `ConfigService` |
| `apps/opticv-be/src/app/users/users.controller.ts` | Add `GET /users/me` and `DELETE /users/me` endpoints; inject `ConfigService` |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `SubscriptionTier`, `SubscriptionStatus`, `UserProfile` types |
| `apps/opticv-web/src/app/app.routes.ts` | Add `/settings` route |
| `apps/opticv-web/src/app/layout/top-header/top-header.ts` | Add Settings menu item to `loggedInMenuItems` |

---

## Acceptance checklist

- [ ] `npm exec nx build opticv-be` passes
- [ ] `npm exec nx build opticv-web` passes
- [ ] `npm exec nx run-many -t typecheck` passes
- [ ] `GET /api/users/me` returns correct profile + subscription for authenticated user
- [ ] `DELETE /api/users/me` with valid token: deletes DB record, R2 files, and Supabase auth user
- [ ] R2 deletion error is logged only — account deletion still completes
- [ ] Supabase Admin API error returns 500 and DB record is NOT deleted
- [ ] `/settings` renders email, display name/avatar, tier, status (with FREE/ACTIVE defaults when subscription is null)
- [ ] Loading spinner shown while `GET /api/users/me` is in flight
- [ ] Error message shown if `GET /api/users/me` fails
- [ ] Delete button opens confirmation dialog
- [ ] Confirming: calls DELETE, signs out, navigates to `/login`
- [ ] Cancelling: dialog closes, no side effects
- [ ] Delete button shows loading state during the API call
- [ ] API error shows Toast error, button re-enables
- [ ] `authGuard` blocks unauthenticated access to `/settings`
- [ ] Settings link appears in top header nav for logged-in users only
- [ ] No `any` types
- [ ] No breaking changes to existing endpoints or routes
