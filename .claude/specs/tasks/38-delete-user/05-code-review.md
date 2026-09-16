# Code Review — Task 38: Delete user account (BE & FE)

## Summary

- **Overall result: PASS WITH ISSUES**
- The implementation covers all spec requirements and follows the plan faithfully. Backend deletion order (DB first, Supabase auth last) matches the corrected plan. The frontend `httpResource`-based approach is idiomatic Angular 21. Two issues require attention before merge: a real Supabase service role key is committed in `development.env`, and `R2Service.delete()` internally throws `InternalServerErrorException` on failure which means the try/catch in `UsersService.deleteAccount()` will catch a NestJS exception object rather than a raw S3 error — this works at runtime but leaks internal exception types across module boundaries and may change error message logging.

---

## Conventions Violations

### Critical (must fix before merge)

1. **Secret committed in `apps/opticv-be/config/env/development.env` (line 6)**
   The `SUPABASE_SERVICE_ROLE_KEY` value is a real, complete JWT (not a placeholder). Service role keys grant full admin access to the Supabase project. This must be revoked and rotated immediately, and the value replaced with a placeholder (`SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>`). The git history must be cleaned (rebase or `git filter-repo`) to remove the leaked value from all commits on this branch before merge.

### Non-Critical (should fix)

2. **`R2Service.delete()` wraps errors in `InternalServerErrorException` before rethrowing (`apps/opticv-be/src/app/storage/r2.service.ts`, line 57–68)**
   `UsersService.deleteAccount()` calls `r2.delete()` inside a try/catch and intends to log the error and continue. It will catch a `InternalServerErrorException` (a NestJS HTTP exception) rather than an S3 SDK error. This is functional but the log message will be `"InternalServerErrorException: File deletion failed."` rather than the underlying S3 reason. Consider having `R2Service.delete()` rethrow the raw error (or a typed storage error) and let callers decide whether to convert it to an HTTP exception. This is a pre-existing design issue surfaced by this task; fixing it is optional for this PR but the logged output will be misleading.

3. **`UserSettingsApiService` imported but unused `httpResource` named import (`apps/opticv-web/src/app/features/settings/services/user-settings-api.service.ts`, line 2)**
   `httpResource` is imported from `@angular/common/http` but `httpResource` is actually a standalone function — this is fine, but the import statement also includes the unused `HttpClient` binding on the same line. Wait — `HttpClient` IS used on line 9 (`inject(HttpClient)`), so the import is correct. No issue.

4. **`top-header.ts` — Settings link not added to `loggedInMenuItems`**
   The plan (Step 9) says to add `{ label: 'Settings', route: '/settings' }` to `loggedInMenuItems`. The implementation instead added a `routerLink="/settings"` directly on the avatar `<p-avatar>` in `top-header.html`. This is a deviation from the plan but achieves the intent (settings accessible from the header for logged-in users). The avatar approach is actually UX-appropriate. Not a bug, but worth noting as a plan deviation.

5. **`settings.ts` line 30 — `displayName` can be `null` but rendered directly in template**
   In `settings.html` line 31: `{{ userProfile.value().displayName }}` — if `displayName` is `null`, this renders the string `"null"` in the DOM. The spec requires showing email as fallback if no display name. The template should use `{{ userProfile.value().displayName ?? userProfile.value().email }}`.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `DELETE /api/users/me` endpoint (authenticated) | Covered | `users.controller.ts` line 93 |
| Delete all R2 files (best-effort, errors logged) | Covered | `users.service.ts` lines 81–89 — catch per file, log only |
| Delete Supabase auth user via Admin API | Covered | `users.service.ts` lines 93–107 |
| Delete DB user record (cascades) | Covered | `users.service.ts` line 91 |
| `GET /api/users/me` endpoint | Covered | `users.controller.ts` line 82 |
| `UserProfile` shared type added to `@opticv/datatypes` | Covered | `datatypes.ts` lines 73–86 |
| `SubscriptionTier` and `SubscriptionStatus` types | Covered | `datatypes.ts` lines 73–75 |
| Frontend `/settings` route (lazy-loaded, auth-guarded) | Covered | `app.routes.ts` lines 43–47 |
| Settings page: avatar with initials fallback | Covered | `settings.html` lines 15–28 |
| Settings page: display name or email fallback | Partial | `settings.html` line 31 renders raw `displayName` which can be `null` — see issue #5 above |
| Settings page: email (read-only) | Covered | `settings.html` line 32 |
| Settings page: subscription tier badge | Covered | `settings.html` lines 44–48, with `?? 'FREE'` default |
| Settings page: subscription status badge | Covered | `settings.html` lines 49–53, with `?? 'ACTIVE'` default |
| "Delete account" button with danger styling | Covered | `settings.html` line 63, `severity="danger"` |
| PrimeNG ConfirmDialog with correct message | Covered | `settings.ts` lines 41–48 |
| On confirm: loading state, API call, sign-out, redirect | Covered | `settings.ts` lines 49–72 |
| On error: Toast error, dialog closes, button re-enables | Covered | `settings.ts` lines 54–64 |
| On cancel: no action | Covered | implicit in `ConfirmationService.confirm()` — no `reject` callback |
| `authGuard` on `/settings` | Covered | `app.routes.ts` line 47 |
| Settings link in top header for logged-in users | Covered (deviation) | Avatar click navigates to `/settings` rather than a nav menu item |
| 204 response on successful delete | Covered | `users.controller.ts` line 95 |
| 404 when user not found | Covered | `users.service.ts` lines 73–75, `users.service.ts` line 52 |
| 500 on unexpected error | Covered | `users.service.ts` line 106 |
| `SUPABASE_SERVICE_ROLE_KEY` in config and validation | Covered | `configuration.ts` line 8, `validation.ts` line 9 |
| `StorageModule` extracted (no circular dependency) | Covered | `storage/storage.module.ts` |
| No `any` types | Covered | No `any` found in changed files |
| `UserProfileDto` with Swagger decorators | Covered | `user-profile.dto.ts` |

