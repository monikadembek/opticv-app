# Implementation Plan — Task 52: Update ATS score and Keywords score

## Review status

Spec review: **PASS WITH ISSUES** (no critical issues). Ambiguities resolved below before implementation.

---

## Resolved ambiguities from spec review

**1. `totalUpgradableBullets` definition**
`totalUpgradableBullets` = number of bullets across all positions in `bulletUpgradeResult` whose `action === 'rewrite'`. These are the bullets the user can actually accept. Derivation:
`bulletUpgradeResult.positions.flatMap(p => p.bullets).filter(b => b.action === 'rewrite').length`

**2. Summary vs. bullet credit within `content` issues**
Each `content` issue gets a single combined fraction:
`fraction = max(bulletFraction, summaryFraction)`
where `bulletFraction = (acceptedBullets + addedMissingBullets) / max(totalUpgradableBullets, 1)` and `summaryFraction = summaryAngleSelected ? 1 : 0`. Taking `max` avoids double-counting a single issue — the user either addressed content via bullets or via summary; whichever credit is higher applies.

**3. `mergedCv` parameter**
Remove from `recomputeAtsProjection` signature. All needed inputs are `autopsyResult`, `selections`, `bulletUpgradeResult`, and `selectedMissingBullets`.

**4. `selectedKeywords` guard**
The function does not need an explicit guard — it iterates `selectedKeywords` and looks each one up in `original.missingKeywords`. Keywords not found there simply produce no increment. No defensive check needed.

**5. "Tooltip vs. caption" for estimate label**
Use a `<p>` caption below the second ring (same pattern as other captions in `ats-score.html`). No tooltip — keeps it accessible without hover dependency.

**6. `projectedAtsScore` returns null when equals `overallScore`**
Return null whenever the computed projection equals `overallScore` (regardless of whether selections are active but produced zero credit). This ensures "After Fixes" is always shown when the estimate provides no new information.

**7. Back-solving `w` — denominator threshold**
Use `Math.abs(denominator) < 0.001` as the "near-zero" guard before dividing.

---

## Implementation steps

### Step 1 — Create `utils/recompute-scores.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.ts`

Exports two pure functions. No Angular dependencies. Import types only from `@opticv/datatypes`.

#### `recomputeKeywordGapResult(original: KeywordGapResult, selectedKeywords: string[]): KeywordGapResult`

Logic in order:
1. `structuredClone(original)` → `clone`.
2. If `selectedKeywords` is empty, return `clone` immediately.
3. Build a `Set<string>` from `selectedKeywords` for O(1) lookup.
4. Iterate `clone.matchScoreBreakdown` — for each entry in `original.missingKeywords` whose `keyword` is in the set:
   - if `isRequired`: `clone.matchScoreBreakdown.requiredMatched = Math.min(clone.matchScoreBreakdown.requiredMatched + 1, clone.matchScoreBreakdown.requiredTotal)`
   - else: `clone.matchScoreBreakdown.preferredMatched = Math.min(clone.matchScoreBreakdown.preferredMatched + 1, clone.matchScoreBreakdown.preferredTotal)`
5. Back-solve weight `w`:
   - `reqRatio = original.matchScoreBreakdown.requiredTotal > 0 ? original.matchScoreBreakdown.requiredMatched / original.matchScoreBreakdown.requiredTotal : null`
   - `prefRatio = original.matchScoreBreakdown.preferredTotal > 0 ? original.matchScoreBreakdown.preferredMatched / original.matchScoreBreakdown.preferredTotal : null`
   - If both ratios are non-null and `reqRatio !== prefRatio`:
     - `numerator = (original.matchScore / 100) - prefRatio`
     - `denominator = reqRatio - prefRatio`
     - if `Math.abs(denominator) >= 0.001`: `w = Math.max(0, Math.min(1, numerator / denominator))`
     - else: `w = 0.7`
   - If only `reqRatio` is non-null: `w = 1`
   - If only `prefRatio` is non-null: `w = 0`
   - If neither: return `clone` with `matchScore` unchanged.
6. Compute new score:
   - `newReqRatio = clone.matchScoreBreakdown.requiredTotal > 0 ? clone.matchScoreBreakdown.requiredMatched / clone.matchScoreBreakdown.requiredTotal : 0`
   - `newPrefRatio = clone.matchScoreBreakdown.preferredTotal > 0 ? clone.matchScoreBreakdown.preferredMatched / clone.matchScoreBreakdown.preferredTotal : 0`
   - `rawScore = w * newReqRatio + (1 - w) * newPrefRatio`
   - `clone.matchScore = Math.max(original.matchScore, Math.round(rawScore * 100))`
7. Return `clone`.

#### `recomputeAtsProjection(original: ResumeAutopsyResult, selections: UserSelections, bulletUpgradeResult: BulletUpgradeResult | null, selectedMissingBullets: Array<{ forPosition: string; suggestedBullet: string }>): number | null`

