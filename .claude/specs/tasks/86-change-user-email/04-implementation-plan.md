# Implementation Plan — Task 86: Change User Email

## Source

- Specification: `02-spec.md`
- Specification review: `03-spec-review.md` (result: PASS WITH ISSUES — no blocking issues; two clarifications resolved below)

## Pre-Implementation Clarifications (resolved from spec review)

1. **UI layout choice** — the existing "Email address" field becomes an editable input bound to the new Signal Forms model (`newEmailForm.newEmail`), replacing the current read-only `[ngModel]` binding. No separate adjacent field is added. This matches the existing single-field layout used for "Full name" and keeps the section visually consistent.
2. **Posthog event names/payloads and copy strings** — treated as proposed defaults from the spec, not immutable requirements. They are implemented as specified below but may be adjusted during code review without requiring a spec change.

## Verified Technical Facts

- `email` validator is available in `@angular/forms/signals` (`node_modules/@angular/forms/types/signals.d.ts`), exported alongside `required`, `maxLength`, `minLength`, `pattern`. It will be used instead of a hand-rolled `pattern` regex.
- `validate` is available in `@angular/forms/signals` for the custom "must differ from current email" rule.
- `Supabase` service currently exposes `#pendingEmail` (signal), `pendingEmail` getter, `setPendingEmail()`, `signInWithOtp()`, `verifyOtp()`, `signOut()`, `getSession()`, `initAuth()`. No `#pendingEmailChange` exists yet.
- `authGuard` (`apps/opticv-web/src/app/core/auth/guards/auth-guard.ts`) checks `supabase.getSession()`; suitable unmodified for the new `/settings/verify-email` route.
- `Settings` component already injects `ConfirmationService` (provided at component level) and `MessageService`; the "Delete account" flow is the confirm-dialog + toast pattern to mirror.
- `Settings` already uses Signal Forms (`form()`, `FormField`, `required`, `maxLength`, `minLength`) for `fullNameForm` — the same pattern applies to the new `newEmailForm`.
- `Verify` page pattern (`verify.ts`/`verify.html`) uses `NgForm`-based `InputOtp`, `errorMessage` signal, `isSubmitting` signal, `posthog.capture(...)` on submit — this is the template for `VerifyEmailChange`.
- Existing `supabase.spec.ts` mocks `mockAuth` with `vi.fn()` per Supabase Auth method; new methods (`updateUser`) must be added to this mock.

## Step-by-Step Plan

### 1. `Supabase` service — add email-change support

File: `apps/opticv-web/src/app/core/auth/services/supabase.ts`

- Add private signal `#pendingEmailChange = signal<string | null>(null)`.
- Add readonly getter `pendingEmailChange` returning `this.#pendingEmailChange.asReadonly()`.
- Add method `setPendingEmailChange(email: string | null)` — mirrors `setPendingEmail`.
- Add method `updateEmail(newEmail: string)` — calls `this.supabase.auth.updateUser({ email: newEmail })`, returns the result.
- Add method `verifyEmailChange(code: string, newEmail: string)` — calls `this.supabase.auth.verifyOtp({ email: newEmail, token: code, type: 'email_change' })`, returns the result.
- Do NOT reset `#pendingEmailChange` inside `initAuth()`'s auth-state-change handlers (`INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`) — this signal's lifecycle is owned by the settings/verify-email-change flow only, per spec's isolation requirement from `#pendingEmail`.

### 2. `Supabase` service tests

File: `apps/opticv-web/src/app/core/auth/services/supabase.spec.ts`

- Add `updateUser: vi.fn()` to `mockAuth`.
- Add test group `pendingEmailChange` mirroring the existing `storePendingEmail()` group: stores a non-null email, clears on `null`.
- Add test group `updateEmail()`: asserts `mockAuth.updateUser` called with `{ email: newEmail }`.
- Add test group `verifyEmailChange()`: asserts `mockAuth.verifyOtp` called with `{ email: newEmail, token: code, type: 'email_change' }`.
- Add assertion in the `initialises signals to null` test: `service.pendingEmailChange()` is `null`.
- Confirm (add if missing) that `SIGNED_IN`/`SIGNED_OUT`/`INITIAL_SESSION` handlers do not touch `pendingEmailChange` — add a regression test setting `pendingEmailChange` then firing `SIGNED_IN`, asserting it is unchanged.