---

## Plan Deviations

1. **Top-header settings navigation (Step 9):** Plan specifies adding `{ label: 'Settings', route: '/settings' }` to the `loggedInMenuItems` array in `top-header.ts`. Implementation instead adds `routerLink="/settings"` to the avatar element in `top-header.html`. The result is equivalent (settings is accessible from the header for logged-in users), but the implementation approach differs.

2. **`UserSettingsApiService` uses `httpResource` instead of plain `Observable`-returning methods (Step 6):** The plan specifies two methods — `getProfile(): Observable<UserProfile>` and `deleteAccount(): Observable<void>`. The implementation uses `httpResource` for the profile fetch (a resource-based reactive primitive) and exposes `userProfile` as a readonly resource handle. The `deleteAccount()` method remains an `Observable`. This is an improvement over the plan (resources provide loading/error state for free) and aligns with Angular 21 best practices.

3. **`Settings` component does not have a separate `isLoading` and `error` signal (Step 7):** The plan specifies `isLoading = signal(true)`, `error = signal<string | null>(null)`, and an `ngOnInit()` with a manual API call. The implementation uses `httpResource` which provides `.isLoading()` and `.error()` directly on the resource handle — cleaner and idiomatic. `ngOnInit` is absent because loading is implicit. This is a valid and better approach.

4. **`deleteAccount()` in `UsersService` — deletion order:** The plan (amended from spec review) specifies: DB delete first, then Supabase auth delete. The implementation follows this exactly (`prisma.user.delete` at line 91, Supabase `admin.deleteUser` at lines 93–107). Correct.

---

## Null Safety Issues

1. **`settings.html` line 31 — `displayName` null renders as the string `"null"`**
   `{{ userProfile.value().displayName }}` — when `displayName` is `null`, Angular interpolation outputs the string `"null"`. Fix: `{{ userProfile.value().displayName ?? userProfile.value().email }}`.

2. **`settings.html` line 16 — redundant null coalescing after `@if` guard**
   `[image]="userProfile.value().avatarUrl ?? undefined"` — the `@if (userProfile.value().avatarUrl)` block already guarantees `avatarUrl` is truthy here; the `?? undefined` is unnecessary but harmless.

3. **`user-profile.dto.ts` — `SubscriptionDto` is not exported**
   `SubscriptionDto` is a non-exported class. Swagger will still reflect it correctly (NestJS Swagger scans by reflection), but the class is invisible for reuse or testing. Minor.

---

## Code Smells

1. **Supabase Admin client instantiated inline on every `deleteAccount()` call (`users.service.ts` lines 93–97)**
   `createClient(supabaseUrl, serviceRoleKey, ...)` is called inside the method body. This creates a new client instance on every invocation. It should be created once in the constructor (or as a class field initialized in the constructor) and reused. Not a bug — Supabase clients are stateless by design with `persistSession: false` — but it is wasteful and inconsistent with how `R2Service` initializes its S3 client.

2. **`UserSettingsApiService` uses `defaultValue: {} as UserProfile`**
   `{} as UserProfile` is a type cast of an empty object to `UserProfile` — this bypasses type safety. When `httpResource` is loading and `hasValue()` is false, accessing `userProfile.value()` would return `{}` cast as `UserProfile`. The template guards this with `@else if (userProfile.hasValue())`, so it is safe in practice, but the default value should be `null` with the resource typed as `httpResource<UserProfile | null>`, or the default should be omitted entirely if the resource always has a value once loaded.

---

## Recommendation

**Fix critical issues before merge.**

The committed service role key (finding #1) is a security incident — rotate the key immediately and clean the git history. The `displayName` null rendering (null safety finding #1) is a visible UI bug that should also be fixed. All other findings are non-critical and can be addressed in a follow-up.
