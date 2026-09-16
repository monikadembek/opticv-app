# Implementation Done — Task 38: Delete user account (BE & FE)

## Summary

Backend endpoints `GET /api/users/me` and `DELETE /api/users/me` are implemented in the `users` module. `R2Service` was moved to a new `StorageModule` to resolve a circular dependency. The shared `@opticv/datatypes` package has `UserProfile`, `SubscriptionTier`, and `SubscriptionStatus` types added. The Angular frontend has a `/settings` route with a `Settings` page component and a `UserSettingsApiService`. The top-header was updated with a clickable avatar linking to `/settings`.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `DELETE /api/users/me` endpoint | Implemented | |
| Delete all R2 files for the user (best-effort, errors logged not thrown) | Implemented | Errors caught per-file and logged; deletion continues |
| Delete Supabase auth user via Admin API | Implemented | |
| Delete DB user record with cascade | Implemented | `prisma.user.delete` with Prisma cascade |
| Return `204 No Content` on success | Implemented | |
| Return `404 Not Found` if user not found | Implemented | `NotFoundException` thrown in service |
| Return `500` on DB or Supabase Admin API failure | Implemented | `InternalServerErrorException` on Supabase Admin failure |
| DB deleted before Supabase auth (plan-corrected order) | Implemented | DB deleted first, then Supabase auth |
| `GET /api/users/me` endpoint | Implemented | Returns `UserProfile` shape |
| `SUPABASE_SERVICE_ROLE_KEY` added to `configuration.ts` | Implemented | |
| `SUPABASE_SERVICE_ROLE_KEY` added to Joi validation schema | Implemented | |
| `R2Service` moved to `StorageModule` to avoid circular dependency | Implemented | |
| Frontend `/settings` route (lazy-loaded, auth-guarded) | Implemented | |
| Settings page: avatar (initials fallback) | Implemented | |
| Settings page: display name (email fallback) | Implemented | |
| Settings page: email (read-only) | Implemented | |
| Settings page: subscription tier badge | Implemented | Defensive default: `FREE` |
| Settings page: subscription status badge | Implemented | Defensive default: `ACTIVE` |
| Settings page: loading state while fetching | Implemented | Uses `httpResource` `isLoading()` |
| Settings page: error state on fetch failure | Implemented | Uses `httpResource` `error()` |
| "Delete account" button with PrimeNG `ConfirmDialog` | Implemented | |
| Confirmation message matches spec | Implemented | |
| On confirm: loading state on button, call DELETE, sign out, navigate to `/login` | Implemented | |
| On error: show PrimeNG `Toast` error; button re-enables | Implemented | |
| On cancel: dialog closes, no action | Implemented | |
| `UserSettingsApiService` with `getProfile()` and `deleteAccount()` | Implemented | `getProfile` is exposed as `httpResource` signal, not `Observable` |
| `authGuard` on `/settings` route | Implemented | |
| Settings link added to top header | Implemented | Implemented as avatar click `routerLink="/settings"` instead of a menu item in `loggedInMenuItems` |
| `SubscriptionTier`, `SubscriptionStatus`, `UserProfile` added to `@opticv/datatypes` | Implemented | |
| No `any` types | Implemented | |
| No breaking changes to existing endpoints or components | Implemented | |

---

## Files

### Created

| File |
|---|
| `apps/opticv-be/src/app/storage/storage.module.ts` |
| `apps/opticv-be/src/app/storage/r2.service.ts` (moved from `cv/services/`) |
| `apps/opticv-be/src/app/users/dto/user-profile.dto.ts` |
| `apps/opticv-web/src/app/features/settings/settings.ts` |
| `apps/opticv-web/src/app/features/settings/settings.html` |
| `apps/opticv-web/src/app/features/settings/services/user-settings-api.service.ts` |

### Modified

| File | Change |
|---|---|
| `apps/opticv-be/config/configuration.ts` | Added `supabase.serviceRoleKey` |
| `apps/opticv-be/config/validation.ts` | Added `SUPABASE_SERVICE_ROLE_KEY` Joi rule |
| `apps/opticv-be/src/app/cv/cv.module.ts` | Replaced direct `R2Service` provider with `StorageModule` import |
| `apps/opticv-be/src/app/cv/cv.service.ts` | Updated `r2.service.ts` import path to `../storage/r2.service` |
| `apps/opticv-be/src/app/users/users.module.ts` | Added `StorageModule`, `ConfigModule` imports; added `SupabaseClientProvider`, `SupabaseGuard` providers |
| `apps/opticv-be/src/app/users/users.service.ts` | Added `getProfile()` and `deleteAccount()` methods; injected `R2Service`, `ConfigService` |
| `apps/opticv-be/src/app/users/users.controller.ts` | Added `GET /users/me` and `DELETE /users/me` endpoints |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added `SubscriptionTier`, `SubscriptionStatus`, `UserProfile` types |
| `apps/opticv-web/src/app/app.routes.ts` | Added `/settings` lazy route with `authGuard` |
| `apps/opticv-web/src/app/layout/top-header/top-header.html` | Added avatar `routerLink="/settings"` |

---

## Components

| Component | Status |
|---|---|
| `Settings` (Angular page component) | Exist |
| `UserSettingsApiService` | Exist |
| `StorageModule` (NestJS) | Exist |
| `R2Service` (moved to `storage/`) | Exist |
| `UserProfileDto` (NestJS DTO) | Exist |

---

## Stores

No NgRx stores were specified or implemented for this task.

---

## Deviations from Plan

| Deviation | Detail |
|---|---|
| `UserSettingsApiService.getProfile()` not an `Observable` | Implemented as `httpResource` signal (`userProfile` exposed as a readonly resource signal) instead of a plain `Observable<UserProfile>` method |
| `settings.ts` uses `userProfile` resource signal | `isLoading`, `error`, and `hasValue` come from the `httpResource` resource object rather than separate `signal()` declarations as described in the plan |
| Settings link in top header | Implemented as a `routerLink="/settings"` on the avatar element in `top-header.html` rather than as a menu item added to `loggedInMenuItems` in `top-header.ts` |
| `SupabaseClientProvider` and `SupabaseGuard` added to `UsersModule` providers | Plan mentioned importing `StorageModule` and `ConfigModule` only; the actual implementation also adds these auth providers directly in the module |

---

## Additional Implementation

- `UserSettingsApiService` exposes a `reloadUserProfile()` method (not in spec or plan).
- `apps/opticv-web/src/app/layout/top-header/top-header.html` modified: avatar now has `class="mr-2 cursor-pointer"` and `routerLink="/settings"` to indicate navigability.
