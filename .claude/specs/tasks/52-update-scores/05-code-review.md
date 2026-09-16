# Code Review — Task 52: Update ATS score and Keywords score

## Summary

- **Overall result: PASS WITH ISSUES**
- The core logic is correctly implemented and all 780 tests pass. The util functions (`recomputeKeywordGapResult`, `recomputeAtsProjection`) match the plan exactly. Two deviations from the spec/plan exist: the sidebar receives `projectedAtsScore()` instead of the original `atsScore()` (an explicit out-of-scope item in the spec), and the projected score label reads `"Estimated score"` instead of `"Projected (estimate)"` as specified. Neither breaks functionality, but the sidebar deviation contradicts the spec.

---

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. **`ats-score.ts` line 54 — label mismatch vs. spec**
   The spec (§ Behavior, ATS Score, point 3) and implementation plan (Step 4) both specify the label `'Projected (estimate)'`. The implementation uses `'Estimated score'`. The label is also used as the ARIA label on the ring (`ring.label + ': ' + ring.score`), so changing it updates accessibility text automatically.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| New util file `utils/recompute-scores.ts` with `recomputeKeywordGapResult` and `recomputeAtsProjection` | Covered | Functions match spec logic |
| `recomputedKeywordGapResult` computed signal | Covered | `cv-optimization.ts:292` |
| `liveKeywordScore` computed signal | Covered | `cv-optimization.ts:300` |
| `projectedAtsScore` computed signal | Covered | `cv-optimization.ts:304` |
| Template: keyword-gap `[result]` rebound to `recomputedKeywordGapResult()!` | Covered | `cv-optimization.html:132` |
| Template: ats-score receives `[projectedScore]` | Covered | `cv-optimization.html:106` |
| Template: sidebar `[keywordScore]` rebound to `liveKeywordScore()` | Covered | `cv-optimization.html:29` |
| Sidebar `[atsScore]` stays on original `atsScore()` (out of scope) | **Missing** | Sidebar receives `projectedAtsScore()` instead — `cv-optimization.html:28`. Spec explicitly excluded sidebar ATS score from change. |
| `projectedScore = input<number \| null>(null)` on `AtsScore` | Covered | `ats-score.ts:47` |
| `secondRing` computed on `AtsScore` | Covered | `ats-score.ts:51` |
| Second ring label `"Projected (estimate)"` when estimate | Partial | Label is `"Estimated score"` — `ats-score.ts:54` |
| Caption `"Based on applied changes — not a re-score"` below estimate ring | Partial | Caption text reads `"Based on applied changes"` (truncated vs. spec) — `ats-score.html:48` |
| First ring always shows `data().overallScore` | Covered | `ats-score.html:4` |
| Unit tests for both util functions | Covered | `recompute-scores.spec.ts` — all 8+9 plan cases present |
| `recomputeKeywordGapResult` null-guard when `keywordGapResult()` is null | Covered | `cv-optimization.ts:294` |
| `projectedAtsScore` null-guard when `autopsyResult()` is null | Covered | `cv-optimization.ts:305` |
| No changes to `KeywordGap` component internals | Covered | Verified |
| No backend changes | Covered | Verified |

---

## Plan Deviations

1. **Sidebar ATS score input (`cv-optimization.html:28`)**
   The spec says sidebar ATS score must remain unchanged (out of scope). The implementation passes `[atsScore]="projectedAtsScore()"` to `<app-optim-sidebar>` — meaning the sidebar ring now shows the projected score, not the original `overallScore`. This contradicts the spec's acceptance criterion: *"Sidebar ATS score shows original `overallScore` at all times."*
   **Fix:** Change line 28 from `[atsScore]="projectedAtsScore()"` to `[atsScore]="atsScore()"`.

2. **Second ring label — `ats-score.ts:54`**
   Plan Step 4 specifies `label: 'Projected (estimate)'`. Implementation uses `'Estimated score'`. Minor wording deviation; ARIA label inherits it.

3. **Estimate caption text — `ats-score.html:48`**
   Plan Step 5 specifies `"Based on applied changes — not a re-score"`. Implementation uses `"Based on applied changes"` (drops `"— not a re-score"`). Minor omission.

4. **`ats-score.ts` has an unused `signal` import (`import { ..., signal } from '@angular/core'`)**
   `signal` is imported but `expandedIssueIds` and `collapsedGroups` use it correctly — not actually unused. Disregard.

---

## Null Safety Issues

None. All nullable signals are guarded before use:
- `recomputedKeywordGapResult` checks `if (!r) return null` before calling the util.
- `projectedAtsScore` checks `if (!autopsy) return null`.
- Template uses `recomputedKeywordGapResult()!` inside `@if (keywordGapResult())`, which is safe since the computed always returns a non-null value when `keywordGapResult()` is non-null.
- `autopsyResult()!` in the template is wrapped in `@if (autopsyResult())`.

---

## Code Smells

1. **Test case 6 in `recompute-scores.spec.ts` (`recomputeKeywordGapResult`) is redundant with test case 1.**
   Case 6 ("back-solved `w` reproduces original matchScore at zero selections") is described as testing that the back-solved weight reproduces the original score when called with an empty array — but the implementation returns a clone immediately when `selectedKeywords.length === 0` (line 14 in `recompute-scores.ts`) before `w` is even computed. The test passes trivially and does not actually test back-solving. It is identical in effect to case 1. Low priority — the function is still correct, but the test intent is misleading.

---

## Recommendation

**Fix critical issues before merge.**

The sidebar deviation (plan deviation #1) is a direct contradiction of the spec's acceptance criterion and out-of-scope boundary. It is a one-line fix: change `[atsScore]="projectedAtsScore()"` to `[atsScore]="atsScore()"` on line 28 of `cv-optimization.html`. The label wording changes (deviations #2 and #3) are optional to align with the spec but do not break functionality.