### 3. New route — `/settings/verify-email`

File: `apps/opticv-web/src/app/app.routes.ts`

- Add a new route entry after the existing `settings` route:
  - `path: 'settings/verify-email'`
  - `loadComponent: () => import('./core/auth/pages/verify-email-change/verify-email-change').then((c) => c.VerifyEmailChange)`
  - `canActivate: [authGuard]`

### 4. New component — `VerifyEmailChange`

Files (new):

- `apps/opticv-web/src/app/core/auth/pages/verify-email-change/verify-email-change.ts`
- `apps/opticv-web/src/app/core/auth/pages/verify-email-change/verify-email-change.html`
- `apps/opticv-web/src/app/core/auth/pages/verify-email-change/verify-email-change.css` (reuse/copy structure from `verify.css` if shared styling is needed; confirm during implementation whether `verify.css` can be reused directly via relative import or must be duplicated — prefer duplicating a minimal copy to keep components independent, consistent with `verify.css` being colocated per component)

Component (`verify-email-change.ts`), modeled directly on `verify.ts`:

- Standalone component, `changeDetection: OnPush`.
- Imports: `InputOtpModule`, `FormsModule`, `ButtonModule`, `MessageModule`, `RouterLink` (only if a "cancel/back" link is needed — confirm against spec: spec does not mention a back link for this page, so omit `RouterLink` unless a "Back to settings" affordance is added; default to omitting per minimal-footprint rule).
- Injects `Supabase`, `Router`.
- Signals: `errorMessage = signal('')`, `isSubmitting = signal(false)`.
- `code = ''` (template-driven, matching `Verify`'s `NgForm` pattern).
- `computed` `isEmailChangePending = computed(() => !!this.supabase.pendingEmailChange())`.
- `ngOnInit()`: if `!isEmailChangePending()`, `this.router.navigate(['/settings'])`.
- `onSubmit(form: NgForm)`:
  - Reset `errorMessage`, set `isSubmitting(true)`.
  - If `form.valid`:
    - `posthog.capture('email_change_verifyotp_executed', { page: 'verify-email-change' })`.
    - Call `this.supabase.verifyEmailChange(code, this.supabase.pendingEmailChange() as string)`.
    - On success (session/data returned without error): `this.supabase.setPendingEmailChange(null)`, show success message (spec text: "Email updated. Please sign in again." — surfaced via `MessageModule` inline or a toast if `MessageService` is introduced; per spec section it says "shows a success toast/message" — use the same `MessageModule` inline pattern as `Verify`'s error display to stay consistent within this component, since `MessageService`/`Toast` is not part of this component's existing imports), call `await this.supabase.signOut()`, then `this.router.navigate(['/login'])`.
    - On error: set `errorMessage` to a fixed string ("Invalid or expired code. Please try again."), set `isSubmitting(false)`.

Template (`verify-email-change.html`), modeled on `verify.html`:

- Same `auth-container`/`auth-card` structure.
- Heading: "Confirm your new email".
- Subtitle referencing `supabase.pendingEmailChange()`, e.g. "Enter the code sent to `{{ supabase.pendingEmailChange() }}`." — expose `supabase` as a protected/public readonly field on the component for template access (`protected readonly supabase = inject(Supabase)`), consistent with Angular convention of exposing injected services needed directly in templates.
- `p-inputotp` bound to `code`, `length="6"`, `integerOnly`.
- Submit button "Verify and update email", `[loading]="isSubmitting()"`.
- Error message block via `p-message`, same pattern as `verify.html`.
- No "Wrong email? Go back" footer link (no resend/cancel affordance in scope per spec).

### 5. `Settings` component — email-change form

File: `apps/opticv-web/src/app/features/settings/settings.ts`

- Import additions: `validate` (or reuse `email` validator) from `@angular/forms/signals`; `email` validator.
- Add signal `isChangingEmail = signal(false)`.
- Add `newEmailModel = signal({ newEmail: '' })`.
- Add `newEmailForm = form(this.newEmailModel, (path) => { ... })` with:
  - `required(path.newEmail, { message: 'New email is required.' })`
  - `email(path.newEmail, { message: 'Enter a valid email address.' })`
  - `validate(path.newEmail, (ctx) => ctx.value() === this.userProfile.value()?.email ? { kind: 'sameEmail', message: 'New email must be different from your current email.' } : null)` — exact `validate` signature to be confirmed against the `@angular/forms/signals` typings during implementation (custom validators return `ValidationError`-shaped objects or `null`); use the library's documented custom-validator pattern.
- Extend the `constructor()`'s existing `effect()` (or add a new one) to seed `newEmailModel` with the current email when `userProfile.value()` changes — mirrors the `fullNameModel.set(...)` seeding.
- Add method `onChangeEmail(): void`:
  - Validate `newEmailForm().invalid()`; if invalid, return (inline errors render from `newEmailForm.newEmail().errors()`).
  - If valid, call `this.confirmationService.confirm({...})`:
    - `header: 'Change email'`
    - `message: `We'll send a confirmation code to ${newEmail}. You'll need to sign in again with your new email after confirming.``
    - `acceptLabel: 'Send code'`, `rejectLabel: 'Cancel'`
    - `accept:` callback:
      - `posthog.capture('email_change_requested', { page: 'settings' })`.
      - `isChangingEmail.set(true)`.
      - Call `this.supabase.updateEmail(newEmail)` (returns a Promise from Supabase JS SDK — handle via `async`/`await` inside the `accept` callback, consistent with `onDeleteAccount`'s use of `tap(async () => ...)` for async work, but since this is a direct Supabase promise rather than an RxJS observable, use a plain `async accept()` arrow function).
      - On success (no `error` in the response): `this.supabase.setPendingEmailChange(newEmail)`, `this.router.navigate(['/settings/verify-email'])`.
      - On error: `this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message ?? 'Failed to start email change. Please try again.' })`, `isChangingEmail.set(false)` (entered value remains in `newEmailModel` — no reset).
- A `newEmailSubmitted` signal (mirroring `nameSubmitted`) may be needed to control when inline errors show before first blur — add `newEmailSubmitted = signal(false)`, set to `true` at the start of `onChangeEmail()`.

### 6. `Settings` template — enable and wire the email field

File: `apps/opticv-web/src/app/features/settings/settings.html`

- Replace the existing read-only email `<form>` block (lines ~78–103) with a Signal Forms–bound editable input:
  - `<input pInputText id="emailAddress" [formField]="newEmailForm.newEmail" class="w-full sm:flex-1" />` replacing the current `[ngModel]` binding.
  - Change the button: remove `[disabled]="true"`; add `[loading]="isChangingEmail()"`, `[disabled]="isChangingEmail()"`, `(onClick)="onChangeEmail()"` (or `(click)=...` matching the `pButton` directive's existing click-binding convention used elsewhere — confirm against the "Delete account" button which uses `(onClick)` on `p-button`; this is a native `button[pButton]`, so use `(click)`, matching the "Save name" button's native submit pattern, but since this field's button is `type="button"` not `type="submit"`, wire `(click)="onChangeEmail()"` directly rather than a form submit handler).
  - Add inline validation error markup below the input, mirroring the full-name field's pattern:
    ```
    @if ((newEmailForm.newEmail().touched() || newEmailSubmitted()) && newEmailForm.newEmail().errors().length > 0) {
      <p class="mt-1 text-sm text-red-600" role="alert">
        {{ newEmailForm.newEmail().errors()[0].message }}
      </p>
    }
    ```

### 7. `Settings` component tests

File: `apps/opticv-web/src/app/features/settings/settings.spec.ts` (extend existing file — read it first to match existing mocking conventions for `UserSettingsApiService`, `ConfirmationService`, `MessageService`, `Supabase`, `Router` before adding new tests)

- Test: submitting with empty new email shows required error, does not call `confirmationService.confirm` / `supabase.updateEmail`.
- Test: submitting with invalid email format shows format error, no confirm dialog triggered.
- Test: submitting with the same email as current shows "must differ" error, no confirm dialog triggered.
- Test: submitting a valid different email opens the confirm dialog (assert `confirmationService.confirm` called with expected `header`/`message`/labels).
- Test: confirming the dialog calls `supabase.updateEmail(newEmail)`; on success, calls `supabase.setPendingEmailChange(newEmail)` and `router.navigate(['/settings/verify-email'])`.
- Test: confirming the dialog when `updateEmail` errors shows an error toast via `messageService.add` and preserves the entered email value; `isChangingEmail` returns to `false`.
- Test: rejecting the confirm dialog results in no `supabase.updateEmail` call and preserves form state.

### 8. `VerifyEmailChange` component tests (new)

File: `apps/opticv-web/src/app/core/auth/pages/verify-email-change/verify-email-change.spec.ts` (new, modeled on `verify.spec.ts` — read `verify.spec.ts` first to match its `TestBed`/mocking structure exactly)

- Test: `ngOnInit` navigates to `/settings` when `supabase.pendingEmailChange()` is falsy.
- Test: `ngOnInit` does not navigate when `pendingEmailChange()` has a value.
- Test: valid code submit calls `supabase.verifyEmailChange(code, pendingEmailChange)`, then on success calls `supabase.setPendingEmailChange(null)`, `supabase.signOut()`, and navigates to `/login`.
- Test: invalid/error code submit sets `errorMessage` and does not navigate or sign out.
- Test: `posthog.capture` called with `'email_change_verifyotp_executed'` and `{ page: 'verify-email-change' }` on submit attempt.

### 9. No backend changes

- Confirm no files under `apps/opticv-be` are touched — this task is frontend-only per spec's "Out of scope."

### 10. Supabase dashboard configuration (manual, non-code step)

- Disable "Secure email change" under Supabase Auth → Settings. Document this as a manual deployment/config step to perform outside of code changes (e.g. noted in the PR description), not a file change in this repository.

## Verification Checklist (DEV acceptance, per spec)

- `nx build opticv-web` passes.
- `nx lint opticv-web` passes.
- `nx typecheck opticv-web` passes.
- `nx test opticv-web` passes, including all new/extended spec files listed in steps 2, 7, 8.
- No existing tests in `verify.spec.ts`, `auth-guard.spec.ts`, `guest-guard.spec.ts` regress.
- Manual check (post-implementation, requires the Supabase dashboard change from step 10 to be applied first): from Account Settings, change email, confirm dialog, receive OTP at new address, verify code, confirm sign-out and redirect to `/login`, confirm re-login works with the new email and not the old one.

## Files Summary

**New files:**

- `apps/opticv-web/src/app/core/auth/pages/verify-email-change/verify-email-change.ts`
- `apps/opticv-web/src/app/core/auth/pages/verify-email-change/verify-email-change.html`
- `apps/opticv-web/src/app/core/auth/pages/verify-email-change/verify-email-change.css` (if needed)
- `apps/opticv-web/src/app/core/auth/pages/verify-email-change/verify-email-change.spec.ts`

**Modified files:**

- `apps/opticv-web/src/app/core/auth/services/supabase.ts`
- `apps/opticv-web/src/app/core/auth/services/supabase.spec.ts`
- `apps/opticv-web/src/app/app.routes.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`

**Non-code (manual/infrastructure):**

- Supabase dashboard: disable "Secure email change" under Auth → Settings.