Logic in order:
1. If no selections active — `selections.selectedKeywords.length === 0 && selections.selectedBullets.length === 0 && selectedMissingBullets.length === 0 && selections.selectedSummaryAngle === null` — return `null`.
2. `projected = original.overallScore` (float accumulator).
3. Precompute:
   - `totalUpgradableBullets = bulletUpgradeResult ? bulletUpgradeResult.positions.flatMap(p => p.bullets).filter(b => b.action === 'rewrite').length : 0`
   - `acceptedBullets = selections.selectedBullets.length`
   - `addedMissingBullets = selectedMissingBullets.length`
   - `bulletFraction = totalUpgradableBullets > 0 ? (acceptedBullets + addedMissingBullets) / totalUpgradableBullets : 0`
   - `summaryFraction = selections.selectedSummaryAngle !== null ? 1 : 0`
   - `keywordTotal = original.issues.filter(i => i.category === 'keywords').length > 0 ? original.missingKeywords?.length ?? 0 : 0` — but since `ResumeAutopsyResult` has no `missingKeywords`, use `selections.selectedKeywords.length` as numerator only; for denominator, use the sum of `requiredTotal + preferredTotal` from `KeywordGapResult` — **but `KeywordGapResult` is not passed here.** Simplification: for `category === 'keywords'` issues, use `keywordFraction = selectedKeywords.length > 0 ? 1 : 0` as a binary flag (any keyword applied → full credit for keyword issues). This avoids needing to pass `keywordGapResult` into the function.

   > **Rationale for binary keyword fraction:** `ResumeAutopsyResult` has no reference to individual missing keywords; the `missingKeywords` count is only in `KeywordGapResult`. Passing an extra parameter just for this would couple the function unnecessarily. A binary flag (any/none) is consistent with the heuristic nature of the ATS projection.

4. For each issue in `original.issues`:
   - `category === 'keywords'`: `credit = issue.estimatedImpact * (selections.selectedKeywords.length > 0 ? 1 : 0)`
   - `category === 'content'`: `credit = issue.estimatedImpact * Math.max(bulletFraction, summaryFraction)`
   - all other categories: `credit = 0`
   - `projected += credit`
5. `result = Math.round(Math.min(original.predictedScoreAfterFixes, Math.max(original.overallScore, projected)))`
6. If `result === original.overallScore`, return `null` (no meaningful change to show).
7. Return `result`.

---

### Step 2 — Add computed signals to `cv-optimization.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

Add imports at top of file:
- `recomputeKeywordGapResult` and `recomputeAtsProjection` from `./utils/recompute-scores`

Add three new `computed` signals after the existing `keywordScore` computed (line ~287):

```
readonly recomputedKeywordGapResult = computed<KeywordGapResult | null>(() => {
  const r = this.keywordGapResult();
  if (!r) return null;
  return recomputeKeywordGapResult(r, this.selections().selectedKeywords);
});

readonly liveKeywordScore = computed<number | null>(
  () => this.recomputedKeywordGapResult()?.matchScore ?? null,
);

readonly projectedAtsScore = computed<number | null>(() => {
  const autopsy = this.autopsyResult();
  if (!autopsy) return null;
  return recomputeAtsProjection(
    autopsy,
    this.selections(),
    this.bulletUpgradeResult(),
    this.selectedMissingBullets(),
  );
});
```

No other changes to this file.

---

### Step 3 — Update `cv-optimization.html` template bindings

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Three targeted edits:

**3a.** ATS score element (line ~104): add `[projectedScore]` input:
```
<app-ats-score [data]="autopsyResult()!" [projectedScore]="projectedAtsScore()" />
```

**3b.** Keyword gap element (line ~129): change `[result]` binding:
```
<app-keyword-gap
  [result]="recomputedKeywordGapResult()!"
  ...
/>
```
All other bindings on `app-keyword-gap` remain unchanged.

**3c.** Sidebar element (line ~29): change `[keywordScore]` binding:
```
[keywordScore]="liveKeywordScore()"
```

---

### Step 4 — Update `AtsScore` component

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.ts`

Add one new input after the existing `data` input:
```
readonly projectedScore = input<number | null>(null);
```

Add one new `computed` for the second ring's display object:
```
readonly secondRing = computed(() => {
  const ps = this.projectedScore();
  return ps !== null
    ? { label: 'Projected (estimate)', score: ps, isEstimate: true }
    : { label: 'After Fixes', score: this.data().predictedScoreAfterFixes, isEstimate: false };
});
```

No other changes to the class.

---

### Step 5 — Update `ats-score.html` template

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.html`

The rings section currently uses a `@for` over a literal array of two objects. Replace the literal array with a reference to `[{ label: 'Current ATS Score', score: data().overallScore }, secondRing()]` so the second ring is driven by the new computed:

