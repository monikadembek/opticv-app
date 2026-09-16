# Specification Review

Task ID: 112-export-footer-redesign

## Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification is well-structured, internally consistent, and correctly implements the clarified intent behind the task. However, several elements in the spec's Scope/Behavior (the ATS info button and the accent color selector being moved into the dialog) are not explicitly named in the raw task text — the raw task only lists "template settings, gdpr checkbox and export buttons" as dialog contents. These were introduced via clarifying questions and user answers, but since the raw task itself doesn't mention them, they should be flagged so the reviewer/PO can confirm "template settings" was meant to include the ATS info button and accent color, not just the template dropdown.

## Findings

### Critical Issues

None.

### Non-Critical Issues

1. **"Template settings" scope interpretation** — The raw task says the dialog contains "template settings, gdpr checkbox and export buttons." The spec interprets "template settings" broadly to include both the template selector AND the accent color selector AND the ATS info button. This is a reasonable reading (all three are template-related controls currently grouped together in `.template-selector`), but it was resolved via a clarifying question about only the ATS info button — the accent color selector's inclusion was never explicitly asked about or confirmed with the user; it was carried over silently as part of "template settings." Recommend confirming this reading is correct, since the raw task's wording is narrow enough that a reviewer could argue accent color should also stay in the footer, or that "template settings" means only the template dropdown.
2. **Export dialog dismiss behavior after export** — Section "Behavior," point 6, states the dialog "remains open after triggering an export... user closes the dialog manually." This is a reasonable carry-over of current behavior, but the raw task doesn't address whether the dialog should auto-close on successful export. Correctly flagged as inferred/unchanged-behavior rather than a new requirement, but worth explicit sign-off since it's a UX decision with no source in the task.

### Unclear or Ambiguous Sections

1. **Edge Cases — "Both dialogs open at once"**: notes a need to "verify PrimeNG handles z-index stacking correctly" but doesn't specify the required/expected resulting behavior if it does NOT stack correctly (e.g., should ATS info dialog be modal-over-modal, or should Export dialog close first?). This is flagged as a verification task rather than a defined behavior, which is acceptable, but implementers may need a fallback decision if stacking breaks.
2. **"Right bottom side of the page"**: The spec resolves this to PrimeNG's `position="bottomright"` per user clarification (recorded in Assumptions). This is fine since it was explicitly clarified with the user, not invented — noting it here only because the raw task wording itself is ambiguous and the resolution lives in the Assumptions section rather than being traceable to the raw task directly.

### Invented or Unsupported Requirements

None outright invented — all Scope items trace either to the raw task text or to explicit user answers during clarification (documented in the spec's Assumptions section). However, see Non-Critical Issue #1: the accent color selector's placement inside the dialog is an extrapolation from "template settings" that was not itself put to the user as a clarifying question (only the ATS info button was explicitly asked about).

## Assumptions Detected

All are explicitly listed in the spec's "Assumptions" section:

1. "Export button" means a single button (not separate PDF/DOCX buttons) that opens the dialog — explicitly stated, consistent with task wording ("button for export which opens dialog").
2. Export dialog's PDF/DOCX buttons reuse existing labels/icons — explicitly stated, reasonable default, not contradicted by task.
3. "Right bottom side of the page" implemented via `p-dialog[position="bottomright"]` — explicitly stated, and traceable to a clarifying question answered by the user.

Additional implicit assumption not called out in the spec's own Assumptions section (see Non-Critical Issue #1):

4. "Template settings" (raw task wording) is read to include the template selector, the accent color selector, and the ATS info button — this was decided partly via clarifying question (ATS info button only) and partly by extrapolation (accent color). The spec should ideally list this interpretation explicitly in its Assumptions section rather than only implying it through the Scope section.

## Recommendation

- **Proceed as-is** — the gaps identified are minor interpretive/documentation issues (the accent-color-in-dialog assumption should be made explicit in the Assumptions section), not functional or structural defects. They do not block implementation, but the spec author should consider adding one line to the Assumptions section clarifying that "template settings" was interpreted to include the accent color selector alongside the template dropdown and ATS info button.
