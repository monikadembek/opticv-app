# Task Specification

## Source

Azure DevOps Task: 86 — Implement user email change

## Goal

Allow an authenticated user to change the email address associated with their Supabase account from the Account Settings page, reusing the existing OTP-based auth UX. This is a frontend-only change (Supabase Auth handles the update directly; no backend endpoint required).

## Context

- Frontend: `apps/opticv-web/src/app/features/settings/settings.ts` + `settings.html` (Account Settings page). The "Change email" button currently exists but is disabled (`[disabled]="true"`).
- Auth service: `apps/opticv-web/src/app/core/auth/services/supabase.ts` (`Supabase`) — wraps the Supabase client, exposes `pendingEmail` signal, `signInWithOtp()`, `verifyOtp()`, `signOut()`.
- Existing OTP verify pattern: `apps/opticv-web/src/app/core/auth/pages/verify/verify.ts` + `verify.html` — `InputOtp` component, `NgForm`-based submit, error signal + `MessageModule`.
- Routing: `apps/opticv-web/src/app/app.routes.ts`. `/verify` sits behind `guestGuard` (redirects to `/` if already authenticated), so it cannot be reused for an authenticated-user flow.
- Planning doc: `docs/user-email-change.md` (initial technical exploration; this spec supersedes its "Open items" section with the decisions below).
- Prior art: Task 85 (`85-add-display-name`) added a similar profile-editing flow (Signal Forms, toast feedback, loading state) to this same settings page.

## Scope

### In scope

- Enable the "Change email" button in Account Settings.
- New "Change email" form/dialog: input for new email address, with client-side validation.
- Confirmation dialog (PrimeNG `ConfirmDialog`, consistent with the existing "Delete account" pattern) shown before the email-update request is sent.
- On confirm, call `supabase.auth.updateUser({ email: newEmail })` to trigger Supabase to send a 6-digit OTP to the **new** email address.
- New route `/settings/verify-email`, behind `authGuard`, hosting a new `VerifyEmailChange` page that reuses the `InputOtp` pattern from `verify.ts`/`verify.html`.
- On successful OTP verification (`type: 'email_change'`), sign the user out and redirect to `/login`, requiring re-authentication with the new email.
- Error handling for both the request-change step and the verify step, surfaced via `MessageModule`/toast, consistent with existing patterns.
- Posthog analytics events for the new flow.
- Supabase dashboard configuration change: disable "Secure email change" (Auth → Settings) so only the new email needs to confirm (single OTP step, matching the existing UX). This is an infrastructure/config change, not code, but is required for the flow to work as specified.

### Out of scope

- Dual/"secure" email change confirmation (requiring both old and new email to confirm) — explicitly rejected in favor of single confirmation to match the existing OTP UX.
- Any backend (`opticv-be`) changes — Supabase Auth is called directly from the frontend, same as sign-in/OTP verification. No new REST endpoints, DTOs, or Prisma changes. Note: the `User.email` column mirrored in the app's own database (if any) is not addressed by this task — out of scope to reconcile; only Supabase Auth's email is updated.
- Editing the full name / avatar (unrelated, already covered by Task 85 / out of scope generally).
- Resending the OTP from the verify-email-change page (out of scope unless explicitly requested — no "resend code" link required; if the existing `/verify` page lacks this too, this task does not add it here either).
- Canceling/reverting a pending email change once `updateUser` has been called (Supabase-side; not handled specially by this task).

## Behavior

### Change-email form (Account Settings page)

1. The "Change email" button becomes enabled. The email input field (currently read-only, pre-filled with the current email) gains an adjacent editable "New email" input, OR the existing field becomes editable for entering the new email — implementation detail: use a Signal Forms model (`{ newEmail: string }`) consistent with the `fullNameForm` pattern in `settings.ts`, bound via the `Field`/`FormField` directive.
2. Validators on `newEmail`:
   - `required` — "New email is required."
   - Valid email format (e.g. a `pattern` validator matching a standard email regex, or `email` validator if available in `@angular/forms/signals`) — "Enter a valid email address."
   - Must differ from `userProfile.value()?.email` — "New email must be different from your current email."
