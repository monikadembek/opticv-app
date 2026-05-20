# Spec Review: Task 22 — Display keyword gap analysis results

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-structured, thoroughly grounded in the task, and aligns with existing codebase conventions. It correctly derives requirements from the KEYWORD_GAP prompt's outputSchema and mirrors the established ATS autopsy UX pattern. However, there are two non-critical issues: one ambiguous visual element (the "semantic" match type icon) and one implicit assumption about how `isRequired` sub-group label visibility interacts with the `missingKeywords` section header count badge. No invented or unsupported requirements were found.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **"Teal wave" icon for semantic match type is not actionable** (Section 4 — Matched Keywords).  
   The icon description "semantic ≈ teal wave" has no corresponding PrimeNG icon or well-known icon name. An implementer will have to invent or approximate this. The spec should either name the PrimeNG icon to use (e.g. `pi-circle`) or describe the fallback if no icon fits.

2. **Acronym Issues section has no count badge** (Section 5 — Acronym Issues).  
   Every other non-score section header is specified to include a count badge (Sections 2, 3, 4), but Section 5 "Acronym Issues" header is specified without one. This looks like an omission rather than a deliberate choice, but it is not confirmed by the task.

3. **The "Acronym Issues" count badge omission is inconsistent with the pattern but may be intentional** — see point 2 above.

4. **`isRequired` sub-group label logic is underspecified for the missing-keywords section header count badge.**  
   The spec states the count badge on "Missing Keywords" header, but does not clarify whether the count reflects `missingKeywords.length` (total) or the sum of both visible sub-groups. Since both sub-groups are always subsets of the same array, this is unambiguous in practice, but worth confirming to avoid implementer confusion.

---

### Unclear or Ambiguous Sections

1. **Section 4 — Matched Keywords, match type icon for "semantic".**  
   "semantic ≈ teal wave" is not a concrete icon specification. The `≈` symbol and "wave" description are open to interpretation. An implementer cannot determine the exact PrimeNG icon or SVG to use without guessing.

2. **Section 4 — Matched Keywords — sub-group for "only one sub-group" applies to Missing Keywords (Section 2), not Matched Keywords.**  
   The sentence "If only one sub-group has items, show only that sub-group (no label for the other)." appears at the end of Section 2 — Missing Keywords, where it is appropriate. It does not appear in Section 3 — Matched Keywords. This is correct as-is, but the sentence placement could be read as belonging to Section 3 by a skimming reader. No change needed — just a clarity note.

3. **Section 5 (Computed state) references `missingKeywords` as a direct array property**, but the `result` input is `KeywordGapResult`, so the computed signals should reference `result().missingKeywords`. This is implementation-level detail but could cause confusion: the spec does not specify whether these computed signals use the raw input signal or a derived signal from the `result` input.

---

### Invented or Unsupported Requirements

None.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | The backend KEYWORD_GAP prompt already returns data conforming to the `KeywordGapResult` shape — no backend changes needed | Yes (Data/API section) |
| 2 | The accordion panel for KEYWORD_GAP is at `value="2"` in the current template | Yes (Scope and Behavior §3) |
| 3 | The SVG ring from `ats-score` will be reused as-is (same circumference, same color thresholds) | Yes (Behavior §4 Section 1) |
| 4 | `category` on `KeywordGapMissingKeyword` is typed as `string` not as a TypeScript enum, even though the prompt defines it as an enum | Yes (comment in type definition: "enum values from the prompt outputSchema") |
| 5 | `isKeywordGapResult` only checks `matchScore` (number) and `missingKeywords` (array) — not the full shape | Yes (Behavior §1, last line) |
| 6 | The "Likely have" / "Skills to acquire" sub-group labels are the final copy | Implicit — task says "modern nice UX" but does not specify copy; spec invents these labels |
| 7 | The score color thresholds (≤49 red, 50–74 amber, ≥75 green) match the ATS autopsy thresholds | Yes (Behavior §4 Section 1) |
| 8 | `evidenceFromResume` is a field on `KeywordGapMissingKeyword` but is not rendered in the UI (the Edge Cases section mentions not rendering a blockquote when empty, but no row layout in Section 2 mentions rendering it at all when non-empty) | **Implicit / hidden** — the row layout for Section 2 does not include `evidenceFromResume` in any rendered state, yet the Edge Cases section mentions it. This is contradictory: either the field should be rendered conditionally, or the Edge Case note should be removed. |

---

## Recommendation

**Revise specification** — address the following before implementation:

1. Replace "semantic ≈ teal wave" with a concrete PrimeNG icon name or specify a fallback (e.g. `pi-minus-circle` in teal).
2. Clarify whether `evidenceFromResume` is rendered in the missing keywords row when non-empty, or is deliberately omitted from the UI. The Edge Cases section implies it may be rendered, but the row layout does not include it.
3. Add a count badge to the "Acronym Issues" header if consistent treatment with other sections is intended.
