# Specification Review

## Source

Task ID: 13-cv-optimization-first-step  
Spec file: `.claude/specs/tasks/13-cv-optimization-first-step/02-spec.md`  
Raw task: `.claude/specs/tasks/13-cv-optimization-first-step/00-raw-task.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-structured, covers all explicit task requirements, and correctly incorporates answers from the clarification phase. All major behaviors, edge cases, and API details are present. However, one assumption about the CV display field is ambiguous (`fileName` or "similar field"), one gap exists around what the dropdown label actually shows to the user, and the stepper description leaves open how many steps the shell should visually reserve space for versus render nothing at all.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Dropdown label field unresolved (Assumptions section):** The assumption states `"fileName" or similar field used as display label in the dropdown`. The actual field name on `CvDocument` is not confirmed. This should be pinned to the correct field name from the shared type definition before implementation begins, to avoid a runtime mismatch. (Section: Assumptions, item 2)

2. **Stepper shell — visual scope unclear:** The spec says "Step 1 only rendered" and lists "Steps 2–7" as out of scope. However, it does not specify whether the stepper shell should visually show placeholder/locked steps (e.g., greyed-out step indicators for steps 2–7) or render only the Step 1 indicator. The raw task says "we should probably have a stepper component" but doesn't clarify this visual intent. (Section: Scope / Out of scope; Behavior step 2)

3. **Success message persistence:** The spec says the inline "CV processing is in progress" message appears after a successful save but does not specify whether it disappears if the user modifies the form again or clicks "Run" a second time. This could lead to implementation inconsistency. (Section: Behavior, step 6)

4. **CV dropdown — no-CV-selected validation:** The spec defines the Run button as disabled when the CV list is empty, but does not specify what happens if the user reaches the form without selecting a CV (i.e., list is loaded but nothing is chosen). Is the Run button also disabled until a CV is selected, or is it just form validation that blocks submission? (Section: Edge Cases)

#### Unclear or Ambiguous Sections

- **Assumptions, item 2:** `"fileName" or similar field` — the display label field for the dropdown is unresolved. Implementation depends on the actual `CvDocument` type shape.
- **Behavior, step 2:** "Page renders the stepper with Step 1 visible" — does not define what the stepper shell renders beyond Step 1 (nothing, or locked step placeholders).

#### Invented or Unsupported Requirements

None. All requirements in the spec trace back to either the raw task or the clarification answers.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | `CvApiService` from `features/dashboard/` is provided at root and can be reused without re-providing. | Yes |
| 2 | `GET /api/cv` returns `CvDocument[]`; `id` maps to `cvDocumentId`; display label is `fileName` or a similar field. | Yes — but display field is unresolved |
| 3 | The stepper is visual layout only; no step-validation or navigation logic is needed now. | Yes |
| 4 | PrimeNG `Select` is used for the CV dropdown. | Yes |
| 5 | ReactiveForm (`FormGroup` / `FormControl`) is used, not signal-based forms. | Yes |
| 6 | All components use `ChangeDetectionStrategy.OnPush` and signals for local state. | Yes |
| 7 | The POST response (`JobApplication`) is received but its fields (e.g., `id`) are not acted upon in this task. | Implicit — mentioned as "id used if needed" but no concrete usage defined |

---

### Recommendation

**Proceed as-is**, with the following minor resolutions before implementation:

1. Confirm the correct display field name on `CvDocument` (likely `originalName` or `fileName`) and update the assumption to be specific.
2. Clarify whether the stepper shell renders locked/greyed step indicators for steps 2–7 or renders nothing beyond Step 1.
3. Optionally clarify: is Run disabled until a CV is selected from a non-empty list?

These are low-risk gaps that can be resolved quickly by inspecting the `CvDocument` type and confirming with the task owner — they do not block spec approval.