3. Clicking "Change email" triggers form submission:
   - If validation fails, inline error(s) are shown under the input (same pattern as `fullNameForm.displayName().errors()`), no request is sent.
   - If validation passes, a PrimeNG `ConfirmDialog` is shown (reusing the `ConfirmationService` already injected in `Settings`), e.g.: header "Change email", message "We'll send a confirmation code to `<newEmail>`. You'll need to sign in again with your new email after confirming.", accept label "Send code", reject label "Cancel".
4. On confirm:
   - A `posthog.capture('email_change_requested', { page: 'settings' })` event fires.
   - Calls `Supabase.updateEmail(newEmail)` (new method, wraps `supabase.auth.updateUser({ email: newEmail })`).
   - Sets a `#pendingEmailChange` signal (new, separate from `#pendingEmail`) on `Supabase` to the new email.
   - On success: navigates to `/settings/verify-email`.
   - On error (e.g. email already registered to another account): shows an error toast via `MessageService` (summary "Error", detail from the Supabase error message or a generic fallback "Failed to start email change. Please try again."); stays on the settings page; the entered new-email value is preserved in the field.
   - While the request is in flight, the "Change email" button (or confirm-dialog accept button) shows a loading state and is disabled to prevent duplicate submissions.
5. On reject (cancel) in the confirm dialog: no request is sent, form state is preserved.

### Verify-email-change page (`/settings/verify-email`)

1. New standalone component `VerifyEmailChange`, lazy-loaded, behind `authGuard`.
2. On init: if `supabase.pendingEmailChange()` is falsy (e.g. user navigated here directly without initiating a change), redirect to `/settings`.
3. UI: `InputOtp` 6-digit code entry, matching `verify.html`'s layout/pattern, with heading text referencing the pending new email (e.g. "Enter the code sent to `<pendingEmailChange>`").
4. On submit:
   - `posthog.capture('email_change_verifyotp_executed', { page: 'verify-email-change' })`.
   - Calls `Supabase.verifyEmailChange(code, pendingEmailChange)` (new method, wraps `supabase.auth.verifyOtp({ email: newEmail, token: code, type: 'email_change' })`).
   - On success: clears `#pendingEmailChange` (set to `null`), shows a success toast/message ("Email updated. Please sign in again."), calls `supabase.signOut()`, and navigates to `/login`.
   - On error (invalid/expired code): shows an error message via `MessageModule` (e.g. "Invalid or expired code. Please try again."), keeps the user on the page, allows retry.
5. While the verify request is in flight, the submit button shows a loading state and is disabled.

### `Supabase` service changes

- Add `#pendingEmailChange` signal (`signal<string | null>(null)`), exposed via a `pendingEmailChange` readonly getter — kept separate from `#pendingEmail` (used by the sign-in flow) so the two flows (unauthenticated sign-in vs. authenticated email-change) cannot interfere with each other or with `guestGuard`/`authGuard` logic.
- `setPendingEmailChange(email: string | null)` — setter, mirroring `setPendingEmail`.
- `updateEmail(newEmail: string)` — wraps `this.supabase.auth.updateUser({ email: newEmail })`, returns the Supabase response.
- `verifyEmailChange(code: string, newEmail: string)` — wraps `this.supabase.auth.verifyOtp({ email: newEmail, token: code, type: 'email_change' })`, returns the Supabase response.

## Edge Cases

