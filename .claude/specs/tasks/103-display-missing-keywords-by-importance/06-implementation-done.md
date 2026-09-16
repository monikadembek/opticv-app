# Implementation Done — Task 103: Display missing keywords by importance

### Summary

Sorted the two missing-keyword lists in `keyword-gap.ts` (`missingLikelyHas` and `missingGenuinelyLacks`) by `importance`, Critical → High → Medium → Low, using a local rank map and a stable sort applied after the existing `filter`. No template or shared-datatype changes were made.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Sort `missingLikelyHas` by importance (Critical → High → Medium → Low) | Implemented | `keyword-gap.ts` computed signal chains `.sort(byImportance)` after `.filter()` |
| Sort `missingGenuinelyLacks` by importance (Critical → High → Medium → Low) | Implemented | Same pattern applied to this computed signal |
| Stable sort — preserve relative order within same importance tier | Implemented | Uses native `Array.prototype.sort`, relied on as stable |
| Local rank map/constant defined inside `keyword-gap.ts`, not exported from `@opticv/datatypes` | Implemented | `IMPORTANCE_RANK` constant, module-scoped, not exported |
| No `keyword-gap.html` (template) changes required | Implemented | No changes made to `keyword-gap.html` |
| No changes to shared `KeywordGapResult` / `KeywordGapMissingKeyword` types | Implemented | No changes to `packages/shared/datatypes/src/lib/datatypes.ts` |
| No AI/prompt changes | Implemented | No changes to any prompt-related file |
| No DB/Prisma schema changes | Implemented | No changes to Prisma schema |
| No new visual grouping/subheadings by importance tier | Implemented | Flat list structure unchanged |
| No changes to `matchedKeywords`, `underweightedKeywords`, `fabricationWarnings`, `acronymIssues` ordering | Implemented | Those computed signals untouched |
| No changes to selection/editing/bullet-position logic | Implemented | `selectedKeywords`, `keywordEdits`, `keywordBulletPositions`, etc. untouched |
| Edge case: empty `missingKeywords` array resolves to empty sorted arrays | Implemented | Sort on empty array returns empty array; existing `@if` guards unaffected |
| Edge case: all items same importance level — order unchanged | Implemented | Stable sort behavior |
| Edge case: unknown/unexpected `importance` value sorts after known levels | Implemented | `getImportanceRank` falls back to a rank beyond all known levels via `??` |
| Tests: `missingLikelyHas` ordered Critical → High → Medium → Low | Implemented | New test added in `keyword-gap.spec.ts` |
| Tests: `missingGenuinelyLacks` ordered Critical → High → Medium → Low | Implemented | New test added in `keyword-gap.spec.ts` |
| Tests: equal-importance items retain relative input order | Implemented | New test added in `keyword-gap.spec.ts` |

### Files

**Created:**

- None.

**Modified:**

- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts`

### Components

| Component (per plan) | Status | Note |
| --- | --- | --- |
| `KeywordGap` (`keyword-gap.ts`) | Exist | Pre-existing component, modified per plan |

### Stores

Not applicable — no stores were part of this task's plan or specification.

### Deviations

None. Implementation follows the plan's steps as written: `IMPORTANCE_RANK` map and `getImportanceRank`/`byImportance` helpers added near `RING_CIRCUMFERENCE` (plan steps 1–2); sort applied to `missingLikelyHas` (step 3) and `missingGenuinelyLacks` (step 4) via a single shared comparator to avoid duplication (step 5); `keyword-gap.spec.ts` extended additively with three new tests (step 6).

### Additional Implementation

None.
