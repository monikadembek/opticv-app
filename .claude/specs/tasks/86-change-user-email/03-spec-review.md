# Specification Review — Task 86: Change User Email

## Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification is well-grounded in the raw task and the referenced planning doc (`docs/user-email-change.md`), and its description of existing patterns (`Supabase` service, `verify.ts`, `Settings` component) matches the current codebase accurately. It introduces several concrete decisions (Posthog events, exact validation messages, exact route path, toast copy) beyond what the one-paragraph raw task specifies; these are reasonable and traceable to the planning doc's "Open items," but a few (Posthog event names/payloads, specific error-message copy) are the spec author's own invention and should be flagged as such rather than treated as settled requirements.

## Findings

### Critical Issues

None.

### Non-Critical Issues

1. **Posthog event names/payloads are invented, not sourced.** The raw task and planning doc only ask "Confirm whether `posthog.capture` events should be added... matching the `supabase_verifyotp_executed` pattern." The spec commits to specific event names (`email_change_requested`, `email_change_verifyotp_executed`) and payload shapes (`{ page: 'settings' }`, `{ page: 'verify-email-change' }`). This is a reasonable extrapolation but is a concrete new decision, not a requirement carried over from the task — should be called out as an assumption (see below) rather than presented as spec fact.
2. **Exact toast/validation copy is invented.** Strings like "New email must be different from your current email.", "We'll send a confirmation code to `<newEmail>`...", "Email updated. Please sign in again." are not present in the raw task or planning doc. They're consistent with the existing UX tone but are the spec author's wording choices, not requirements.
3. **`settings.html` current markup detail not fully reflected.** The current "Email address" field uses `[ngModel]` with `name="emailAddress"` inside a bare `<form>` (no `(submit)` handler), consistent with the spec's description ("replace the read-only email `[ngModel]` binding..."). This is accurate, but the spec's Behavior section (item 1) offers two alternative UI approaches ("gains an adjacent editable... input, OR the existing field becomes editable") without picking one, leaving an implementation decision unresolved — see Unclear section below.
4. **No mention of the avatar/header email display.** `settings.html` also renders the current email in the profile header area (`userProfile.value()?.email` at line 41, shown only when `displayName` is set) and in `getAvatarLabel()`. The spec does not address whether/when this header display should reflect a newly changed email (it won't, until the user re-authenticates and `userProfile` reloads with updated data) — minor, but worth an explicit note that this is expected/unchanged behavior.

### Unclear or Ambiguous Sections

1. **Behavior → Change-email form, item 1**: "The email input field... gains an adjacent editable 'New email' input, OR the existing field becomes editable for entering the new email — implementation detail." This presents two mutually exclusive UI layouts as an open choice left to implementation. Given the spec elsewhere is very prescriptive (exact validator messages, exact dialog copy), leaving the core UI layout ambiguous is inconsistent with the rest of the document's precision and could lead to a layout that doesn't match design expectations. Should be resolved to one approach or explicitly deferred to a design/mockup step.
2. **Acceptance (DEV) — manual check** says "the old email no longer works for OTP sign-in," which is accurate only because Supabase updates the auth record in place; this is correct but relies on Supabase behavior not explained anywhere else in the spec (no explicit statement that the old email is fully replaced, not just supplemented). Not a blocking ambiguity, just worth a one-line clarification for reviewers unfamiliar with Supabase's email-change semantics.

### Invented or Unsupported Requirements

None that go beyond what's reasonably implied by the planning doc's "Open items" — the Posthog events and copy strings (flagged above as non-critical) are extrapolations, not additions of new functional scope.

## Assumptions Detected

| Assumption | Explicitly stated in spec? |
|---|---|
| Supabase dashboard "Secure email change" will be disabled (infra change, out-of-band) | Yes — explicitly called out as a required infra change, not code |
| Exact Posthog event names/payloads (`email_change_requested`, `email_change_verifyotp_executed`) | Presented as spec fact, not flagged as an assumption/decision (see Non-Critical #1) |
| Exact error/toast/dialog copy strings | Presented as spec fact, not flagged as an assumption (see Non-Critical #2) |
| `User.email` mirrored in the app's own DB (if any) is not reconciled by this task | Yes — explicitly stated in Out of scope |
| `pendingEmailChange`, like `pendingEmail`, is acceptable to lose on page refresh (no persistence) | Yes — explicitly stated as an accepted limitation in Edge Cases |
| UI layout choice (adjacent new-email input vs. replacing the existing field) is left open | Yes — explicitly flagged as "implementation detail," but this leaves a real ambiguity (see Unclear #1) |
| `email` validator may not be available in `@angular/forms/signals`, so `pattern` is offered as a fallback | Yes — explicitly hedged in the spec |

## Recommendation

- Proceed as-is, with two lightweight clarifications recommended before implementation: (1) pick one UI layout option instead of leaving it as an open "OR," and (2) label the Posthog event names/payloads and copy strings as proposed defaults (adjustable during implementation/review) rather than fixed requirements, since they were not sourced from the raw task or planning doc.
