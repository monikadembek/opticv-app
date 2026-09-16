# Code Review — Task 103: Display missing keywords by importance

### Summary

- Overall result: **PASS**
- The implementation matches the specification and implementation plan exactly: a local `IMPORTANCE_RANK` map and `byImportance` comparator are added to `keyword-gap.ts`, and both `missingLikelyHas` and `missingGenuinelyLacks` computed signals now `.sort(byImportance)` after their existing `.filter()`. The sort is safe (operates on the new array `.filter()` returns, does not mutate `result().missingKeywords`), stable (native `Array.sort` is stable in the ES2019+/modern-browser targets this app runs on), and defensively ranks unknown `importance` values last per the spec's edge case. No template or shared-datatype changes were made, matching scope. Tests cover all three acceptance-criteria assertions from the spec.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

None.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Sort `missingLikelyHas` by importance (Critical → High → Medium → Low) | Covered | `keyword-gap.ts:82-86` |
| Sort `missingGenuinelyLacks` by importance (Critical → High → Medium → Low) | Covered | `keyword-gap.ts:88-92` |
| Stable sort — preserve relative order within same importance tier | Covered | Native `Array.sort` stability relied upon; verified by test `keyword-gap.spec.ts` "preserves relative input order for items with equal importance" |
| Local rank map/constant in `keyword-gap.ts`, not exported from `@opticv/datatypes` | Covered | `IMPORTANCE_RANK` defined and used only in `keyword-gap.ts:19-26`, not exported |
| No template (`keyword-gap.html`) changes | Covered | No diff to `keyword-gap.html` |
| No changes to shared `KeywordGapResult`/`KeywordGapMissingKeyword` types | Covered | No diff to `datatypes.ts` |
| Unknown/unexpected `importance` value sorts after known levels, doesn't crash | Covered | `getImportanceRank` falls back to `Object.keys(IMPORTANCE_RANK).length` (4) via `??`, `keyword-gap.ts:28-32` |
| Tests: `missingLikelyHas` ordered Critical→High→Medium→Low | Covered | New spec test, `keyword-gap.spec.ts` |
| Tests: `missingGenuinelyLacks` ordered Critical→High→Medium→Low | Covered | New spec test, `keyword-gap.spec.ts` |
| Tests: equal-importance items retain relative input order | Covered | New spec test, `keyword-gap.spec.ts` |
| No changes to `matchedKeywords`, `underweightedKeywords`, `fabricationWarnings`, `acronymIssues` ordering | Covered | No diff to those computed signals |
| No changes to selection/editing/bullet-position logic | Covered | No diff to `selectedKeywords`, `keywordEdits`, `keywordBulletPositions`, etc. |

### Plan Deviations

None. Implementation follows the plan's steps 1–6 as written: rank map added near `RING_CIRCUMFERENCE` (step 1), lookup fallback via `getImportanceRank` (step 2), sort applied to both computed signals via a single shared `byImportance` comparator rather than duplicating comparator logic (steps 3–5), and `keyword-gap.spec.ts` extended additively (step 6).

### Null Safety Issues

None. `KeywordGapMissingKeyword['importance']` is a non-nullable string-literal union (`'critical' | 'high' | 'medium' | 'low'`), so `getImportanceRank`'s parameter is never `null`/`undefined` by type; the `??` fallback in `IMPORTANCE_RANK[importance] ?? Object.keys(IMPORTANCE_RANK).length` only guards against a value outside the known literal union reaching this code at runtime (e.g., via an `any`-typed upstream source), consistent with the spec's defensive edge case.

### Code Smells

None. The rank map, lookup function, and comparator are small, single-purpose, and colocated with their only consumers. No duplication — both computed signals reuse the same `byImportance` comparator rather than inlining the sort logic twice, as required by the plan's step 5 ("avoid duplication").

### Recommendation

- Merge as-is
