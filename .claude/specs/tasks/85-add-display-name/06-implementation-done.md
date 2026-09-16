# Implementation Done — Task 85: Add Display Name

## Summary

A backend endpoint `PATCH /api/users/me/display-name` was added, guarded by `SupabaseGuard`, validating the request body via a new `UpdateDisplayNameDto` and persisting the change through `UsersService.updateDisplayName`. On the frontend, the "Full name" field in the Account Settings profile form was converted from a template-driven (`ngModel`) input to an Angular Signal Form (`@angular/forms/signals`), wired to a new `UserSettingsApiService.updateDisplayName()` method that calls the new endpoint, with success/error toast feedback and a loading state on the Save button. Backend and frontend tests were added/updated accordingly.

---

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Backend: `PATCH /api/users/me/display-name` endpoint, guarded by `SupabaseGuard` | Implemented | `users.controller.ts` |
| Backend: `UpdateDisplayNameDto` — required, non-empty, max length 100 | Implemented | Also includes `@MinLength(2)`, not specified in the spec |
| Backend: `UsersService.updateDisplayName` — findUnique → 404 if missing → update → return `UserProfile` | Implemented | `users.service.ts` |
| Backend: Swagger decorators (`@ApiOperation`, `@ApiResponse` 200/400/401/404) | Implemented | `users.controller.ts` |
| Frontend: convert "Full name" field to Angular Signal Forms | Implemented | `settings.ts`, `settings.html` |
| Frontend: field validators — required (non-empty after trim) and `maxLength(100)` | Implemented | Also includes `minLength(2)`, not specified in the spec |
| Frontend: `Field`/`FormField` directive binds input to form's `displayName` field | Implemented | Uses `[formField]="fullNameForm.displayName"` (`FormField`, per corrected plan) |
| Frontend: Save button always enabled (not gated on dirty/valid state) | Implemented | Button `disabled` binding is tied only to `isSavingName()`; the click/submit handler internally also checks `dirty()` before proceeding |
| Frontend: on submit, run validation first; show inline errors and skip HTTP call if invalid | Implemented | `onSubmit()` in `settings.ts`, inline error markup in `settings.html` |
| Frontend: on validation pass, call `UserSettingsApiService.updateDisplayName()` via `PATCH /users/me/display-name` | Implemented | `user-settings-api.service.ts` |
| Frontend: on success, call `reloadUserProfile()` and show success toast | Implemented | `settings.ts` |
| Frontend: on error, show error toast and leave field value unchanged | Implemented | `settings.ts` |
| Frontend: Save button shows loading/pending state and is disabled while in flight | Implemented | `isSavingName` signal bound to `[loading]`/`[disabled]` |
| Edge case: empty/whitespace-only input rejected client- and server-side | Implemented | `required` validator (FE) + `@IsNotEmpty()` (BE); client trims before sending |
| Edge case: input exactly 100 characters allowed | Implemented | Covered by DTO test and form validator |
| Edge case: input over 100 characters rejected client- and server-side | Implemented | `maxLength(100)` (FE) + `@MaxLength(100)` (BE) |
| Edge case: user not found on backend → 404 → generic error toast | Implemented | `NotFoundException` in service; generic error toast on FE for API errors |
| Edge case: network/server error during save → error toast, retains value, button returns to normal state | Implemented | `catchError` in `onSubmit()` |
| Edge case: rapid double-click prevented via disabled state while in flight | Implemented | `[disabled]="isSavingName()"` |
| Edge case: profile resource reload does not continuously overwrite mid-edit form | Not implemented | `effect()` in `settings.ts` sets `fullNameModel` on every `userProfile.value()` emission, with no one-time-initialization guard |
| No Prisma schema changes | Implemented | No migration added |
| Backend unit tests: `UsersService.updateDisplayName` (success, not-found) | Implemented | `users.service.spec.ts` |
| Backend unit tests: `UsersController` route wiring/guard | Implemented | `users.controller.spec.ts` |
| Backend DTO validation tests (empty, >100 chars) | Implemented | `update-display-name.dto.spec.ts` (also includes minLength-related test cases not in spec) |
| Frontend tests: valid submit calls service + reloads profile | Implemented | `settings.spec.ts` ("onSubmit" describe block) |
| Frontend tests: empty/over-limit submit shows validation error, no service call | Implemented | `settings.spec.ts` |
| Frontend tests: error response shows error toast, input not cleared | Implemented | `settings.spec.ts` |
| No breaking changes to existing `GET /users/me`, `GET /users/me/usage`, `DELETE /users/me` | Implemented | Endpoints/handlers unchanged |

