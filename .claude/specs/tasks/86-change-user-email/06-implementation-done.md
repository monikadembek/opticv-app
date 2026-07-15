# Implementation Done — Task 86: Change User Email

## Summary

The delivered implementation allows an authenticated user to change the email address associated with their Supabase account from the Account Settings page. The final flow differs from the specification's OTP-based design (see Deviations): instead of a separate `/settings/verify-email` OTP-entry page, the delivered flow uses a single-step confirmation-link approach — `Supabase.updateEmail()` triggers Supabase's `updateUser` with `emailRedirectTo`, the user clicks a link sent to the new email address, and no in-app verify step or `/settings/verify-email` route exists in the final code. An OTP-based verify-email page and route were implemented in an earlier commit and subsequently removed in a later commit on this branch ("Remove the unnecessary step of navigating to verify new email page to provide 6 digit code"). A related backend fix was also delivered: `UsersService.upsertUser` now keys its upsert on `supabaseId` instead of `email`.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Enable "Change email" button in Account Settings | Implemented | `settings.html:93-101`, `[disabled]="isChangingEmail()"` replaces hardcoded `true`. |
| New "Change email" form/dialog with client-side validation | Implemented | `settings.ts:89-103`, `newEmailForm` (Signal Forms), replaces read-only email input in `settings.html:86-92`. |
| Validators: required, valid email format, must differ from current email | Implemented | `settings.ts:90-102`. |
| Confirmation dialog (PrimeNG `ConfirmDialog`) before request | Implemented | `settings.ts:226-253`, `confirmationService.confirm()`. Copy differs from spec text (see Deviations). |
| Call `supabase.auth.updateUser({ email: newEmail })` on confirm | Implemented | `supabase.ts:67-72`, also passes `{ emailRedirectTo: ... }` (not specified in spec). |
| New route `/settings/verify-email` behind `authGuard` | Not implemented | Route was added then removed on this branch; not present in final `app.routes.ts`. |
| New `VerifyEmailChange` page reusing `InputOtp` pattern | Not implemented | Component/files were added then deleted on this branch. |
| `Supabase.verifyEmailChange(code, newEmail)` method | Not implemented | Method was added then removed from `supabase.ts`; not present in final code. |
| `#pendingEmailChange` signal + `setPendingEmailChange()` on `Supabase` | Not implemented | Added then removed; final `supabase.ts` has no `pendingEmailChange`. |
| On successful OTP verification, sign out and redirect to `/login` | Not implemented | No OTP verification step exists in final flow; sign-out/redirect on email change does not occur in delivered code. |
| Error handling for request-change step, surfaced via `MessageModule`/toast | Implemented | `settings.ts:240-248`, `messageService.add({ severity: 'error', ... })`. |
| Error handling for verify step | Not implemented | No verify step exists in final code. |
| Posthog analytics events for the new flow | Partially implemented | `posthog.capture('email_change_requested', { page: 'settings' })` present (`settings.ts:233`); the verify-step event (`email_change_verifyotp_executed`) does not exist since the verify step was removed. |
| Supabase dashboard: disable "Secure email change" | Not implemented (infra) | Manual/infrastructure step, outside code scope; not verifiable from source. |
| Loading state disables button while request in flight | Implemented | `isChangingEmail` signal wired to `[loading]`/`[disabled]` in `settings.html:97-98`. |
| Cancel dialog: no side effects, form preserved | Implemented | Confirmed by `settings.spec.ts` reject-dialog test. |
| `supabase.spec.ts` — `updateEmail()`/`verifyEmailChange()` tests, `pendingEmailChange` signal tests | Partially implemented | `updateEmail()` test present (`supabase.spec.ts:144-158`); no `verifyEmailChange()` or `pendingEmailChange` tests (feature removed). |
| `settings.spec.ts` — validation/dialog/success/error tests | Implemented | `settings.spec.ts:479-673` (`onChangeEmailSubmit` describe block). |
| `verify-email-change.spec.ts` — new test file | Not implemented | File was added then deleted on this branch. |
| No breaking changes to `/verify` (sign-in OTP) flow or `#pendingEmail` signal | Implemented, with an additional unrelated change | `#pendingEmail` signal/logic unmodified; however `verify.html` and `login.html` each had `severity="success"` removed from their submit buttons, a change outside this requirement's and the spec's stated scope. |

## Files

### Created

None in the final state. (`verify-email-change.ts`, `.html`, `.css`, `.spec.ts` were created and later deleted within this branch's history.)

### Modified

- `apps/opticv-be/src/app/users/users.service.ts`
- `apps/opticv-be/src/app/users/users.service.spec.ts`
- `apps/opticv-web/src/app/core/auth/pages/login/login.html`
- `apps/opticv-web/src/app/core/auth/pages/verify/verify.html`
- `apps/opticv-web/src/app/core/auth/services/supabase.spec.ts`
- `apps/opticv-web/src/app/core/auth/services/supabase.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`

## Components

| Component (per plan) | Status |
| --- | --- |
| `VerifyEmailChange` (`apps/opticv-web/src/app/core/auth/pages/verify-email-change/`) | Missing |

## Stores

Not applicable — no store changes were planned or made for this task.

## Deviations

- The plan's OTP-based verify flow (`/settings/verify-email` route, `VerifyEmailChange` component, `Supabase.verifyEmailChange()`, `#pendingEmailChange` signal) was implemented in commit `c4f72c6`, then fully removed in commit `0b7fed2` ("Remove the unnecessary step of navigating to verify new email page to provide 6 digit code").
- `Supabase.updateEmail()` in the final code passes a second argument `{ emailRedirectTo: \`${window.location.origin}/home\` }` to `supabase.auth.updateUser()`, not specified in the plan/spec (which specified `updateUser({ email: newEmail })` only, paired with OTP verification via `verifyOtp`).
- The confirm-dialog message and accept-button label differ from the spec's exact copy: delivered text is "We'll send a confirmation link to `<newEmail>`. Click the link in that email to complete the change." with accept label "Send link" (spec specified "We'll send a confirmation code..." / "Send code").
- `settings.ts` includes a `emailChangePendingFor` signal (not named or specified in the plan, which specified `#pendingEmailChange` on the `Supabase` service instead) that stores the new email and is displayed inline in `settings.html:108-114` as a pending-confirmation message; this replaces the planned navigation to `/settings/verify-email`.
- Two files outside the plan's/spec's file list were modified: `login.html` and `verify.html`, each with `severity="success"` removed from a submit button.
- A change to `apps/opticv-be/src/app/users/users.service.ts` and its spec file was made; this file is outside the plan's "Files Summary" and the spec's "Out of scope" section explicitly states backend changes are not part of this task.

## Additional Implementation

- `apps/opticv-be/src/app/users/users.service.ts` (`UsersService.upsertUser`): the `upsert` `where` clause was changed from `{ email: data.email }` to `{ supabaseId: data.supabaseId }`, with `email` added to the `update` clause. Corresponding changes were made to `apps/opticv-be/src/app/users/users.service.spec.ts`.
