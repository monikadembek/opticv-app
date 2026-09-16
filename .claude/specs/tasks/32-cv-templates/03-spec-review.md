# Specification Review

## Source

Task: 32 — Create CV Templates  
Spec: `.claude/specs/tasks/32-cv-templates/02-spec.md`  
Raw task: `.claude/specs/tasks/32-cv-templates/00-raw-task.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured and covers all three explicit task requirements (3 templates, preview, selection with default). The template visual descriptions are grounded in the provided images and the clarification answers are correctly reflected. However, two non-trivial gaps exist: (1) the spec never states whether the template selector appears when `canExportCv()` is false (i.e. before the user makes any optimization selections), which is a missing UI state; (2) the preview dialog always uses `mergedCv()` from the orchestrator but the spec does not describe what happens when the user opens a preview for a template that is _not_ currently selected (minor but implementable ambiguity). No invented requirements were found.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Missing UI state — template selector visibility when `canExportCv()` is false.**  
   The spec says the selector renders "when `canExportCv()` is true" (Behavior §1). The existing Export CV section already shows a message "Select at least one change above to export a modified CV." when `canExportCv()` is false. The spec does not define whether the template selector also appears in that false-state (so the user can pre-select a template before making edits) or is hidden alongside the export buttons. This needs to be clarified.

2. **Preview dialog: no explicit size or max-width defined.**  
   The spec says the dialog is "maximizable, scrollable" but does not give a default width. For a CV preview on desktop, a sensible default (e.g. 800px wide) matters for the print-accurate render to look correct. Without a stated default, implementors will guess.

3. **Thumbnail visual in selector card is underspecified.**  
   The spec says "static inline SVG or a styled div" but gives no further guidance on what the thumbnail should show. This may result in inconsistent or placeholder implementations. A brief description of the expected thumbnail content per template (e.g. "simplified header bar in the template's accent color") would remove ambiguity.

4. **`CV_TEMPLATES` constant in shared datatypes is a runtime value, not just a type.**  
   Placing a runtime constant (`CV_TEMPLATES`) in `packages/shared/datatypes` is slightly unconventional for a pure-types library (as described in conventions.md). This is a minor architecture observation — it may be more appropriate in the frontend feature module. Not a blocker, but worth a conscious decision.

5. **DOCX degradation strategy is mentioned but not detailed per template.**  
   The edge cases section notes that background bands and pill borders "degrade gracefully to bold headings" in DOCX. For the Executive template (which uses background bands for all section headings) this is a significant visual difference from PDF. A note on whether this degradation is acceptable per-template, or if a minimal DOCX style guide per template should be specified, would help implementors.

6. **Accessibility not mentioned for the template selector cards.**  
   The conventions file requires WCAG AA compliance and AXE passing. The selector cards act as radio buttons (single-selection group) but the spec does not mention `role="radiogroup"` / `role="radio"` or keyboard navigation (`Arrow keys`, `Space` to select). Given the conventions requirement, this should be made explicit.

#### Unclear or Ambiguous Sections

- **Behavior §3 — "Clicking 'Preview' on a card":** It is unclear whether the preview always shows the template of the card whose Preview button was clicked, or whether it shows the currently _selected_ template. The spec says `[templateId]="cardTemplateId"` which implies card-local, but this is never explicitly stated in prose.

- **Template Visual Specs — approximate values:** Several specs use `~28pt`, `~14pt`, `~26pt`, etc. The tilde indicates these are approximations. For PDF generation with jsPDF, exact values must be used. Flagging this so implementors know they must choose exact numbers.

- **Behavior §1 — "checkmark icon when selected":** The spec does not specify which PrimeNG icon or Tailwind utility to use for the checkmark. Minor, but worth noting.

#### Invented or Unsupported Requirements

None. All requirements in the spec are traceable to either the raw task, the provided UI images, or the answers given during the clarification phase.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | Export is entirely client-side (no backend involvement for template rendering) | Yes — Context section |
| 2 | Template selection is session-only, reset to `'ats'` on page refresh | Yes — Scope and Edge Cases |
| 3 | Preview shows user's own merged CV data (not generic sample data) | Yes — Behavior §3 and Scope |
| 4 | Both PDF and DOCX must reflect the selected template | Yes — Scope |
| 5 | `canExportCv()` is the gate for showing the template selector | Partially — implied in Behavior §1, not explicitly confirmed |
| 6 | DOCX uses `docx` library's `color` property for accent colors; some visual features (pills, background bands) are not reproducible and degrade | Yes — Edge Cases |
| 7 | `jsPDF` pill/chip rendering requires custom drawing (rounded rect + text) | Yes — Edge Cases |
| 8 | The `cv-template-preview` component uses inline styles (not Tailwind) to approximate print-accurate output | Yes — Behavior §3 |
| 9 | `CV_TEMPLATES` constant belongs in the shared datatypes package | Stated in spec, but not validated against library conventions |
| 10 | Exact accent colors (`#2a9d8f`, `#e63946`, `#7b2d8b`) were derived from the UI images by visual inspection | Not stated — implicit assumption |

---

### Recommendation

**Revise specification** — address the following before implementation begins:

1. Define template selector visibility when `canExportCv()` is false (Issue #1 — affects initial render state).
2. Clarify whether preview renders the card's template or the currently selected template (Ambiguity in Behavior §3).
3. Add accessibility requirements for the template selector cards (Issue #6 — required by project conventions).

The remaining non-critical issues can be resolved by the implementor using judgment, but the three above require a decision from the author/PO.
