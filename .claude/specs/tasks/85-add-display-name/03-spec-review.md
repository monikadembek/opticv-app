# Specification Review — Task 85: Add Display Name

### Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification is well-grounded in the actual codebase — nearly every referenced file, pattern, and existing behavior (DTO conventions, `SupabaseGuard`, `isDeleting` loading pattern, `MessageService` usage, `UserProfileDto` shape) was independently verified as accurate. The main issues are: reliance on an unverified/unproven API (`@angular/forms/signals`, not used anywhere else in the codebase), and a couple of underspecified UI/behavior details that leave room for implementation guesswork.

---

### Findings

#### Critical Issues

1. **Unproven dependency: `@angular/forms/signals`.** The spec's entire frontend approach hinges on this API, but it is not used anywhere else in the codebase — the only occurrence found repo-wide is in the spec document itself. `@angular/forms` is present in `package.json`, but whether the installed version actually exports `form`, `Field`, `maxLength`, and `submit` as described was not confirmed against real usage. Since `conventions.md` mandates Angular 21 signal forms in principle but the codebase has zero prior art for it, this is a higher-risk element than the spec's confident, prescriptive phrasing ("A form model signal is created...", "The `Field` directive binds...") suggests. Recommend explicitly flagging this as a spike/verification step before implementation, or confirming the exact API surface against the installed `@angular/forms` version.

#### Non-Critical Issues

1. **`displayName` type inconsistency between `User` and `UserProfile` not addressed.** `User.displayName` is `string | null | undefined` (optional+nullable) while `UserProfile.displayName` is `string | null` (required, nullable). The spec's frontend behavior section says the form is initialized from `userProfile.value()?.displayName ?? ''`, which handles this correctly, but the spec never explicitly calls out or reconciles this type discrepancy between the two shared types — worth a one-line note so the implementer doesn't have to independently discover it.
2. **"Save name" button current state not mentioned.** The spec describes the button as "always enabled," but doesn't note that in the current code the button is `[disabled]="true"` (hardcoded disabled, not state-driven). This is a starting-state fact that would help an implementer understand the delta, not just the end state.
3. **Toast message copy is only given as an example ("e.g.").** Both the success ("Full name updated.") and error toast text are hedged with "e.g.," leaving exact copy to implementer discretion. Given the spec is otherwise very precise (down to decorator order), this is a minor inconsistency in rigor.

#### Unclear or Ambiguous Sections

1. **"Behavior → Frontend, item 1"**: "kept in sync if the profile resource reloads/changes before the user edits the field" — the mechanism for detecting "before the user edits the field" is not specified (e.g., via `effect()` gated on a dirty check, or simply relying on signal-forms' natural behavior of only reading the initial value once). The Edge Cases section later clarifies the form is "only initialized from the profile value, not continuously overwritten," which resolves the ambiguity, but the two sections read as slightly in tension until cross-referenced.
2. **Loading state interaction with validation errors**: it's unclear whether inline validation errors should be cleared/hidden while a save request is in flight, or whether they persist until the next `submit()` call. Not critical, but not fully unambiguous either.

#### Invented or Unsupported Requirements

None. Every requirement traces back to the raw task (BE endpoint to store `displayName` with 100-char max validation; FE conversion from template-driven to signal form; wiring the Save button to the new endpoint) or is a reasonable elaboration of it consistent with existing codebase conventions (guard usage, DTO validation style, toast pattern, loading-state pattern) — all of which were independently confirmed against the actual code.

---

### Assumptions Detected

1. **`@angular/forms/signals` is available and API-stable as described** (`form()`, `Field`, `maxLength()`, `submit()`) — **stated implicitly**, not explicitly flagged as an assumption in the spec, and not verifiable against existing usage in this codebase (see Critical Issues #1).
2. **Empty submissions should be rejected outright rather than treated as "clear to null"** — **explicitly stated** in Out of Scope.
3. **No DB-level varchar constraint is needed, consistent with `UpdateJobApplicationDto` convention** — **explicitly stated** and confirmed accurate against the actual DTO/schema pattern.
4. **The new endpoint's response body will not actually be consumed by the frontend** (since the frontend reloads via the existing `GET /users/me` resource instead) — **explicitly stated**, a reasonable but slightly unusual design choice (returning a full profile payload that's immediately discarded by the intended caller) that is called out rather than hidden.
5. **Trimming happens client-side only; server-side validation acts on the raw sent value** — **explicitly stated** in Edge Cases, worth double-checking during implementation since it means a client that sends untrimmed whitespace-padded text (e.g., a non-browser API client) could bypass the "non-empty after trim" intent server-side (`@IsNotEmpty()` alone does not trim). This is a real, if minor, validation gap implied by the spec's own wording.

---

### Recommendation

- **Proceed as-is**, with the one caveat that the `@angular/forms/signals` API surface should be quickly verified (e.g., a 5-minute spike importing and checking the exports) before committing to the detailed implementation plan described, since it's the one load-bearing assumption in this spec with no existing precedent in the codebase to validate it against.
