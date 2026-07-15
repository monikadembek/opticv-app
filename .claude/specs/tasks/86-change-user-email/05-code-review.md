# Code Review — Task 86: Change User Email

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation covers the spec's core flow (change-email form, confirm dialog, `/settings/verify-email` page, `Supabase` service methods) faithfully and closely follows the implementation plan and existing code conventions (Signal Forms, `ConfirmationService`/`MessageService` patterns, `verify.ts` structure). Issues found are scope creep in two unrelated template files and some minor gaps in test coverage versus what the plan specified; nothing blocks merge on functional correctness grounds.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

- `apps/opticv-web/src/app/core/auth/pages/login/login.html:55` and `apps/opticv-web/src/app/core/auth/pages/verify/verify.html:43` — `severity="success"` was removed from the submit buttons on the **unrelated** `/login` and `/verify` pages. This is out of scope for Task 86 (spec explicitly lists only `supabase.ts`, `verify-email-change/*`, `app.routes.ts`, `settings.ts`/`.html` as touched files) and violates the "minimal footprint" rule in `.claude/context/rules.md` ("Only change what is necessary. Do not refactor, rename, or 'improve' code that is outside the scope of the current task."). Revert these two lines or split them into a separate change with its own rationale.
- `apps/opticv-web/src/app/core/auth/pages/verify-email-change/verify-email-change.ts:46` — `const { code } = form.form.value;` destructures `code` from the form but then the outer parameter `code` (component's `this.code`, or the destructured local) is never used before being passed to `verifyEmailChange` on line 56 as the shadowing local `code` — works correctly today because the local shadows the class field, but the unused pattern is slightly confusing; consider using `this.code` directly (as `onSubmit` already does implicitly via two-way binding) to reduce the indirection, consistent with how `Verify`'s `onSubmit` is modeled per the plan.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Enable "Change email" button | Covered | `settings.html:93-103`, `[disabled]="isChangingEmail()"` replaces the hardcoded `true`. |
| Editable `newEmail` Signal Forms field, replacing read-only email input | Covered | `settings.ts:88-102`, `settings.html:86-92`. |
| Validators: required, email format, must differ from current | Covered | `settings.ts:90-101`, uses `email()` validator per plan's verified fact. |
| Inline validation errors, same pattern as full-name field | Covered | `settings.html:105-110`, mirrors `fullNameForm` pattern exactly. |
| ConfirmDialog before request, reusing `ConfirmationService` | Covered | `settings.ts:225-252`. |
| `posthog.capture('email_change_requested', ...)` on confirm | Covered | `settings.ts:232`. |
| `Supabase.updateEmail(newEmail)` call | Covered | `supabase.ts:76-78`; `settings.ts:235`. |
| `#pendingEmailChange` signal, separate from `#pendingEmail` | Covered | `supabase.ts:21,35-37,54-56`; not touched by `initAuth()` state-change handlers (verified). |
| Navigate to `/settings/verify-email` on success | Covered | `settings.ts:250`. |
| Error toast on failure, preserves entered value | Covered | `settings.ts:237-247`; `newEmailModel` untouched on error. |
| Loading state disables button while in flight | Covered | `isChangingEmail` signal wired to `[loading]`/`[disabled]` in `settings.html:99-100`. |
| Cancel dialog: no side effects, form preserved | Covered | No `reject` handler needed since no mutation occurs before accept; confirmed by test at `settings.spec.ts:652-672`. |
| New route `/settings/verify-email`, behind `authGuard` | Covered | `app.routes.ts:56-63`. |
| `VerifyEmailChange` page, reuses `InputOtp` pattern | Covered | `verify-email-change.ts`/`.html`, closely modeled on `verify.ts`/`.html`. |
| Redirect to `/settings` if no pending change on init | Covered | `verify-email-change.ts:37-41`. |
| `posthog.capture('email_change_verifyotp_executed', ...)` | Covered | `verify-email-change.ts:49-51`. |
| `Supabase.verifyEmailChange(code, pendingEmailChange)` | Covered | `verify-email-change.ts:55-58`. |
| On success: clear pending, sign out, navigate to `/login` | Covered | `verify-email-change.ts:59-63`. |
| On error: show message, stay on page, allow retry | Covered | `verify-email-change.ts:65-68`. |
| Loading state on verify submit button | Covered | `isSubmitting` wired in `verify-email-change.html:43`. |
| No backend changes | Covered | No files under `apps/opticv-be` touched. |
| `supabase.spec.ts` — new methods/signals tested | Covered | All groups from plan step 2 present, except one regression case (see Plan Deviations). |
| `settings.spec.ts` — validation/dialog/success/error tests | Covered | All cases from plan step 7 present (`settings.spec.ts:484-673`). |
| `verify-email-change.spec.ts` — redirect/success/error tests | Covered | All cases from plan step 8 present. |

## Plan Deviations

- Step 2 of the plan asks to "confirm (add if missing) that `SIGNED_IN`/`SIGNED_OUT`/`INITIAL_SESSION` handlers do not touch `pendingEmailChange` — add a regression test." Only a `SIGNED_IN` regression test was added (`supabase.spec.ts:305-315`); no equivalent test exists for `SIGNED_OUT` or `INITIAL_SESSION`. Functionally the handlers are correct (neither branch references `#pendingEmailChange`), but test coverage is narrower than the plan specified.
- Plan step 4 said to default to omitting a "cancel/back" link/`RouterLink` import unless needed. Implementation correctly omits it (`verify-email-change.ts` imports list has no `RouterLink`) — consistent, not a deviation, noting for completeness.
- Two files outside the plan's "Files Summary" were modified: `login.html` and `verify.html` (see Non-Critical above). Not listed in the plan or spec's "New files / changes" section.

## Null Safety Issues

None. `this.supabase.pendingEmailChange() as string` (`verify-email-change.ts:57`) is guarded by the `ngOnInit` redirect-if-falsy check and the `isEmailChangePending` computed, so the assertion is safe given the component's lifecycle — consistent with the plan's own suggested implementation.

## Code Smells

None significant. The `validate()` custom validator in `settings.ts:92-101` duplicates the `currentEmail` null-guard (`if (currentEmail && ...)`) that's arguably unnecessary since an empty/undefined current email would never equal a valid new email that passed `required`/`email` checks — very minor, not worth a required fix.

## Recommendation

- Fix critical issues before merge — specifically, revert the unrelated `severity="success"` removals in `login.html` and `verify.html` (or confirm with the author these were intentional and belong in this PR), otherwise **merge as-is**.