---

## Files

### Created

- `apps/opticv-be/src/app/users/dto/update-display-name.dto.ts`
- `apps/opticv-be/src/app/users/dto/update-display-name.dto.spec.ts`

### Modified

- `apps/opticv-be/src/app/users/users.controller.ts`
- `apps/opticv-be/src/app/users/users.controller.spec.ts`
- `apps/opticv-be/src/app/users/users.service.ts`
- `apps/opticv-be/src/app/users/users.service.spec.ts`
- `apps/opticv-web/src/app/core/services/user-settings-api.service.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
- `docs/tasks-list.md`

---

## Components

| Component | Status |
| --- | --- |
| `UpdateDisplayNameDto` | Exist |
| `UsersService.updateDisplayName` | Exist |
| `UsersController` — `PATCH me/display-name` handler | Exist |
| `UserSettingsApiService.updateDisplayName` | Exist |
| `Settings` — signal form (`fullNameModel`, `fullNameForm`) | Exist |
| `Settings` — save handler | Exist, named `onSubmit(event: Event)` (plan named it `onSaveName()`) |
| `Settings` — pending-state signal (`isSavingName`) | Exist |

---

## Stores

Not applicable — no NgRx Signal Store introduced or modified by this task.

---

## Deviations

- Plan's assumed template directive `Field`/`[field]` (as originally drafted in the spec) was corrected in the plan itself to `FormField`/`[formField]`; the implementation uses `FormField`/`[formField]`, consistent with the corrected plan.
- Plan step 6 specifies a save handler named `onSaveName()` using the `submit()` function from `@angular/forms/signals`. The implementation instead defines `onSubmit(event: Event)`, which reads `this.fullNameForm().invalid()` and `this.fullNameForm().dirty()` directly rather than calling `submit()`.
- Plan step 7 specifies the Save button as `type="button"` with `(click)="onSaveName()"` and `class="w-[125px]"`. The implementation uses `type="submit"` inside a `<form (submit)="onSubmit($event)">` element, and `class="w-[150px]"`.
- Plan step 6 specifies initializing `fullNameModel` from the profile once, tracked via a boolean flag (e.g., `#initializedFromProfile`), so the model is not overwritten after the user starts editing. The implementation's `effect()` sets `fullNameModel` on every `userProfile.value()` emission with no such flag.
- The form's field validators (both backend DTO and frontend schema) include an additional `minLength` rule (`@MinLength(2)` on the DTO, `minLength(path.displayName, 2, ...)` in the frontend form schema) not present in the plan or spec, which specify only `required` and `maxLength(100)`.

---

## Additional Implementation

> Additional implementation not covered by the original documents.

- Backend: `@MinLength(2)` validation on `UpdateDisplayNameDto.displayName`, plus corresponding test cases in `update-display-name.dto.spec.ts` (2-character pass, 1-character fail).
- Frontend: `minLength(path.displayName, 2, { message: 'Name must be at least 2 characters long' })` validator in the `fullNameForm` schema in `settings.ts`.
- Frontend: `nameSubmitted` signal in `settings.ts`, used to control inline error visibility (in addition to the field's `touched()` state), not mentioned in the plan.