- **New email identical to current email:** rejected client-side by the "must differ" validator; no request sent.
- **Invalid email format:** rejected client-side; no request sent.
- **Empty input:** rejected client-side (`required`); no request sent.
- **New email already registered to another Supabase account:** `updateUser` call fails; error toast shown on the settings page with the Supabase-provided message (or generic fallback); user remains on settings, can retry with a different email.
- **User navigates directly to `/settings/verify-email` without a pending change** (no prior `updateEmail` call, e.g. page refresh or manual URL entry): `pendingEmailChange` is `null` (not persisted across reloads), so the guard-equivalent `ngOnInit` check redirects to `/settings`.
- **Invalid or expired OTP code on verify:** error message shown, user can retry entering a code; no navigation/sign-out occurs.
- **Rapid double-click / duplicate submission** on "Change email" confirm or on the verify-code submit button: button is disabled while the respective request is in flight.
- **User cancels the confirm dialog:** no side effects; the entered new-email value remains in the form for editing/resubmission.
- **Page refresh on `/settings/verify-email` after a valid `updateEmail` call:** since `pendingEmailChange` is an in-memory signal (not persisted to storage), a refresh loses it and redirects to `/settings`; the OTP email has still been sent by Supabase, but the app has no record of it. This is an accepted limitation — out of scope to persist pending state across reloads (matches existing `pendingEmail` behavior for the sign-in flow, which has the same limitation).

## Data / API

No backend endpoints, DTOs, or Prisma schema changes.

### External calls (Supabase JS SDK, called directly from frontend)

- `supabase.auth.updateUser({ email: newEmail })` — triggers Supabase to email an OTP to `newEmail`. Requires an active session (guaranteed here since the page is behind `authGuard`).
- `supabase.auth.verifyOtp({ email: newEmail, token: code, type: 'email_change' })` — confirms the change.

### New files / changes

**Frontend (`apps/opticv-web`):**

- `src/app/core/auth/services/supabase.ts` — add `#pendingEmailChange` signal + `pendingEmailChange` getter, `setPendingEmailChange()`, `updateEmail()`, `verifyEmailChange()`.
- `src/app/core/auth/pages/verify-email-change/verify-email-change.ts` (new) + `.html` — new standalone component, modeled on `verify.ts`/`verify.html`.
- `src/app/app.routes.ts` — add route `{ path: 'settings/verify-email', loadComponent: ..., canActivate: [authGuard] }`.
- `src/app/features/settings/settings.ts` — add `newEmailModel`/`newEmailForm` (Signal Forms, mirroring `fullNameForm`), `onChangeEmail()` handler (validates, opens `ConfirmDialog` via `confirmationService.confirm()`, calls `supabase.updateEmail()` on accept), an `isChangingEmail` loading signal.
- `src/app/features/settings/settings.html` — enable the "Change email" button, replace the read-only email `[ngModel]` binding with an editable Signal Forms `Field`/`formField`-bound input for the new email, add inline validation error markup (mirroring the full-name field), wire the button's `(click)`/loading state.

**Supabase dashboard (infrastructure, not code):**

- Disable "Secure email change" under Auth → Settings, so `updateUser({ email })` only requires new-email confirmation.

## Acceptance (DEV)

- `nx build opticv-web` passes.
- `nx lint opticv-web`, `nx typecheck opticv-web` pass.
- Frontend unit tests:
  - `supabase.spec.ts` — `updateEmail()` and `verifyEmailChange()` call the underlying Supabase client methods with correct arguments; `pendingEmailChange` signal set/cleared correctly.
  - `settings.spec.ts` — submitting the change-email form with an invalid/empty/duplicate-of-current email shows a validation error and does not open the confirm dialog / does not call `updateEmail`; confirming the dialog calls `updateEmail` and navigates to `/settings/verify-email` on success; error response shows an error toast and preserves the entered value.
  - `verify-email-change.spec.ts` (new) — redirects to `/settings` when there's no pending email change; valid code calls `verifyEmailChange`, signs out, and navigates to `/login`; invalid code shows an error message and does not navigate.
- No breaking changes to the existing `/verify` (sign-in OTP) flow or `#pendingEmail` signal.
- Manual check: from Account Settings, changing email sends an OTP to the new address, entering the correct code signs the user out, and the user can log back in with the new email; the old email no longer works for OTP sign-in.
