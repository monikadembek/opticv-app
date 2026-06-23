# Spec Review — Task 52: Update ATS score and Keywords score

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, comprehensive, and tightly scoped. It faithfully reflects all decisions recorded in the research document and contains no invented requirements. Two non-critical issues were identified: (1) a gap in the sidebar binding description — the spec says `liveKeywordScore` replaces `keywordScore` in the sidebar but `optim-sidebar.html` does NOT need changes (the update happens via the template rebinding in `cv-optimization.html`), which is internally consistent but phrased ambiguously; (2) the `content` issue credit formula references "totalUpgradableBullets" but does not define how that count is derived. Neither blocks implementation, but the content-credit formula needs clarification.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **`content` issue credit formula — "totalUpgradableBullets" undefined**
   Section: *Behavior → ATS Score → `recomputeAtsProjection` logic*
   The formula reads: `(acceptedBullets + addedMissingBullets) / max(totalUpgradableBullets, 1)`. The spec does not define what `totalUpgradableBullets` refers to. Is it `bulletUpgradeResult.positions.flatMap(p => p.bullets).length`? Is it only bullets with `rewrittenText`? Is it the total across all positions, or per-position? An implementer will have to guess. This should be pinned to a concrete derivation.

2. **Sidebar keyword score binding phrasing is ambiguous**
   Section: *Behavior → Keyword Score, step 4*
   The spec states "`liveKeywordScore` feeds the sidebar, replacing `keywordScore`." Combined with the Scope section which says "No changes to `OptimSidebar`", this implies the sidebar binding in `cv-optimization.html` changes from `[keywordScore]="keywordScore()"` to `[keywordScore]="liveKeywordScore()"`. However, the Critical Files table lists `cv-optimization.html` as needing a "sidebar `[keywordScore]`" rebinding, which confirms the intent. The phrasing is not wrong, but could be made explicit: "update the `[keywordScore]` binding in `cv-optimization.html` from `keywordScore()` to `liveKeywordScore()`".

3. **Tooltip vs. caption for "estimate" label is unresolved**
   Section: *Behavior → ATS Score, step 3*
   The spec says "a small caption or tooltip" without choosing one. This leaves a UI decision to the implementer. Since no UI mock-up exists, this is acceptable, but flagging it as a decision that should be made at implementation time.

4. **Summary variant credit: fraction "= 1" could conflict with partial logic**
   Section: *Behavior → ATS Score → `recomputeAtsProjection` logic*
   For `category === 'content'`, the spec says "Add summary credit when a summary variant is selected (fraction = 1 for summary credit)." It is unclear whether summary credit is added to the same fraction computation used for bullets, or is a separate addend. If the ATS issue `category === 'content'` can relate to either bullet rewrites OR summary, a single issue could be double-counted or incorrectly apportioned. The spec should clarify whether one `content` issue gets both bullet fraction and summary fraction, or whether they apply to separate issues.

---

### Unclear or Ambiguous Sections

- **`recomputeAtsProjection` function signature**: The spec names the parameters as `(autopsyResult(), mergedCv(), selections(), bulletUpgradeResult(), selectedMissingBullets())`. The `mergedCv` parameter is listed but the function body never uses it — the logic only uses `selections().selectedKeywords`, `selections().selectedSummaryAngle`, `bulletUpgradeResult`, and `selectedMissingBullets`. If `mergedCv` is not needed, it should be removed from the signature to keep the function pure and avoid confusion. If it is needed, the spec should describe how it is used.

- **Back-solving `w` — "stable denominator" threshold**: The spec says "avoid near-zero denominators" but does not define what threshold constitutes "near-zero". This is a minor implementation detail but worth noting so the implementer doesn't produce inconsistent behavior across edge cases.

---

### Invented or Unsupported Requirements

None. All requirements trace directly to the task description and the agreed decisions in `/docs/score-updating.md`.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | No backend calls or persistence are needed; all scores derive from existing in-memory signal state | Yes — stated in Goal, Scope/Out of scope, and Data/API |
| 2 | `KeywordGap` component needs no internal changes — feeding an updated `KeywordGapResult` object is sufficient to update the ring | Yes — explicitly stated in Scope/Out of scope and Critical Files |
| 3 | `OptimSidebar` internals need no changes — only the binding in `cv-optimization.html` changes | Yes — stated in Scope/Out of scope and Critical Files |
| 4 | Back-solving weight `w` from the original breakdown is numerically stable enough to produce trustworthy results for normal data | Yes — stated in Behavior and the research doc; fallback to 0.7 is provided |
| 5 | `estimatedImpact` is a numeric field on each `ResumeAutopsyIssue` and is present in the data even though the UI progress bar is currently commented out | Yes — explicitly called out in Edge Cases |
| 6 | `selectedKeywords` only contains keywords that appear in `missingKeywords` (not already-matched keywords) | Implicit — the `onKeywordToggled` handler only operates on missing keywords (sourced from `KeywordGap` which only renders `missingKeywords`), but the spec does not state this guard explicitly |
| 7 | Sidebar ATS score continues to display `overallScore` (the real value) and is never updated to show the projection | Yes — stated in Scope/Out of scope and Acceptance criteria |
| 8 | When `projectedAtsScore()` equals `overallScore` (e.g. zero credit accumulates), it is still treated as null for display purposes | Partially implicit — the spec says "if no selections are active… return null" but does not address the case where selections are active yet no credited issues exist, meaning the projection equals `overallScore` |

---

## Recommendation

**Revise specification** — address the two main gaps before implementation:

1. Define `totalUpgradableBullets` precisely (Critical Files item, `recomputeAtsProjection` logic).
2. Clarify whether summary credit and bullet credit within `category === 'content'` are applied to the same issue addend or separately.
3. Optionally remove `mergedCv` from the `recomputeAtsProjection` signature if it is not used, or document its use.
4. Explicitly state the guard that `selectedKeywords` only references keywords from `missingKeywords`.

These are all small clarifications, not structural changes. Revision effort is minimal.
