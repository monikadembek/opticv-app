# Implementation Plan — Task 85: Add Display Name

## Source

- Specification: `specs/tasks/85-add-display-name/02-spec.md`
- Specification review: `specs/tasks/85-add-display-name/03-spec-review.md` — **PASS WITH ISSUES**

## Pre-Implementation Verification Note

The spec review flagged `@angular/forms/signals` as an unproven dependency. This was verified against the installed package (`@angular/forms@21.2.12`, `node_modules/@angular/forms/types/signals.d.ts` and `fesm2022/signals.mjs`):

- `form`, `submit`, `required`, `maxLength`, `schema` are confirmed real runtime exports of `@angular/forms/signals`.
- **Correction to the spec:** the spec's assumed template directive `Field` (used as `[field]="..."`) does **not** exist as a runtime directive. `Field` is a **type-only** export. The actual directive class is `FormField`, with selector `[formField]` and a required input aliased to `formField` (`static ɵdir: ...DirectiveDeclaration<FormField<any>, "[formField]", ["formField"], { "field": { alias: "formField"; required: true; isSignal: true } }, ...>`).
- All template bindings and imports below use `FormField` / `[formField]`, not `Field` / `[field]`.

This replaces the spec's "spike recommended" caveat — the API surface is now confirmed and the plan below is directly executable.

---

## Backend Changes (`apps/opticv-be`)

### 1. New file: `src/app/users/dto/update-display-name.dto.ts`

