# Spec Review: 23-summary-rewrite-ui

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, grounded in actual backend schema, and covers the main functional requirements clearly. The core data types, component API, and wiring changes are fully specified. However, two non-critical gaps exist: the `keywordsIncorporated` section is described as "collapsed" but no expand/collapse behavior is specified, and the spec does not clarify whether `datatypes` must be rebuilt/re-exported before `opticv-web` can import the new types (a build-order concern that affects the acceptance criteria). No invented requirements were found.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **"Collapsed list" for `keywordsIncorporated` is underspecified (Behavior, line 53)**
   The spec says `keywordsIncorporated` is shown as "a collapsed list... shown as pill tags" but does not specify:
   - What triggers expand/collapse (a button? an accordion? a "Show all" link?)
   - What the collapsed state shows (e.g., first N tags + "show more", or just a count)
   - Whether this is a local signal in the component or a PrimeNG Accordion
   This is implementable with a reasonable assumption, but it introduces design freedom that may not match intent.

2. **Build order for `datatypes` not reflected in acceptance criteria**
   The acceptance criteria lists `npm exec nx build datatypes` as a check, but does not mention that the `opticv-web` typecheck/lint should be run *after* datatypes is built (or that the Nx task graph handles this). This is a minor process gap — the criteria order could mislead a reviewer running checks manually.

3. **`recommendationReason` optionality not addressed**
   The backend JSON schema marks `recommendationReason` as NOT in the `required` array (only `originalSummary`, `variants`, `recommendedVariant`, `keywordsIncorporated` are required). The shared type in the spec defines `recommendationReason: string` (non-optional). If the backend omits this field, a runtime error or display glitch could occur. This should either be typed as `recommendationReason?: string` or the type guard should validate it.

4. **No unit test mentioned in acceptance criteria**
   The raw task says nothing about tests, but the rules in `rules.md` require task completeness. The spec's acceptance criteria has no mention of unit tests for the new component. This is a gap relative to project conventions.

---

### Unclear or Ambiguous Sections

- **Behavior, step 4, "recommended variant card is visually highlighted"**: The spec says "e.g., a coloured border or 'Recommended' badge" — the `e.g.` leaves the visual treatment undefined. Both options are valid but may differ in accessibility implications (colour-only vs. text label). The WCAG AA requirement from `conventions.md` requires that distinction not rely on colour alone.

- **Behavior, step 4, "Recommendation reason — a sentence below the variants"**: "Below the variants" is ambiguous about placement: below all three cards as a group, or below the recommended card specifically? Both are reasonable layouts.

---

### Invented or Unsupported Requirements

None. All requirements trace back to the raw task ("add summary-rewrite component", "display results for SUMMARY_REWRITE", "modern nice UX") plus answers to clarifying questions (before/after layout, API wiring).

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|------------|---------------------------|
| 1 | The backend always returns exactly 3 variants (minItems/maxItems = 3 per seed schema) | Partially — noted as "always 3" in a code comment, not in prose |
| 2 | `SUMMARY_REWRITE` should run in parallel with `KEYWORD_GAP` via the existing `mergeMap` with concurrency 3 | Implied by "alongside KEYWORD_GAP" — not explicitly stated |
| 3 | The existing `OptimizationResultPanel` component requires no changes to support this new panel | Implicit — not stated |
| 4 | `recommendationReason` is always present in the response (typed as non-optional `string`) | Implicit — contradicts backend schema where it is not `required` |
| 5 | The "collapsed list" for `keywordsIncorporated` collapses by default (start collapsed) | Implicit in the word "collapsed" |
| 6 | No new route or navigation change is needed — the panel is already at the correct accordion position | Implicit |
| 7 | `datatypes` package re-export does not need updating (no barrel file changes beyond the main source) | Implicit |

---

## Recommendation

**Revise specification** — address the following before implementation:

1. Clarify the expand/collapse behavior for `keywordsIncorporated` (what is the collapsed state? what triggers expansion?).
2. Change `recommendationReason` to `recommendationReason?: string` in the shared type (or add validation to the type guard), to match the actual backend JSON schema.
3. Add a note confirming that the "Recommended" badge includes a visible text label (not colour-only) to satisfy WCAG AA contrast/non-colour requirements.
4. Optionally: add a basic unit test criterion for the `SummaryRewrite` component (one test verifying it renders the recommended variant card) to align with project rules.
