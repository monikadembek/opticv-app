# Implementation Done: 23-summary-rewrite-ui

## Summary

Delivered the `SummaryRewrite` Angular component and wired it into the `cv-optimization` feature. New shared types were added to `@opticv/datatypes`. The accordion panel `value="3"` now uses `<app-optimization-result-panel>` wrapping `<app-summary-rewrite>` instead of a raw JSON `<pre>` dump. Two items from the plan were not implemented: the `keywordsIncorporated` expand/collapse toggle and the `SUMMARY_REWRITE`-only prompt filter (the filter was removed entirely, so all prompt types now run on form submit).

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Add `SummaryRewriteVariantAngle`, `SummaryRewriteVariant`, `SummaryRewriteResult` to `datatypes.ts` | Implemented | `recommendationReason` typed as `string \| undefined` |
| Create `SummaryRewrite` component (`app-summary-rewrite`, `OnPush`) | Implemented | |
| `result = input.required<SummaryRewriteResult>()` | Implemented | |
| Original summary block — shows text or "No summary present" placeholder | Implemented | |
| Three variant cards with angle badge, "Recommended" badge, word count | Implemented | |
| Recommended card visually highlighted (coloured border + "Recommended" text badge) | Implemented | |
| Strategic note in italic style | Implemented | |
| `keywordsUsed` pills — hidden when array is empty | Implemented | |
| `recommendationReason` section — shown when truthy, hidden otherwise | Implemented | |
| `keywordsIncorporated` rendered as pills when non-empty | Implemented | |
| `keywordsIncorporated` expand/collapse (max 8 + "Show all (N)" button) | Not implemented | All keywords rendered unconditionally; no toggle |
| `isSummaryRewriteResult` type guard in `cv-optimization.ts` | Implemented | |
| `summaryRewriteResult` computed signal in `cv-optimization.ts` | Implemented | |
| `SUMMARY_REWRITE` included in `runOptimization` prompt filter | Not implemented | `filter` operator removed; all seven prompt types run |
| Panel `value="3"` replaced with `<app-optimization-result-panel>` + `<app-summary-rewrite>` | Implemented | |
| Each variant card has `role="article"` and `aria-label` | Implemented | |
| No `any` types | Implemented | |
| No `TODO` comments | Implemented | |

---

## Files

### Created

| File |
|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.ts` |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.html` |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.spec.ts` |

### Modified

| File | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added `SummaryRewriteVariantAngle`, `SummaryRewriteVariant`, `SummaryRewriteResult` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added `isSummaryRewriteResult`, `summaryRewriteResult`, `SummaryRewrite` import; removed `filter` operator |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Replaced raw JSON panel `value="3"` with `<app-optimization-result-panel>` + `<app-summary-rewrite>` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Updated (test changes) |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts` | Updated (test changes) |

---

## Components

| Component | Status |
|---|---|
| `SummaryRewrite` (`app-summary-rewrite`) | Exist |

---

## Stores

No stores were specified or implemented for this task.

---

## Deviations

1. **`keywordsIncorporated` expand/collapse not implemented.** Plan Step 2a/2b specified `showAllKeywords` signal, `visibleKeywords`, `hasMoreKeywords`, `hiddenKeywordsCount` computed properties, and a "Show all (N)" / "Show less" toggle button. All keywords are rendered unconditionally instead.

2. **`filter` operator removed rather than extended.** Plan Step 3c specified changing the filter to pass `KEYWORD_GAP` and `SUMMARY_REWRITE`. The `filter` operator was deleted entirely; `runOptimization` now runs all values of `PromptType`.

3. **`angleLabels` implemented as a module-level `const` and class property instead of `computed()` returning a `Map`.** Plan Step 2a specified `angleLabel = computed(...)`.

4. **"Why this variant?" label changed to "Why the recommended variant?".** Plan Step 2b Section 3 specified the former text.

---

## Additional Implementation

- `summary-rewrite.spec.ts` — a unit test file for the `SummaryRewrite` component. Not in the plan.
- `keyword-gap.spec.ts` — modified as part of this commit. Not described in the plan.
