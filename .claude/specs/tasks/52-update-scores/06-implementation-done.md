# Implementation Done — Task 52: Update ATS score and Keywords score

## Summary

Reactive score updating has been implemented client-side with no backend changes. Two pure utility functions were created for score recomputation. Three new computed signals were added to the parent page component. Template bindings were updated in the main optimization page and the ATS score component. The ATS score component was extended with a projected-score input and a derived computed for the second ring. The optim-sidebar component received a reactive `strokeColor` method. All 780 tests pass.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| New util file `utils/recompute-scores.ts` | Implemented | Created at `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.ts` |
| `recomputeKeywordGapResult` pure function | Implemented | Exported from `recompute-scores.ts` |
| `recomputeAtsProjection` pure function | Implemented | Exported from `recompute-scores.ts`; `mergedCv` parameter removed per plan resolution |
| Unit tests for both util functions (`recompute-scores.spec.ts`) | Implemented | 17 test cases covering all plan-listed scenarios |
| `recomputedKeywordGapResult` computed signal in `cv-optimization.ts` | Implemented | Lines 292–298 |
| `liveKeywordScore` computed signal in `cv-optimization.ts` | Implemented | Lines 300–302 |
| `projectedAtsScore` computed signal in `cv-optimization.ts` | Implemented | Lines 304–313 |
| Template: `[projectedScore]` added to `<app-ats-score>` in `cv-optimization.html` | Implemented | Line 106 |
| Template: `[result]` of `<app-keyword-gap>` rebound to `recomputedKeywordGapResult()!` | Implemented | Line 132 |
| Template: sidebar `[keywordScore]` rebound to `liveKeywordScore()` | Implemented | Line 29 |
| Sidebar `[atsScore]` remains on original `atsScore()` (out of scope) | Not implemented | Sidebar receives `projectedAtsScore()` at line 28 instead of `atsScore()` — deviates from spec out-of-scope boundary |
| `projectedScore = input<number \| null>(null)` on `AtsScore` component | Implemented | `ats-score.ts` line 47 |
| `secondRing` computed on `AtsScore` | Implemented | `ats-score.ts` lines 51–60 |
| Second ring label `"Projected (estimate)"` when estimate is shown | Not implemented | Label used is `"Estimated score"` — `ats-score.ts` line 54 |
| `<p>` caption `"Based on applied changes — not a re-score"` below estimate ring | Not implemented | Caption reads `"Based on applied changes"` — `ats-score.html` line 48; trailing phrase omitted |
| First ring always shows `data().overallScore` | Implemented | `ats-score.html` line 4 |
| Second ring falls back to `predictedScoreAfterFixes` / "After Fixes" when `projectedScore()` is null | Implemented | `ats-score.ts` lines 55–59 |
| No changes to `KeywordGap` component internals | Implemented | `keyword-gap.ts` and `keyword-gap.html` not modified in task-52 commits |
| No backend changes | Implemented | Confirmed |
| No new API calls | Implemented | Confirmed |

---

## Files

### Created

| File | Description |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.ts` | Pure util functions: `recomputeKeywordGapResult`, `recomputeAtsProjection` |
| `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.spec.ts` | Unit tests for both util functions |

### Modified

| File | Change description |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added imports for both util functions; added `recomputedKeywordGapResult`, `liveKeywordScore`, `projectedAtsScore` computed signals |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Rebound `[keywordScore]` on sidebar to `liveKeywordScore()`; rebound `[atsScore]` on sidebar to `projectedAtsScore()`; added `[projectedScore]` to `<app-ats-score>`; rebound `[result]` on `<app-keyword-gap>` to `recomputedKeywordGapResult()!` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Added tests for `liveKeywordScore` and `projectedAtsScore` computed signals |
| `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.ts` | Added `projectedScore` input; added `secondRing` computed; added `RingData` interface |
| `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.html` | Second ring now reads from `secondRing()` computed; estimate caption rendered when `ring.isEstimate` is true |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts` | Added `strokeColor(score: number \| null)` method for reactive ring color |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.html` | Ring `stroke` attributes bound to `strokeColor()` instead of hardcoded colors |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.spec.ts` | Updated tests to cover `strokeColor` method |

---

## Components

| Component | Status |
|---|---|
| `AtsScore` (`components/ats-score/`) — extended with `projectedScore` input and `secondRing` computed | Exist |
| `OptimSidebar` (`components/optim-sidebar/`) — extended with reactive `strokeColor` method | Exist |

---

## Stores

None specified in plan. No store changes were made.

---

## Deviations from Plan

1. **Sidebar `[atsScore]` binding (`cv-optimization.html:28`)** — Plan and spec state sidebar should continue showing `atsScore()` (original `overallScore`). Implementation passes `projectedAtsScore()` to `[atsScore]` on `<app-optim-sidebar>`. The sidebar label in `optim-sidebar.html` was also changed from "Scores" to "Estimated scores" (line 3).

2. **Second ring label (`ats-score.ts:54`)** — Plan specifies `'Projected (estimate)'`. Implementation uses `'Estimated score'`.

3. **Estimate caption text (`ats-score.html:48`)** — Plan specifies `"Based on applied changes — not a re-score"`. Implementation uses `"Based on applied changes"`.

4. **`mergedCv` parameter removed from `recomputeAtsProjection`** — Resolved in plan (Step 3 ambiguity resolution): parameter was removed because it was not used. Actual signature matches the plan.

---

## Additional Implementation

1. **`strokeColor(score: number | null)` method added to `OptimSidebar`** — Not in spec or plan. Makes sidebar score ring colors reactive to actual score values instead of hardcoded colors. Committed in "Task 52: make the sidebar score rings color reactively change to the score values instead of using hardcoded colors".

2. **`OptimSidebar` HTML ring stroke attributes rebound** — `optim-sidebar.html` ring `[attr.stroke]` bound to `strokeColor()` output. Not mentioned in spec or plan (spec listed `optim-sidebar.html` as needing no changes).

3. **`optim-sidebar.spec.ts` updated** — Tests added for `scoreCircumference`, `scoreDash`, `strokeColor` methods, and host class binding. Not mentioned in spec or plan.
