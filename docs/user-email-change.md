# User Email Change — Plan

## Goal

Allow authenticated users to change the email address associated with their Supabase account, reusing the existing OTP-based auth UX.

## Supabase behavior

- `supabase.auth.updateUser({ email: newEmail })` requires an active session (user must already be logged in).
- Supabase sends a confirmation OTP/link to the **new** email address.
- Supabase dashboard has a "Secure email change" setting (default: on) which additionally requires confirmation from the **old** email address (two-step). This does not map cleanly onto a single 6-digit OTP screen.
- Confirming the change uses `verifyOtp` with `type: 'email_change'` (vs `type: 'email'` used for sign-in).

## Decision

Use **single confirmation** (new email only) to match the existing OTP UX.

- Requires disabling "Secure email change" in the Supabase dashboard (Auth → Settings).

## Implementation plan

### 1. Supabase dashboard config

- Disable "Secure email change" under Auth → Settings.

### 2. `apps/opticv-web/src/app/core/auth/services/supabase.ts`

- Add `#pendingEmailChange` signal, kept separate from the existing `#pendingEmail` signal used by the sign-in flow. Reusing `#pendingEmail` risks interfering with `guestGuard`/`authGuard` logic, since email-change happens while the user is already authenticated.
- Add `updateEmail(newEmail: string)` → wraps `this.supabase.auth.updateUser({ email: newEmail })`.
- Add `verifyEmailChange(code: string, newEmail: string)` → wraps `this.supabase.auth.verifyOtp({ email: newEmail, token: code, type: 'email_change' })`.

### 3. UI — new route under the authenticated area

Located near existing user settings.

- **Change-email form**: shows current email, input for new email. On submit, calls `updateEmail`, sets `#pendingEmailChange`, navigates to the verify-email-change step.
- **Verify-email-change page**: new page/component (not the existing `/verify`, which sits behind `guestGuard` and redirects to `/login` when there's no pending sign-in email). Reuses the `InputOtp` pattern from `verify.ts`/`verify.html`. Calls `verifyEmailChange`, then clears `#pendingEmailChange` and navigates back to settings on success. Lives behind `authGuard`.

### 4. Error handling

- Surface Supabase errors (e.g. email already in use, invalid/expired OTP) the same way `verify.ts` does today: an error signal + `MessageModule` display.

## Open items for implementation phase

- Confirm exact location of existing user-settings feature/route to attach the change-email form to.
- Decide route path for the new verify-email-change page (e.g. `/settings/verify-email`).
- Confirm whether `posthog.capture` events should be added for the new flow, matching the `supabase_verifyotp_executed` pattern in `verify.ts`.
