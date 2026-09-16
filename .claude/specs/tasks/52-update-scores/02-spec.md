# Task Specification

## Source

Azure DevOps Task: 52 — Update ATS score and Keywords score when user applies suggestions

## Goal

Make the ATS score and keyword match score on the CV optimization page update reactively as the user applies suggestions (toggles keywords, selects bullet rewrites, picks a summary variant). Both scores are computed client-side from data already in component state — no backend changes, no new API calls.

## Context

Feature lives in `apps/opticv-web/src/app/features/cv-optimization/`.

Current state:
- `cv-optimization.ts` holds all state as Angular signals. `autopsyResult` and `keywordGapResult` are `computed` signals derived from the `results` map.
- `atsScore` and `keywordScore` are simple `computed` signals that read `overallScore` and `matchScore` from those results.
- `mergedCv` is a `computed` that already reactively rebuilds the CV from all selection signals. The scores do NOT update when selections change.
- `AtsScore` component (`components/ats-score/`) takes a `data: ResumeAutopsyResult` input and renders two score rings: "Current ATS Score" and "After Fixes".
- `KeywordGap` component (`components/keyword-gap/`) takes a `result: KeywordGapResult` input and renders one score ring + keyword lists.
- `OptimSidebar` component receives `atsScore` and `keywordScore` as `number | null` inputs and renders compact score rings.

Research and decisions are documented in `/docs/score-updating.md`.

## Scope

### In scope

- New util file `utils/recompute-scores.ts` with two pure functions: `recomputeKeywordGapResult` and `recomputeAtsProjection`.
- Three new `computed` signals in `cv-optimization.ts`: `recomputedKeywordGapResult`, `liveKeywordScore`, `projectedAtsScore`.
- Template rebindings in `cv-optimization.html`: keyword-gap gets the recomputed result; ats-score gets a new `projectedScore` input.
- A new optional `projectedScore` input on `AtsScore` component; when provided, the second ring shows the projected value labeled as an estimate.
- Unit tests for both util functions.

### Out of scope

- No backend changes, no new endpoints, no database changes.
- No changes to `KeywordGap` component internals.
- No changes to `OptimSidebar` (sidebar continues to show the real `atsScore`, not the projection).
- No persistence of recomputed scores.

## Behavior

### Keyword Score (deterministic, in-place update)

1. When the user toggles a missing keyword in `KeywordGap`, `selections.selectedKeywords` updates via the existing `onKeywordToggled` handler.
2. `recomputedKeywordGapResult` (new computed) calls `recomputeKeywordGapResult(keywordGapResult(), selections().selectedKeywords)` and returns an updated `KeywordGapResult`.
3. The updated result is fed directly to `<app-keyword-gap [result]="recomputedKeywordGapResult()!">`, replacing the original. The ring and caption update immediately.
4. `liveKeywordScore = computed(() => recomputedKeywordGapResult()?.matchScore ?? null)` feeds the sidebar, replacing `keywordScore`.

**`recomputeKeywordGapResult` logic:**
- `structuredClone` the original `KeywordGapResult`.
- For each keyword in `selectedKeywords` that appears in `original.missingKeywords`, increment `requiredMatched` (if `isRequired`) or `preferredMatched` (else), clamped to the respective `*Total`.
- Back-solve the weight `w` that reproduces `original.matchScore` from `original.matchScoreBreakdown`. Formula: `matchScore = w * (reqMatched/reqTotal) + (1-w) * (prefMatched/prefTotal)`. Solve for `w` only when both totals are non-zero and the denominator is stable (avoid near-zero denominators); fall back to `w = 0.7` otherwise.
- Recompute `matchScore` using solved `w` and updated counts. Round to integer. Never below `original.matchScore`.
- Return the cloned result (keyword arrays unchanged — only score and breakdown numbers drive the UI).

### ATS Score (directional projection, shown alongside real score)

1. `projectedAtsScore` (new computed) calls `recomputeAtsProjection(autopsyResult(), mergedCv(), selections(), bulletUpgradeResult(), selectedMissingBullets())` whenever any of those signals change.
2. The projection is passed to `<app-ats-score [data]="autopsyResult()!" [projectedScore]="projectedAtsScore()">`.
3. In `AtsScore`, when `projectedScore()` is non-null, the second ring shows the projected value with label **"Projected (estimate)"** instead of "After Fixes". A small caption or tooltip explains this is an estimate based on applied changes, not a re-score.
4. When `projectedScore()` is null (no selections, or `autopsyResult()` not yet available), the second ring reverts to the original "After Fixes" behavior with `data().predictedScoreAfterFixes`.
5. The first ring ("Current ATS Score") always shows `data().overallScore` — it never changes.

