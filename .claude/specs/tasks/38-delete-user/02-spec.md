# Task Specification

## Source

Azure DevOps Task: 38 — Delete user account (BE & FE)

## Goal

Add a backend endpoint to fully delete a user account (DB records, R2 files, and Supabase auth identity) and a frontend `/settings` page where the user can view their profile data and permanently delete their account.

## Context

- **Backend:** NestJS `users` module (`apps/opticv-be/src/app/users/`). Currently only has `POST /users/sync` (Supabase webhook). R2 file deletion logic already exists in `CvService` / `R2Service`.
- **Frontend:** Angular 21 app. No `/settings` route exists yet. Auth is managed by `SupabaseService` (signals-based). The top header (`layout/top-header/`) is the natural entry point for a settings link.
- **Database:** Prisma schema already has `onDelete: Cascade` on `Subscription`, `CvDocument`, `JobApplication`, `OptimizationResult`, and `UsageLog` → deleting the `User` row cascades all child records automatically.

## Scope

### In scope

- `DELETE /api/users/me` endpoint (authenticated, deletes own account only)
- Delete all R2 files for the user (best-effort, errors logged not thrown)
- Delete the Supabase auth user via Supabase Admin API
- Delete the DB user record (cascades all related data)
- Frontend `/settings` route (lazy-loaded, auth-guarded)
- Settings page displaying: email, display name, avatar, subscription tier, subscription status
- Delete account button → PrimeNG confirmation dialog → API call → sign-out → redirect to `/login`
- New `UserSettingsApiService` in the frontend
- Add `/settings` link to the top header navigation

### Out of scope

- Admin-level deletion of other users' accounts
- Editing user profile data (display name, avatar)
- Subscription management UI (cancel, upgrade)
- Hard rollback on R2 partial failures

## Behavior

### Backend

1. Client sends `DELETE /api/users/me` with `Authorization: Bearer <token>`.
2. `SupabaseGuard` validates the token and extracts `supabaseId` + `email`.
3. `UsersController` calls `UsersService.deleteAccount(supabaseId)`.
4. `UsersService.deleteAccount()` executes in this order:
   a. Look up the `User` record by `supabaseId` to get `user.id`.
   b. Fetch all `CvDocument` records for the user (only `storageKey` field needed).
   c. For each `storageKey`, call `R2Service.delete(key)`. Failures are caught, logged with `Logger.error`, and do not stop the flow.
   d. Call Supabase Admin API (`auth.admin.deleteUser(supabaseId)`) to remove the auth identity.
   e. Call `prisma.user.delete({ where: { id: user.id } })` — Prisma cascades delete all child records.
5. Return `204 No Content` on success.
6. On unexpected errors (DB failure, Supabase Admin API failure), propagate as `500 Internal Server Error`.

### Frontend

1. User navigates to `/settings` (or clicks the settings link in the top header).
2. The settings page loads user data from the existing Supabase session signal and fetches subscription info from the backend (`GET /api/subscriptions/me` if it exists, otherwise derive from `SupabaseService`).

   > **Assumption:** User's `email` and `displayName`/`avatarUrl` come from `SupabaseService.user` signal. Subscription tier/status are fetched via a new `GET /api/users/me` endpoint (see Data / API section).

3. Page renders:
   - Avatar (initials fallback if no `avatarUrl`)
   - Display name (or email if no display name)
   - Email (read-only)
   - Subscription tier badge (FREE / PRO / PRO_ANNUAL / SPRINT)
   - Subscription status badge (ACTIVE / CANCELED / PAST_DUE / TRIALING)
   - "Delete account" button (destructive styling)

4. User clicks "Delete account":
   - PrimeNG `ConfirmDialog` opens with message: *"This will permanently delete your account and all associated data. This action cannot be undone."*
   - Actions: "Cancel" (secondary) and "Delete" (danger).

5. User confirms:
   - Button/dialog enters loading state.
   - Frontend calls `DELETE /api/users/me`.
   - On success: call `SupabaseService.signOut()`, then navigate to `/login`.
   - On error: show PrimeNG `Toast` error message; dialog closes; button re-enables.

