# Specification Review

## Task ID: 26-interview-prep-ui

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, closely follows existing conventions, and covers the implementation path clearly. However, it contains several assumptions that are not explicitly enumerated in an "Assumptions" section, one assumption about the backend data shape that should be noted as such, and a minor template inconsistency where `[result]="interviewPrepResult()"` is written in the scope prose but the HTML snippet correctly uses the signal invocation — these are cross-referencing issues, not bugs. No invented requirements were found.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **No "Assumptions" section in the spec.** The spec makes several implicit assumptions (listed below under "Assumptions Detected") that are not explicitly called out. Per the template, assumptions must be explicitly enumerated. The spec should include a dedicated "Assumptions" section.

2. **`answerWordCount` field is defined in the type but never referenced in the Behavior section.** The field is added to the `InterviewPrepQuestion` type (Data/Types section), but no UI rendering instruction references it. It is unclear whether it should be displayed (e.g., as a badge or metadata line in the question card), or intentionally omitted. This is a gap — the field exists in the data but its display disposition is unspecified.

3. **`openingHook` / `closingCTA` parallel.** The `InterviewPrepQuestion` type includes `answerStructure` which maps to a badge. The cover-letter component shows a similar pattern. But the spec does not state whether the `answerStructure` badge appears alongside or below the suggested answer. The card layout order should be made explicit to avoid ambiguity during implementation.

4. **`cv-optimization.html` snippet uses `[result]="interviewPrepResult()"`.** The `result` input is declared as `input.required<InterviewPrepResult>()`, which means the component's tag should not receive `null`. However, the snippet in the Behavior section wraps the component inside `@if (interviewPrepResult(); as result)` — which correctly guarantees non-null. The prose in Scope still reads `<app-interview-prep [result]="interviewPrepResult()" />` without the `@if` guard, which is inconsistent with the HTML code block. Minor, but could cause confusion.

#### Unclear or Ambiguous Sections

- **Behavior → InterviewPrep component → Section 1:** The spec says "Render each question as a card" but does not specify whether a PrimeNG `p-card` or a plain `div` with Tailwind utility classes is expected. Other components in the feature (bullet-rewriter, cover-letter-editor) use plain `div` wrappers with Tailwind, not `p-card`. The spec should state which approach to follow for consistency.

- **`answerWordCount` display disposition** (see Non-Critical Issue #2 above).

- **Follow-up collapsible label:** The spec says to use `p-panel` with `[toggleable]="true"` and `[collapsed]="true"`, but does not specify the panel header text. In other expandable sections in the codebase the header is descriptive. The implementer will have to guess — e.g., "Follow-up Questions (2)". This should be specified.

#### Invented or Unsupported Requirements

None. All specified behaviors are directly derived from the task description ("add interview-prep component", "display results for INTERVIEW_PREP", "modern nice UX") and the established codebase conventions.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|------------|---------------------------|
| 1 | The backend `INTERVIEW_PREP` SSE result already returns the JSON shape defined in the new types (questions, questionsToAskInterviewer, stressTestQuestions, preparationTips) | No — stated implicitly in the Context section ("The backend AI prompt returns exactly 10 interview questions plus follow-ups…") but not marked as an assumption |
| 2 | `InterviewPrepResult` types are derived from the backend seed prompt definition, not a formal API contract | No |
| 3 | No new API endpoint or SSE change is needed — existing stream delivers the data | Stated in Context ("No new API endpoints are needed") but not in an Assumptions section |
| 4 | The `datatypes` package must be rebuilt (via `^build` dependency) before type changes are visible to `opticv-web` | Not stated anywhere in the spec |
| 5 | `answerWordCount` is intentionally unused in the UI | Not stated — treated as a silent omission |
| 6 | Plain `div`+Tailwind card styling should be used (matching peer components), not `p-card` | Not stated |

---

### Recommendation

**Revise specification** — add an explicit "Assumptions" section, resolve the `answerWordCount` display disposition gap, and clarify the follow-up panel header text. None of the issues are blockers on their own, but the missing assumptions section and the `answerWordCount` ambiguity could lead to implementation inconsistencies or a rework request during code review.
