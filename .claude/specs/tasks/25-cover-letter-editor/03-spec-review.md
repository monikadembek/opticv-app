# Specification Review

## Task ID: 25-cover-letter-editor

Reviewed against: `00-raw-task.md` and `02-spec.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification correctly covers all explicit task requirements: a cover-letter-editor component, display of COVER_LETTER results, variant selection that loads into an editor, and placeholder export buttons. It is well-structured, internally consistent, and aligns with existing codebase conventions. Two non-critical issues exist: a contradiction between the type guard definition and the edge case that corrects it, and an implicit assumption about the number of variants (always 3) that is not validated at runtime. No invented requirements were found.

---

### Findings

#### Critical Issues

None.

---

#### Non-Critical Issues

1. **Type guard inconsistency (Data / API vs. Edge Cases sections)**
   - The type guard code snippet in `Data / API` does NOT check `v['variants'].length > 0`.
   - The Edge Cases section says: "guard `isCoverLetterResult` should also check `v['variants'].length > 0`".
   - These two sections contradict each other. The implementation will follow the code snippet literally, not the prose note. The code snippet should be updated to include the length check, or the edge case note should be removed and the empty-variants case handled elsewhere (e.g., in `hasData` logic).

2. **`recommendedVariant` out-of-bounds fallback not reflected in component state initialisation**
   - Edge Cases states: "fall back to index 0" if `recommendedVariant` is out of bounds.
   - The Component internal state section shows `signal<number>(result.recommendedVariant)` without any clamping logic. The spec does not describe where or how this fallback is applied. An implementer would need to guess whether this is in the signal initialisation, a computed, or a template expression.

3. **`OptimizationResultPanel` `[error]` input not shown in integration snippet**
   - The States section references `[error]` as one of the panel's inputs, consistent with other panels in the codebase.
   - The integration snippet in `Integration in cv-optimization.html` only passes `[loading]` and `[hasData]` — `[error]` is omitted. This may be intentional (no error signal exists for COVER_LETTER specifically) but it is not explained, creating ambiguity for the implementer.

---

#### Unclear or Ambiguous Sections

1. **"three cards side-by-side"** — The Behavior section hard-codes "three" cards, but `CoverLetterVariant[]` is typed as a variable-length array. It is unclear whether the layout assumes exactly 3 at design time (CSS grid with 3 columns) or whether it should be dynamic (`@for` over variants). This matters for the responsive layout implementation.

2. **Editor height** — The Edge Cases section says "fixed height with overflow scroll" but does not specify what the height should be (e.g., `300px`, `50vh`). This leaves a visual design decision unspecified, which could result in inconsistency with the rest of the page's UI.

3. **Active card visual state** — The Behavior section says "highlighted border/ring" for the active card, but does not specify the Tailwind class, PrimeNG token, or design language to use. This is consistent with other result components but leaves implementer discretion where a specific visual treatment may be expected.

---

#### Invented or Unsupported Requirements

None. All requirements in the spec are either directly stated in the task or were explicitly confirmed by the developer via clarifying questions (PrimeNG rich-text editor, cards UX, local-only persistence, exact backend type shape).

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | The backend always returns exactly 3 variants | No — inferred from "three cards", but type allows any count |
| 2 | `recommendedVariant` is a 0-based numeric index | Yes — noted in type comment |
| 3 | The existing accordion panel for Cover Letter is value="5" | Yes — stated in Scope and Integration sections |
| 4 | `OptimizationResultPanel` accepts `[loading]`, `[error]`, `[hasData]` inputs | Implied by analogy to other panels; not verified against component source in the spec |
| 5 | PrimeNG `<p-editor>` is already available as a dependency (no new install needed) | Implicit — not stated. If not already in the project's PrimeNG imports, it would need to be added |
| 6 | Edits in the PrimeNG editor are two-way bound via `[(ngModel)]` or equivalent | Not specified — the binding mechanism for `editorContent` signal to `<p-editor>` is left to the implementer |

---

### Recommendation

**Revise specification** — address the two non-critical issues before implementation:

1. Reconcile the type guard code with the edge case note (either add the length check to the snippet or remove the prose note and clarify where empty-variants is handled).
2. Describe explicitly where the `recommendedVariant` out-of-bounds fallback is applied (signal initialisation expression or computed).

The ambiguous sections (editor height, active card styling) are low risk and can be left to implementer discretion, but noting them here for awareness.
