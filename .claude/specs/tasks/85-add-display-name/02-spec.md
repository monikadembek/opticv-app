# Task Specification

## Source

Azure DevOps Task: 85 — Implement adding user full name (BE & FE)

## Goal

Allow a logged-in user to set/update their full name (`displayName`) from the Account Settings page. Add a backend endpoint to persist it, and rework the existing frontend "Full name" form from a template-driven form to a signal form wired to the new endpoint.

## Context

- Frontend: `apps/opticv-web/src/app/features/settings/settings.ts` + `settings.html` (Account Settings page, redesigned in Task 84).
- Frontend API access: `apps/opticv-web/src/app/core/services/user-settings-api.service.ts`.
- Backend: `apps/opticv-be/src/app/users/` (`users.controller.ts`, `users.service.ts`, `dto/`).
- DB: `User.displayName` column already exists in `apps/opticv-be/prisma/schema.prisma` (`String?`, nullable) — no migration needed.
- Shared types: `packages/shared/datatypes/src/lib/datatypes.ts` (`User`, `UserProfile` already expose `displayName`).

## Scope

### In scope

- New backend endpoint to update the current user's `displayName`.
- Request DTO with validation: required, non-empty, max length 100.
- Frontend: convert the "Full name" block of the profile form in `settings.html` from template-driven (`ngForm` / `FormsModule` / `[ngModel]`) to Angular Signal Forms (`@angular/forms/signals`).
- Wire the "Save name" button to submit the signal form and call the new endpoint.
- On success: reload the user profile resource and show a success toast (PrimeNG `MessageService`, consistent with existing usage in `Settings`).
- On error: show an error toast; keep the entered value in the field.
- Client-side and server-side validation: required (non-empty after trim), max 100 characters.

### Out of scope

- "Change email" button/flow (remains disabled, per current code — unrelated to this task).
- Avatar upload/change.
- Any general-purpose/multi-field profile update endpoint. This task only adds a `displayName`-scoped endpoint.
- Clearing/removing an existing display name (empty submissions are rejected, not treated as "clear to null").
- Adding a DB-level varchar length constraint/migration (validation is enforced at the DTO layer only, consistent with existing conventions in the codebase, e.g. `UpdateJobApplicationDto`).

## Behavior

### Frontend

1. The "Full name" field in the profile form is converted to use Angular Signal Forms:
   - A form model signal is created (e.g. `{ displayName: string }`), initialized from `userProfile.value()?.displayName ?? ''` and kept in sync if the profile resource reloads/changes before the user edits the field.
   - Field validators: required (non-empty after trim) and `maxLength(100)`.
   - The `Field` directive binds the `fullName` input to the form's `displayName` field.
2. The "Save name" button:
   - Is **always enabled** (not gated on dirty/valid state).
   - On click, triggers form submission (`submit()`), which runs validation first.
   - If validation fails (empty or > 100 chars), inline validation error(s) are shown under the input and no HTTP call is made.
   - If validation passes, calls a new method on `UserSettingsApiService` (e.g. `updateDisplayName(displayName: string)`) that issues `PATCH /users/me/display-name` with `{ displayName }`.
3. On success response:
   - Call `reloadUserProfile()` to refresh the `httpResource` (this also updates the avatar initials and any header/name display bound to `userProfile`).
   - Show a success toast via `MessageService` (e.g. summary "Success", detail "Full name updated.").
4. On error response:
   - Show an error toast via `MessageService` (e.g. summary "Error", detail derived from the API error or a generic fallback message).
   - Leave the field's current (unsaved) value as-is so the user doesn't lose their input.
5. While the save request is in flight, the Save button shows a loading/pending state (consistent with existing loading patterns in `Settings`, e.g. `isDeleting` signal used for account deletion) and is disabled to prevent duplicate submissions.

### Backend

1. New endpoint: `PATCH /api/users/me/display-name`
   - Guarded by `SupabaseGuard` (same as other `/users/me*` endpoints).
   - Current user resolved via `@CurrentUser() user: UserModel`.
   - Request body: `UpdateDisplayNameDto { displayName: string }`.
   - Validation (class-validator): `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)`.
   - Service method (e.g. `usersService.updateDisplayName(supabaseId, dto)`):
     - Looks up the user (consistent with existing `findUnique`-then-mutate pattern used by `getProfile`/`deleteAccount`); throws `NotFoundException('User not found.')` if missing.
     - Updates `displayName` via `this.prisma.user.update(...)`.
     - Returns the updated profile in the same shape as `getProfile` (`UserProfileDto`/`UserProfile`), so the frontend has a consistent response type available (even though the frontend will reload via the existing `GET /users/me` resource rather than consuming this response body directly).
   - `@HttpCode(HttpStatus.OK)` explicit decorator, matching existing controller conventions.
   - Swagger decorators (`@ApiOperation`, `@ApiResponse` for 200/400/401/404) following the exact style used in `job-application.controller.ts` / existing `users.controller.ts` endpoints.