6. User cancels: dialog closes, no action taken.

## Edge Cases

- **User not found in DB** (supabaseId exists in Supabase but not in `users` table): return `404 Not Found`.
- **R2 partial failure:** log individual key errors, continue with DB and Supabase deletion.
- **Supabase Admin API failure:** return `500`; do not delete the DB record (to avoid orphaned auth user with no app data).
- **Network error on frontend:** show error toast, keep user on `/settings`.
- **Avatar URL missing:** display initials avatar (first letter of display name or email).
- **No subscription record:** show tier as FREE, status as ACTIVE (defensive default).

## Data / API

### New backend endpoint: GET /api/users/me

Returns current user's profile + subscription for the settings page.

```
GET /api/users/me
Authorization: Bearer <token>

Response 200:
{
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  subscription: {
    tier: 'FREE' | 'PRO' | 'PRO_ANNUAL' | 'SPRINT';
    status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';
  } | null;
}
```

### New backend endpoint: DELETE /api/users/me

```
DELETE /api/users/me
Authorization: Bearer <token>

Response 204: No Content
Response 404: { message: 'User not found' }
Response 500: { message: 'Failed to delete account' }
```

### New shared types (add to `@opticv/datatypes`)

```ts
export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
  } | null;
}

export type SubscriptionTier = 'FREE' | 'PRO' | 'PRO_ANNUAL' | 'SPRINT';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';
```

### DB changes

None — existing cascade deletes in the Prisma schema handle all child record cleanup automatically.

### Supabase Admin API

- Method: `supabaseAdmin.auth.admin.deleteUser(userId)` where `userId` is the Supabase UUID (`supabaseId` field).
- Requires `SUPABASE_SERVICE_ROLE_KEY` env variable (service role key, not anon key).
- The Supabase Admin client should be initialized in `UsersService` or a dedicated provider using `createClient(url, serviceRoleKey)`.

### Frontend new files

| Path | Purpose |
|---|---|
| `apps/opticv-web/src/app/features/settings/settings.ts` | Settings page component |
| `apps/opticv-web/src/app/features/settings/settings.html` | Settings page template |
| `apps/opticv-web/src/app/features/settings/services/user-settings-api.service.ts` | HTTP calls for `GET /api/users/me` and `DELETE /api/users/me` |

### Frontend route change

Add to `app.routes.ts`:
```ts
{
  path: 'settings',
  loadComponent: () => import('./features/settings/settings').then(m => m.SettingsComponent),
  canActivate: [authGuard],
}
```

Add settings link to `top-header` component.

## Assumptions

1. `SupabaseService.user` signal already provides `email`, `id` (Supabase UUID), `displayName`, and `avatarUrl` — no additional auth calls needed on the FE for those fields.
2. No existing `GET /api/users/me` endpoint — it must be created as part of this task.
3. The Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) is available as an environment variable and will be added to `config/env/development.env`, `production.env`, and the Joi validation schema.
4. `ConfirmDialog` from PrimeNG is already available (registered via `providePrimeNG` in `app.config.ts`).
5. R2 file path pattern is `uploads/{userId}/{filename}` — all user files share the same `userId` prefix, but we delete by individual `storageKey` from DB records (more precise).

## Acceptance (DEV)

- Backend builds without errors (`npm exec nx build opticv-be`)
- Frontend builds without errors (`npm exec nx build opticv-web`)
- Type check passes (`npm exec nx run-many -t typecheck`)
- `DELETE /api/users/me` removes DB user, all R2 files, and Supabase auth user when called with a valid token
- R2 deletion failure does not block account deletion (error is logged only)
- `/settings` page renders user email, display name/avatar, tier, and status
- Clicking "Delete account" → confirming → signs the user out and redirects to `/login`
- Cancelling the confirmation dialog takes no action
- `authGuard` blocks unauthenticated access to `/settings`
- No `any` types introduced
- No breaking changes to existing endpoints or components
