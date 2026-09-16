# Code Review

**Task:** 26-interview-prep-ui
**Reviewer:** Claude Code (automated peer review)
**Date:** 2026-05-21

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The implementation faithfully covers the spec and implementation plan. All required types, the type guard, computed signal, parent template wiring, component class, template, and unit tests are present. There are two non-critical style issues and one minor accessibility gap, but no blocking defects.

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`interview-prep.html` lines 25, 28, 113, 116 — redundant `mb-*` utilities inside a `space-y-*` container**
   The parent `<div class="... space-y-3">` already adds vertical spacing between children via `> * + *` margin. Adding explicit `mb-3` on `<p>` elements inside that container creates double-spacing for those elements. Remove the inline `mb-3` classes from:
   - Line 25: `<p class="m-0 font-semibold text-surface-900 mb-3">`
   - Line 28: `<p class="m-0 text-sm text-surface-500 mb-3">`
   - Line 113: `<p class="m-0 font-semibold text-surface-900 text-sm mb-3">`
   - Line 116: `<p class="m-0 text-xs text-surface-500 mb-3">`

2. **`interview-prep.html` lines 13–14, 18–19 — dynamic class interpolation with `{{ }}`**
   Angular does not support `{{ expression }}` inside `class` attribute strings for Tailwind purging or safe binding. The template uses:
   ```html
   class="... {{ categoryClass(q.category) }}"
   class="... {{ likelihoodClass(q.likelihood) }}"
   ```
   The correct approach is to use `[class]` binding or split into a static base class + `[ngClass]`-free `[class.xxx]` bindings. However, since the conventions explicitly say *"Do NOT use `ngClass`"*, the recommended fix is to move the dynamic part to a separate element with `[class]` binding, or return the full class string and bind with `[attr.class]`... but actually the idiomatic Angular approach here is to bind to `class` attribute via property binding:
   ```html
   <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
         [class]="categoryClass(q.category)">
   ```
   Note: this would override all classes. The cleanest fix is to include the static classes inside the helper method return value (or use a wrapper `<span>` with only static classes and an inner `<span>` with the dynamic binding). As written, the interpolation syntax *does* work at runtime in Angular templates, but it bypasses Tailwind's static extraction — all dynamic class strings must appear verbatim in source for Tailwind to include them in the output bundle. Since the spec table defines a fixed set of classes, this is low risk but worth noting.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Add `InterviewPrepFollowUp` type to datatypes | Covered | Exact match to spec |
| Add `InterviewPrepQuestion` type to datatypes | Covered | Exact match to spec |
| Add `InterviewPrepQuestionToAsk` type to datatypes | Covered | Exact match to spec |
| Add `InterviewPrepStressTest` type to datatypes | Covered | Exact match to spec |
| Add `InterviewPrepResult` type to datatypes | Covered | Exact match to spec |
| Add `isInterviewPrepResult()` type guard in `cv-optimization.ts` | Covered | Implementation matches spec exactly |
| Add `interviewPrepResult` computed signal | Covered | `cv-optimization.ts` line 144 |
| Import and declare `InterviewPrep` in `cv-optimization.ts` | Covered | Line 34 and 106 |
| Replace raw `<pre>` in `cv-optimization.html` (panel "6") | Covered | Lines 204–214 use `app-optimization-result-panel` + `app-interview-prep` |
| `JsonPipe` retained (LinkedIn panel still uses it) | Covered | `JsonPipe` remains in imports at line 99 |
| `InterviewPrep` component — `input.required<InterviewPrepResult>()` | Covered | `interview-prep.ts` line 16 |
| `ChangeDetectionStrategy.OnPush` | Covered | `interview-prep.ts` line 12 |
| `categoryClass()` helper method | Covered | All 7 categories mapped correctly |
| `likelihoodClass()` helper method | Covered | All 3 likelihood values mapped correctly |
| Section 1: Questions — card layout with header, question text, assessing, answer block | Covered | |
| Section 1: Category badge color-coded per spec table | Covered | |
| Section 1: Likelihood badge only when present | Covered | |
| Section 1: `needsUserInput` placeholder note | Covered | |
| Section 1: Traps to avoid (conditional) | Covered | |
| Section 1: Follow-ups as collapsible `p-panel` | Covered | |
| Section 1: Empty questions → `<p-message severity="info">` | Covered | |
| Section 2: Questions to Ask Interviewer (conditional on non-empty) | Covered | |
| Section 3: Stress-Test Questions (conditional on non-empty) | Covered | |
| Section 4: Preparation Tips with `pi pi-check` icon (conditional) | Covered | |
| `answerWordCount` intentionally omitted from UI | Covered | Not rendered per plan assumption |
| Unit tests — all required describe blocks and test cases | Covered | All 16 cases from the plan are present |

---

### Plan Deviations

None. The implementation follows the plan exactly, including:
- `PanelModule` and `MessageModule` are the only PrimeNG imports in the component class.
- Template structure, class names, and helper method signatures match the plan.
- `MOCK_RESULT` covers the specified scenarios (follow-up present/absent, `needsUserInput` true/false, traps present/absent).

---

### Null Safety Issues

None. All conditional rendering uses length checks (`q.trapsToAvoid.length > 0`, `q.followUps.length > 0`) or truthiness checks (`q.likelihood`, `q.needsUserInput`) before accessing array contents. The `interviewPrepResult` computed signal returns `null` when the guard fails and the template guards with `@if (interviewPrepResult(); as result)`.

---

### Code Smells

1. **`interview-prep.html` — HTML comments left in production template**
   Lines 2 (`<!-- Section 1: ... -->`), 9 (`<!-- Header row -->`), 24 (`<!-- Question text -->`), 27 (`<!-- What they're assessing -->`), 33 (`<!-- Suggested answer -->`), 51 (`<!-- Traps to avoid -->`), 63 (`<!-- Follow-up questions -->`), 87, 104, 128 contain structural comments. Per project conventions, comments should only explain non-obvious WHY — structural section labels are self-evident from the markup. Minor, but consistent with the "no unnecessary comments" rule in the conventions.

---

### Recommendation

**Fix critical issues before merge** — actually no critical issues exist. The two non-critical issues (redundant `mb-*` spacing utilities and `{{ }}` class interpolation) are low-risk but worth addressing before merge to avoid subtle layout inconsistencies and Tailwind purge edge cases. The HTML comments are trivially removable.

**Merge as-is** if the team accepts the non-critical issues as tolerable. All functionality, types, wiring, and tests are correct and complete.
