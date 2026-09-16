# Code Review — Task 85: Add Display Name

### Summary

- Overall result: **FAIL**
- The implementation adds an unrequested `minLength(2)` validation rule on both backend and frontend that is not in the spec, leaves a stray `console.log` debug statement in production code, and does not use the `submit()` API from `@angular/forms/signals` that the implementation plan explicitly specifies — instead hand-rolling validation gating that silently no-ops on non-dirty submissions, contradicting the spec's "always enabled, not gated on dirty/valid state" requirement.

---

### Conventions Violations

#### Critical (must fix before merge)

1. **Debug `console.log` left in production code** — `apps/opticv-web/src/app/features/settings/settings.ts:176` (`console.log('Update name Result: ', res);` inside `onSubmit`'s success handler). Violates rules.md "Task completeness: Never leave `TODO` comments... every task must be completed fully" and general "no hacks" quality bar — a debug log has no place in a submitted feature.

2. **Unrequested `minLength(2)` validation added on both BE and FE** — not present anywhere in `02-spec.md` (spec section "Behavior > Frontend" and "Data / API" only specify required + `maxLength(100)`) or `04-implementation-plan.md` (plan sections 1 and 6 only mention `required` and `maxLength(100)`).
   - Backend: `apps/opticv-be/src/app/users/dto/update-display-name.dto.ts:9` adds `@MinLength(2)`.
   - Frontend: `apps/opticv-web/src/app/features/settings/settings.ts:72-74` adds `minLength(path.displayName, 2, ...)`.
   - Violates rules.md "Minimal footprint: Only change what is necessary... do not refactor... outside the scope" — this is a new requirement invented by the author, not present in the spec, and rules.md/role.md state the reviewer role must reject unrequested requirements being introduced during implementation.

3. **Plan-specified `submit()` API not used** — `04-implementation-plan.md` section 6, step 108, explicitly directs: `const valid = await submit(this.fullNameForm, async (form) => { ... })` using the `submit()` function imported from `@angular/forms/signals`. The actual implementation (`settings.ts:146-185`, `onSubmit(event: Event)`) does not call `submit()` at all. It manually reads `this.fullNameForm().invalid()` and `this.fullNameForm().dirty()` and does `return` if either check fails. This bypasses the validation-then-callback flow the plan specifies and introduces different behavior (see Specification Coverage below).

4. **Save button submission is silently gated on `dirty()`** — `settings.ts:153`: `if (this.fullNameForm().invalid() || !this.fullNameForm().dirty()) { return; }`. Per spec (`02-spec.md` line 48-49): "The 'Save name' button: Is **always enabled** (not gated on dirty/valid state)." The button being visually enabled while the click handler silently no-ops when the form isn't dirty (e.g., user clicks Save without changing the pre-filled name) contradicts this requirement — the user gets no feedback (no toast, no validation error, no API call) and may believe the save succeeded.

#### Non-Critical (should fix)

1. **Typo in validation message** — `settings.ts:70`: `'Full name can contain maximum  100 characters.'` has a double space between "maximum" and "100".
2. **Button width changed from plan** — plan (line 143) specifies `class="w-[125px]"` for the Save button; implementation (`settings.html:67`) uses `class="w-[150px]"`. Minor, but a factual deviation worth flagging.
3. **Button changed from `type="button"` + `(click)` to `type="submit"` + `(submit)` on the form** — plan (lines 131-146) specifies `type="button"` with `(click)="onSaveName()"`. Implementation uses `<form (submit)="onSubmit($event)">` with `type="submit"`. Functionally similar but a deviation from the documented plan; also means pressing Enter in the input now triggers submission, which is a UX difference not covered by the spec's edge cases.
4. **Method name diverges from plan** — plan names the handler `onSaveName()`; implementation names it `onSubmit(event: Event)`. Not itself wrong, but combined with the `type="submit"`/`(submit)` change above, several plan details around this handler were not followed.

---

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Signal form for `displayName` (required + maxLength(100)) | Partial | Implemented, but an extra `minLength(2)` rule was added beyond spec scope. |
| `FormField`/`[formField]` binding on input | Covered | `settings.html:57`. |
| Save button always enabled, not gated on dirty/valid | **Missing** | `onSubmit` returns early when `!dirty()`, silently no-op — contradicts spec. |
| Validation runs on submit; inline errors shown; no HTTP call on invalid | Covered | `settings.html:70-75`, gated on `touched()`/`nameSubmitted()`. |
| Success: reload profile + success toast | Covered | `settings.ts:175-184`. |
| Error: error toast, keep entered value | Covered | `settings.ts:162-173`; value not reset. |
| Loading/disabled state while saving | Covered | `isSavingName` signal, bound via `[loading]`/`[disabled]`. |
| Trim before sending | Covered | `settings.ts:151` (`.trim()`). |
| Backend `PATCH /users/me/display-name`, guarded, DTO-validated | Covered | `users.controller.ts:96-113`. |
| DTO validation: `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` only | Partial | Extra `@MinLength(2)` added, not in spec. |
| Service `findUnique` → 404 if missing → update → map to `UserProfile` | Covered | `users.service.ts:70-101`. |
| Swagger decorators matching existing style | Covered | `users.controller.ts:96-107`. |
| Backend tests (service success/not-found, controller wiring) | Covered | `users.service.spec.ts:100-160`, `users.controller.spec.ts:54-76`. |
| DTO validation tests (empty, >100 chars, boundary 100) | Covered (plus untested extra min-length cases) | `update-display-name.dto.spec.ts`. |
| Frontend tests per spec (valid submit, empty/over-limit, error toast, loading state) | Covered | `settings.spec.ts:380-477`. |
| No breaking changes to other `/users/me*` endpoints | Covered | Other endpoints unchanged. |

---

### Plan Deviations

1. Backend DTO includes `@MinLength(2)`, not specified in the plan (plan step 1 lists only `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)`).
2. Frontend form schema includes `minLength(path.displayName, 2, ...)`, not specified in the plan (plan step 6 lists only `required` and `maxLength(100)`).
3. Plan's `submit()`-based submission flow (step 108) was not implemented; a manually-gated `onSubmit(event: Event)` handler was written instead.
4. Plan's Save button spec (`type="button"`, `(click)="onSaveName()"`, `class="w-[125px]"`) was replaced with `type="submit"` inside a `(submit)` form handler, method renamed to `onSubmit`, and button width changed to `w-[150px]`.
5. Plan step 6 describes an "initialize once" pattern using a `#initializedFromProfile` boolean flag to avoid overwriting user edits when the profile resource reloads. The actual implementation (`settings.ts:84-91`) uses an unconditional `effect()` that calls `this.fullNameModel.set(...)` every time `userProfile.value()` changes, with no guard — this will overwrite an in-progress edit if the profile resource reloads/refetches while the user is typing (e.g., after `reloadUsageStatus()`/`reloadUserProfile()` triggers elsewhere, or SSR hydration timing). This reintroduces the exact behavior the spec's edge case ("Profile resource reloads/changes externally while the user is mid-edit... form model is only initialized from the profile value, not continuously overwritten") and the plan's flag-based design were meant to prevent.

---

### Null Safety Issues

None.

---

### Code Smells

1. **Stray `console.log`** — `settings.ts:176` (also listed under Critical above; a debug leftover, not appropriate for merged code).
2. **Unguarded effect overwriting form state** — `settings.ts:84-91`, the `effect()` in the constructor sets `fullNameModel` on every profile emission with no "already initialized" guard, unlike the plan's explicit one-time-initialization design (see Plan Deviations #5). This is a latent bug risk, not just a style issue.
3. **Silent no-op branch** — `settings.ts:153`, the combined `invalid() || !dirty()` early return conflates two different conditions (invalid vs. unchanged) into one silent no-op with no user-visible feedback in the unchanged-but-valid case, which is inconsistent with how the invalid case is handled (inline error shown).

---

### Recommendation

- Fix critical issues before merge (remove `console.log`, remove or get spec sign-off on `minLength(2)`, fix the `dirty()`-gated silent no-op so the Save button behaves per spec, reconcile the `submit()` API usage with the plan or confirm the deviation is acceptable).