```html
@for (ring of [{ label: 'Current ATS Score', score: data().overallScore, isEstimate: false }, secondRing()]; track ring.label) {
```

After the ring label `<span>`:
- When `ring.isEstimate` is true, add a `<p>` caption below the label:
```html
@if (ring.isEstimate) {
<p class="text-xs text-center text-surface-400 max-w-28 leading-snug">
  Based on applied changes — not a re-score
</p>
}
```

The SVG ring drawing itself (stroke, dashoffset, score text) is unchanged — it already takes `ring.score` and calls `strokeColor(ring.score)` / `strokeDashoffset(ring.score)`.

The ARIA label on the SVG updates automatically because it uses `ring.label + ': ' + ring.score`.

---

### Step 6 — Create `utils/recompute-scores.spec.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.spec.ts`

Use `vitest` (`describe`, `it`, `expect`). Import types from `@opticv/datatypes`. Follow the same pattern as `apply-selections.spec.ts`.

#### Test fixture helpers

Build minimal factory functions to construct `KeywordGapResult` and `ResumeAutopsyResult` fixtures inline (no shared mutable state).

#### `recomputeKeywordGapResult` test cases

| # | Description | Setup | Assertion |
|---|-------------|-------|-----------|
| 1 | No selections → score unchanged | `selectedKeywords = []` | `result.matchScore === original.matchScore` |
| 2 | One required keyword selected → `requiredMatched` increments | 1 required missing keyword selected | `result.matchScoreBreakdown.requiredMatched === original.requiredMatched + 1` |
| 3 | One preferred keyword selected → `preferredMatched` increments | 1 preferred missing keyword selected | `result.matchScoreBreakdown.preferredMatched === original.preferredMatched + 1` |
| 4 | Score never below original | Any selection | `result.matchScore >= original.matchScore` |
| 5 | Required count clamps at total | All required keywords selected when `requiredMatched === requiredTotal - 1`, then one more selected | `result.matchScoreBreakdown.requiredMatched === requiredTotal` |
| 6 | Back-solved `w` reproduces original at zero selections | Call with empty array after back-solving manually | `result.matchScore === original.matchScore` |
| 7 | Both totals zero → score unchanged | `requiredTotal = 0, preferredTotal = 0` | `result.matchScore === original.matchScore` |
| 8 | Keyword not in `missingKeywords` → no effect | `selectedKeywords = ['nonexistent']` | breakdown unchanged |

#### `recomputeAtsProjection` test cases

| # | Description | Setup | Assertion |
|---|-------------|-------|-----------|
| 1 | All selections empty → returns null | No selections | `result === null` |
| 2 | Keyword issue credited when keywords selected | 1 keyword selected, 1 `keywords` issue with `estimatedImpact = 5` | `result > original.overallScore` |
| 3 | Keyword issue not credited when no keywords selected | 0 keywords selected | no credit from `keywords` issues |
| 4 | `content` issue credited by bullet fraction | 1 of 2 upgradable bullets accepted | credit = `estimatedImpact * 0.5` |
| 5 | `content` issue credited by summary fraction (takes max) | summary selected, 0 bullets accepted | credit = `estimatedImpact * 1` |
| 6 | Result clamped to `predictedScoreAfterFixes` | Massive `estimatedImpact` values | `result <= original.predictedScoreAfterFixes` |
| 7 | Result clamped to `overallScore` from below | (should not happen with positive impacts, but guard) | `result >= original.overallScore` |
| 8 | Parsing/formatting/structure/length/contact issues → no credit | Issues only of those categories | `result === null` (no meaningful change) |
| 9 | Projection equals overallScore after computation → returns null | All issues are non-credited categories, 1 keyword selected | `result === null` |

---

## Verification checklist

- [ ] `npm exec nx test opticv-web` — all tests pass including new spec file
- [ ] `npm exec nx typecheck opticv-web` — no errors
- [ ] `npm exec nx lint opticv-web` — no warnings
- [ ] Manual: toggle keywords → keyword ring + caption + sidebar keyword score update
- [ ] Manual: accept bullet rewrite → ATS second ring shows "Projected (estimate)" with higher value
- [ ] Manual: select summary variant → ATS second ring rises
- [ ] Manual: "Current ATS Score" ring never changes
- [ ] Manual: clear all selections → both scores revert to originals; ATS ring shows "After Fixes"
- [ ] Manual: sidebar ATS ring always shows original `overallScore`
- [ ] Manual: no regressions in bullet rewriter, summary rewrite, cover letter, interview prep sections

---

## Files summary

| File | Action |
|------|--------|
| `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.ts` | **Create** |
| `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.spec.ts` | **Create** |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | **Edit** — add 3 computed signals + 2 imports |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | **Edit** — 3 binding changes |
| `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.ts` | **Edit** — add `projectedScore` input + `secondRing` computed |
| `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.html` | **Edit** — second ring reads from `secondRing()`; estimate caption |