## Edge Cases

- **Empty / whitespace-only input:** rejected both client-side (required validator) and server-side (`@IsNotEmpty()` — note: trim client-side before validating/submitting so whitespace-only doesn't pass as "non-empty"; server-side validation acts on the value as sent).
- **Input exactly 100 characters:** allowed (boundary case, `maxLength(100)` / `@MaxLength(100)` are inclusive).
- **Input over 100 characters:** rejected client-side (inline error, no request sent) and server-side (400 Bad Request) as a defense-in-depth measure.
- **User not found on the backend** (edge case, e.g. race with account deletion): `404 Not Found`, surfaced to the frontend as a generic error toast.
- **Network/server error during save:** error toast shown; form retains the user's entered value; Save button returns to its normal (non-loading) enabled state so the user can retry.
- **Rapid double-click on Save:** button is disabled while the request is in flight to prevent duplicate submissions.
- **Profile resource reloads/changes externally while the user is mid-edit:** out of scope to reconcile; the form model is only initialized from the profile value, not continuously overwritten after the user starts typing (standard signal forms behavior with an initial value).

## Data / API

### Endpoint

`PATCH /api/users/me/display-name`

- Auth: Supabase bearer token (`SupabaseGuard`).
- Request body:
  ```json
  { "displayName": "Jane Doe" }
  ```
- Success response `200 OK`: updated `UserProfileDto` (same shape as `GET /users/me`):
  ```json
  {
    "id": "...",
    "email": "...",
    "displayName": "Jane Doe",
    "avatarUrl": null,
    "subscription": null
  }
  ```
- Error responses:
  - `400 Bad Request` — validation failure (empty, or > 100 characters).
  - `401 Unauthorized` — missing/invalid session.
  - `404 Not Found` — user record not found.

### New files / changes

**Backend (`apps/opticv-be`):**
- `src/app/users/dto/update-display-name.dto.ts` (new) — `UpdateDisplayNameDto` with `displayName: string`, decorated with `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)`, `@ApiProperty({ maxLength: 100 })`.
- `src/app/users/users.service.ts` — add `updateDisplayName(supabaseId: string, dto: UpdateDisplayNameDto): Promise<UserProfile>`.
- `src/app/users/users.controller.ts` — add `@Patch('me/display-name')` handler, guarded, using `@CurrentUser()` and `@Body()`.
- No Prisma schema changes (column already exists as `displayName String?`).

**Frontend (`apps/opticv-web`):**
- `src/app/core/services/user-settings-api.service.ts` — add `updateDisplayName(displayName: string): Observable<UserProfile>` calling `this.http.patch<UserProfile>(\`${environment.apiUrl}/users/me/display-name\`, { displayName })`.
- `src/app/features/settings/settings.ts` — replace `FormsModule` usage for the full-name field with `@angular/forms/signals` (`form`, `Field`, `maxLength`, `submit`); add a save handler method that submits the form, calls the service method, and reacts to success/error (reload + toast / error toast); add a saving/pending signal to drive the Save button's loading/disabled state.
- `src/app/features/settings/settings.html` — replace `[ngModel]`/`ngForm` full-name markup with the `Field` directive bound to the signal form; bind the Save button's `(click)`/loading state to the new submit handler and pending signal; add an inline validation error message element for the full-name field (required / max length).

**Shared types (`packages/shared/datatypes`):** no changes required — `UserProfile` already includes `displayName: string | null`, which is reused as the response shape for the new endpoint.

## Acceptance (DEV)

- `nx build opticv-be` and `nx build opticv-web` pass.
- `nx lint`, `nx typecheck` pass for both projects.
- Backend: unit tests for `UsersService.updateDisplayName` (success, not-found) and `UsersController` route wiring/guard.
- Backend: DTO validation tests (or covered via e2e) for empty and >100-char `displayName`.
- Frontend: updated/added tests in `settings.spec.ts` covering: submit with valid name calls the service and reloads profile; submit with empty/over-limit name shows validation error and does not call the service; error response shows error toast without clearing the input.
- No breaking changes to existing `GET /users/me`, `GET /users/me/usage`, `DELETE /users/me` endpoints or their consumers.
- Manual check: Save name button in Account Settings persists the name, refreshes displayed name/avatar initials, and shows appropriate success/error feedback.
