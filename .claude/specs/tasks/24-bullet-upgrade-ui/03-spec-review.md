# Spec Review — Task 24: Display bullet upgrade results in frontend app

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured and covers the core task requirements faithfully. It correctly expands the brief raw task into a technically actionable specification using established project conventions. However, two non-critical issues need attention: (1) a comment inside a template code block is invalid HTML syntax, and (2) the section ordering described in prose (Sections 1–4) does not match the section numbering used in Behavior headings. Neither blocks implementation but both risk causing confusion.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **Invalid HTML comment inside template snippet (Wiring section)**
   The code block in "Wiring in `cv-optimization.html`" contains an HTML comment inside an Angular binding:
   ```
   [error]="results().get(PromptType.BULLET_UPGRADE)?.error ?? null"  <!-- adjust to actual error field -->
   ```
   HTML comments inside attribute values are invalid and will cause a parse error. The note should be placed outside the element or in a separate prose sentence.

2. **Section numbering mismatch between Scope and Behavior**
   The Scope section says "Display all three result sections: positions/bullets, missing bullet suggestions, verb diversity check" — counting three sections. But the Behavior section defines **four** sections (Section 1 Positions, Section 2 Missing Suggestions, Section 3 Verb Diversity, Section 4 Overall Notes). The Scope list omits "Overall Notes" as a display section, creating an inconsistency.

3. **Acceptance criterion references "mock data" — test mechanism unspecified**
   The criterion "BulletRewriter component renders all three sections (positions, suggestions, verb diversity) from mock data" implies a test or Storybook story exists, but the spec says nothing about how mock data should be provided for verification. This is ambiguous: does it mean a unit test, a Storybook story, or manual inspection with hardcoded data?

4. **`error` field on `SseJobCompleteEvent` not confirmed**
   The wiring snippet uses `results().get(PromptType.BULLET_UPGRADE)?.error`, but the spec does not confirm that the `SseJobCompleteEvent` type exposes an `error` field directly (the comment "adjust to actual error field" acknowledges this). All other accordion panels use the same pattern, but the spec should either confirm the field name or resolve it explicitly rather than leaving it as a comment.

---

### Unclear or Ambiguous Sections

- **"treat gracefully (skip rewritten card)"** in Edge Cases: states that if `rewrittenText` is undefined on a `rewrite` bullet the rewritten card is skipped, but it is unclear whether the original text and weakness are still shown or the entire bullet entry is hidden. Implementors may interpret this differently.

- **Section 4 positioning**: The spec says Overall Notes is displayed "above Section 2 (after the positions list)." In the Behavior heading list, Section 4 appears after Section 3. The visual ordering and the heading numbering are contradictory — it is unclear whether Section 4 renders before or after Section 3 (Verb Diversity).

---

### Invented or Unsupported Requirements

None. All specified behaviors originated from either the raw task, the clarifying questions answered by the PO, or the existing backend output schema.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | The backend `BULLET_UPGRADE` payload shape exactly matches the type definitions listed (positions, bullets, missing suggestions, verb diversity) | Yes — "mirroring the backend output schema" |
| 2 | `OptimizationResultPanel` is the correct wrapper for this component, consistent with other result panels | Yes — referenced via "Reference implementation: `components/summary-rewrite/`" |
| 3 | `SseJobCompleteEvent` has an `error` field accessible at the top level | Implicit — acknowledged with "adjust to actual error field" comment, not confirmed |
| 4 | No new unit tests are required beyond typecheck and build | Implicit — no tests mentioned in scope or acceptance beyond "renders from mock data" |
| 5 | The `weakness` field is always present on every bullet regardless of action | Implicit — type definition marks it as required (`weakness: string`) but edge cases don't address missing/empty `weakness` |
| 6 | All `BulletUpgradeResult` sub-types need to be exported from `datatypes.ts` for use in the frontend | Implicit — not explicitly stated |

---

## Recommendation

**Revise specification** — fix the two clarity issues (section ordering contradiction and `rewrittenText` edge case behavior) and remove or move the HTML comment from the template snippet. The substance is sound; only minor corrections are needed before handoff to implementation.