**`recomputeAtsProjection` logic:**
- Returns a projected integer.
- Start at `original.overallScore`.
- For each issue in `original.issues`, add `issue.estimatedImpact` heuristically:
  - `category === 'keywords'`: credit proportional to `selectedKeywords.length / max(missingKeywords.length, 1)` (fraction of missing keywords applied). Cap partial credit: only add impact when fraction > 0.
  - `category === 'content'`: credit proportional to `(acceptedBullets + addedMissingBullets) / max(totalUpgradableBullets, 1)`. Add summary credit when a summary variant is selected (fraction = 1 for summary credit).
  - All other categories (`parsing`, `formatting`, `structure`, `length`, `contact`): no credit.
- Clamp result to `[overallScore, predictedScoreAfterFixes]`. Round to integer.
- When no selections are active, returns `overallScore` exactly (so `projectedScore` signal returns `null` in that case to fall back to "After Fixes" display).

**Null-guarding for `projectedAtsScore`:** if `autopsyResult()` is null, return null. If no selections are active (zero keywords selected, zero bullets selected, no missing bullets, no summary angle), return null so the "After Fixes" ring is shown unchanged.

### Clearing selections

- Clearing all selections → both scores return exactly to their original values (keyword score back to `original.matchScore`; ATS ring back to "After Fixes" with `predictedScoreAfterFixes`).

## Edge Cases

- `keywordGapResult()` is null (optimization not yet complete): `recomputedKeywordGapResult` returns null; template is guarded by existing `@if (keywordGapResult())`.
- `autopsyResult()` is null: `projectedAtsScore` returns null; no second-ring change.
- All required keywords already applied (counts hit `requiredTotal`): clamping ensures no overshoot.
- `requiredTotal === 0` and `preferredTotal === 0` (degenerate data): back-solving skipped, `matchScore` unchanged, returns `original.matchScore`.
- `estimatedImpact` values are commented out in the current template (the progress bar is commented). The util still reads the data model field which is present in the type — this is fine since it only drives the projection computation, not any rendering other than the score number.
- Stored-mode (loading a saved optimization): selections are restored from persisted state, computeds re-derive scores automatically — no extra work needed.

## Data / API

**No backend or DB changes.**

Relevant types (from `@opticv/datatypes`):
```ts
KeywordGapResult {
  matchScore: number;
  matchScoreBreakdown: { requiredMatched, requiredTotal, preferredMatched, preferredTotal };
  missingKeywords: Array<{ keyword, isRequired, importance, suggestedPlacement, ... }>;
  matchedKeywords: [...];
}
ResumeAutopsyResult {
  overallScore: number;
  predictedScoreAfterFixes: number;
  issues: Array<{ id, category, severity, estimatedImpact, ... }>;
  strengths: [...];
}
```

## Critical Files

| File | Change type | Description |
|------|-------------|-------------|
| `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.ts` | **New** | Pure util functions: `recomputeKeywordGapResult`, `recomputeAtsProjection` |
| `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.spec.ts` | **New** | Unit tests for both functions |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Edit | Add `recomputedKeywordGapResult`, `liveKeywordScore`, `projectedAtsScore` computeds |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Edit | Rebind keyword-gap `[result]`; add `[projectedScore]` to ats-score; rebind sidebar `[keywordScore]` |
| `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.ts` | Edit | Add `projectedScore = input<number \| null>(null)` input and derived computed for ring label/value |
| `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.html` | Edit | Second ring renders projected value + "Projected (estimate)" label when `projectedScore()` non-null |

Files that need **no changes**: `keyword-gap.ts`, `keyword-gap.html`, `optim-sidebar.ts`, `optim-sidebar.html`.

## Acceptance (DEV)

- `npm exec nx test opticv-web` passes. New spec file covers:
  - `recomputeKeywordGapResult`: required keyword selected → `requiredMatched` increments, `matchScore` rises; preferred keyword selected → `preferredMatched` increments; zero selections → returns score equal to original; result never below original; clamps when all keywords applied.
  - `recomputeAtsProjection`: zero selections → returns `overallScore`; keyword issue credited proportionally; result clamped to `[overallScore, predictedScoreAfterFixes]`.
- `npm exec nx typecheck opticv-web` passes with no errors.
- `npm exec nx lint opticv-web` passes with no warnings.
- Manual verification (run both dev servers):
  - Toggle missing keywords → keyword ring, caption, and sidebar keyword score update in place immediately.
  - Accept bullet rewrites / add missing bullets / pick summary angle → ATS second ring updates to show "Projected (estimate)" label with a higher value; first "Current ATS Score" ring stays unchanged.
  - Clear all selections → keyword ring reverts to original `matchScore`; ATS second ring reverts to "After Fixes" with `predictedScoreAfterFixes`.
  - Sidebar ATS score shows original `overallScore` at all times.
  - No regressions in other sections (bullet rewriter, summary, cover letter, interview prep).