- Export `UpdateDisplayNameDto` class.
- Single field `displayName: string`.
- Decorators, in order, matching `UpdateJobApplicationDto` style (`update-job-application.dto.ts`):
  - `@ApiProperty({ example: 'Jane Doe', maxLength: 100 })` (required field, so `@ApiProperty`, not `@ApiPropertyOptional`, matching `UserProfileDto`'s required-field convention).
  - `@IsString()`
  - `@IsNotEmpty()`
  - `@MaxLength(100)`
- Import `IsString`, `IsNotEmpty`, `MaxLength` from `class-validator`; `ApiProperty` from `@nestjs/swagger`.

### 2. Modify `src/app/users/users.service.ts`

- Add method `updateDisplayName(supabaseId: string, dto: UpdateDisplayNameDto): Promise<UserProfile>`.
- Placement: after `getProfile`, before `getUsageStatus` (keeps profile-related methods grouped).
- Logic, following the `findUnique`-then-mutate pattern used elsewhere in this file:
  1. `findUnique({ where: { supabaseId }, include: { subscription: true } })`.
  2. If not found: `throw new NotFoundException('User not found.')`.
  3. `this.prisma.user.update({ where: { id: user.id }, data: { displayName: dto.displayName }, include: { subscription: true } })`.
  4. Map the updated record to the `UserProfile` shape exactly as `getProfile` does (`id`, `email`, `displayName`, `avatarUrl`, `subscription: ... ? { tier, status } : null`).
- Import `UpdateDisplayNameDto` from `./dto/update-display-name.dto`.

### 3. Modify `src/app/users/users.controller.ts`

- Add handler `updateDisplayName`, placed after `getProfile` and before `getUsageStatus`.
- Decorators, matching existing handler order/style (`@Get('me')` etc.):
  - `@Patch('me/display-name')`
  - `@UseGuards(SupabaseGuard)`
  - `@HttpCode(HttpStatus.OK)`
  - `@ApiOperation({ summary: 'Update current user display name' })`
  - `@ApiResponse({ status: 200, type: UserProfileDto, description: 'Updated user profile' })`
  - `@ApiResponse({ status: 400, description: 'Validation failed' })`
  - `@ApiResponse({ status: 401, description: 'Unauthorized' })`
  - `@ApiResponse({ status: 404, description: 'User not found' })`
- Signature: `async updateDisplayName(@CurrentUser() user: UserModel, @Body() dto: UpdateDisplayNameDto): Promise<UserProfileDto>`.
- Body: `return this.usersService.updateDisplayName(user.supabaseId, dto);`
- Add imports: `Patch` from `@nestjs/common`; `UpdateDisplayNameDto` from `./dto/update-display-name.dto`.
- Global validation pipe already strips/validates DTOs elsewhere in the app — no additional wiring needed (confirm `ValidationPipe` is registered globally before writing controller-level pipes; do not add a redundant one if so).

### 4. No Prisma schema changes

- `User.displayName` (`String?`) already exists. No migration.

---

## Frontend Changes (`apps/opticv-web`)

### 5. Modify `src/app/core/services/user-settings-api.service.ts`

- Add method:
  ```ts
  updateDisplayName(displayName: string): Observable<UserProfile> {
    return this.http.patch<UserProfile>(
      `${environment.apiUrl}/users/me/display-name`,
      { displayName },
    );
  }
  ```
- Placement: after `reloadUsageStatus()`, before `deleteAccount()`.
- No new imports required (`UserProfile` already imported).

### 6. Modify `src/app/features/settings/settings.ts`

- Remove `FormsModule` import and usage (full-name field only — `emailAddress` and the two `p-toggleswitch` bindings still use `[ngModel]`/`FormsModule`, so **keep** `FormsModule` in the `imports` array; it is still required by those other controls).
- Add imports from `@angular/forms/signals`: `form`, `submit`, `required`, `maxLength`, `FormField`.
- Add `FormField` to the component's `imports` array.
- Add a writable signal for the form model:
  ```ts
  readonly fullNameModel = signal({ displayName: '' });
  ```
- Add the form instance using the schema-function overload of `form()`:
  ```ts
  readonly fullNameForm = form(this.fullNameModel, (path) => {
    required(path.displayName, { message: 'Full name is required.' });
    maxLength(path.displayName, 100, { message: 'Full name must be 100 characters or fewer.' });
  });
  ```
- Add a pending-state signal for the Save button, following the `isDeleting` pattern:
  ```ts
  readonly isSavingName = signal(false);
  ```
- Add an `effect()` (or equivalent, evaluated in `ngOnInit`/constructor context per Angular signal rules) that initializes `fullNameModel` from the loaded profile **once**, without overwriting user edits:
  - Track whether the model has already been initialized from a loaded profile with a local boolean flag (e.g. `#initializedFromProfile = false`) set the first time `userProfile.hasValue()` becomes true.
  - On that first transition, `this.fullNameModel.set({ displayName: userProfile.value()?.displayName ?? '' })`.
  - This satisfies the spec's edge case: form is only initialized from the profile value once, not continuously overwritten.
- Add a save handler method `onSaveName(): Promise<void>`:
  1. `const valid = await submit(this.fullNameForm, async (form) => { ... })` — per the `submit()` signature (`submit<TModel>(form: FieldTree<TModel>, options?: FormSubmitOptions): Promise<boolean>` or the action-callback overload), use the callback overload so the HTTP call and success/error handling run only after validation passes.
  2. Inside the submit action callback:
     - Set `this.isSavingName.set(true)`.
     - Call `this.userSettingsApiService.updateDisplayName(this.fullNameModel().displayName.trim())`.
     - On success (via RxJS subscribe or converted to a promise, consistent with the callback being `async`): call `this.userSettingsApiService.reloadUserProfile()`, show success toast (`severity: 'success', summary: 'Success', detail: 'Full name updated.'`), set `isSavingName` to `false`.
     - On error: show error toast (`severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to update full name. Please try again.'`), set `isSavingName` to `false`. Do not reset `fullNameModel` (preserves the spec's "leave the field's current value as-is" requirement).
  3. If `submit()` resolves `false` (validation failed), do nothing further — inline errors are already exposed via the form's field state and rendered in the template; no HTTP call, no `isSavingName` toggling.
- Trim before sending: apply `.trim()` to the value passed to `updateDisplayName()` at the call site (per spec's edge case on client-side trimming); do not mutate the model value itself.

### 7. Modify `src/app/features/settings/settings.html`

- In the "Full name" block (lines ~46–69 of the current file):
  - Remove `#profileForm="ngForm"` from the `<form>` tag if it is only used for the full-name field — check whether `emailAddress` inputs rely on the same `ngForm` reference; if not referenced elsewhere, the `<form>` tag's template reference variable can be dropped, but the `<form>` element itself must stay (it still wraps the email field).
  - Replace:
    ```html
    <input pInputText id="fullName" name="fullName" [ngModel]="userProfile.value()?.displayName ?? ''" class="flex-1" />
    ```
    with:
    ```html
    <input pInputText id="fullName" [formField]="fullNameForm.displayName" class="flex-1" />
    ```
  - Remove the `name="fullName"` attribute (no longer needed without `ngModel`/`ngForm`).
  - Add an inline validation error element below the input, shown when the field is invalid and touched/dirty (exact visibility condition to follow existing FieldState API — e.g. `fullNameForm.displayName().errors()` combined with a touched check), styled consistently with existing error text (`text-red-600 text-sm`, matching the `userProfile.error()` block's `role="alert"` pattern at line 12).
  - Update the Save button:
    ```html
    <button
      pButton
      type="button"
      label="Save name"
      severity="success"
      [loading]="isSavingName()"
      [disabled]="isSavingName()"
      (click)="onSaveName()"
      aria-label="Save name"
      class="w-[125px]"
    ></button>
    ```
    - Remove the hardcoded `[disabled]="true"`.
    - Button remains a `type="button"` with `(click)` handler (not native form submit), consistent with the spec's "submit() triggered on click" behavior and the existing pattern for the "Delete account" `p-button` (`[loading]="isDeleting()"`).

---

## Test Changes

### 8. Backend: new/modified test files

- `apps/opticv-be/src/app/users/users.service.spec.ts` (or create if it doesn't exist — check first): add tests for `updateDisplayName`:
  - Success case: user found, `prisma.user.update` called with correct `where`/`data`, returns mapped `UserProfile`.
  - Not-found case: `prisma.user.findUnique` returns `null` → `NotFoundException` thrown, `prisma.user.update` not called.
- `apps/opticv-be/src/app/users/users.controller.spec.ts` (or create if it doesn't exist — check first): add test for `updateDisplayName` route wiring — controller delegates to `usersService.updateDisplayName(user.supabaseId, dto)` and returns its result; confirm `@UseGuards(SupabaseGuard)` is present (existing convention for asserting guard metadata, if used elsewhere in this file).
- DTO validation: add a `class-validator`-driven test (or e2e case) confirming empty string and 101-character string fail validation for `UpdateDisplayNameDto`, and a 100-character string passes.

### 9. Frontend: modify `apps/opticv-web/src/app/features/settings/settings.spec.ts`

- Update `createUserSettingsMock` to include `updateDisplayName: vi.fn().mockReturnValue(of(mockProfile))`.
- Update/replace the existing "profile card" tests that assert the Save name button is disabled (lines 341–350) — this assertion must change since the button is no longer hardcoded-disabled; replace with a test asserting the button is enabled by default (not gated on dirty/valid state, per spec item 2).
- Add new tests under "profile card" or a new "full name form" describe block:
  - Submitting a valid name (non-empty, ≤100 chars) calls `userSettingsApiService.updateDisplayName` with the trimmed value, then calls `reloadUserProfile()`, then shows a success toast.
  - Submitting an empty/whitespace-only name shows an inline validation error, does not call `updateDisplayName`.
  - Submitting a name over 100 characters shows an inline validation error, does not call `updateDisplayName`.
  - An error response from `updateDisplayName` shows an error toast and leaves the input's current value unchanged (does not call `reloadUserProfile()`).
  - `isSavingName` is `true` while the request is in flight and the Save button reflects `[loading]`/`[disabled]`.
- Keep existing "pre-fills the full name input with displayName" and "falls back to an empty string when displayName is null" tests — verify they still pass against the new `[formField]` binding (may need to adjust `await fixture.whenStable()` timing if the initialization effect requires an extra tick).

---

## Acceptance Checklist

- [ ] `nx build opticv-be` passes.
- [ ] `nx build opticv-web` passes.
- [ ] `nx lint opticv-be` and `nx lint opticv-web` pass.
- [ ] `nx typecheck opticv-be` and `nx typecheck opticv-web` pass.
- [ ] `nx test opticv-be` passes, including new `updateDisplayName` service/controller/DTO tests.
- [ ] `nx test opticv-web` passes, including new/updated `settings.spec.ts` tests.
- [ ] No changes to `GET /users/me`, `GET /users/me/usage`, `DELETE /users/me` response shapes or behavior.
- [ ] Manual check in a running dev instance: entering a name and clicking "Save name" persists it, refreshes the displayed name and avatar initials, and shows a success toast; an empty/over-limit name shows an inline error and makes no request; a simulated API error shows an error toast and keeps the typed value.

---

## Files Touched Summary

**New:**
- `apps/opticv-be/src/app/users/dto/update-display-name.dto.ts`

**Modified (Backend):**
- `apps/opticv-be/src/app/users/users.service.ts`
- `apps/opticv-be/src/app/users/users.controller.ts`
- `apps/opticv-be/src/app/users/users.service.spec.ts` (or created)
- `apps/opticv-be/src/app/users/users.controller.spec.ts` (or created)

**Modified (Frontend):**
- `apps/opticv-web/src/app/core/services/user-settings-api.service.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`

**Not touched:**
- `packages/shared/datatypes/src/lib/datatypes.ts` (no changes needed)
- Prisma schema (no changes needed)
