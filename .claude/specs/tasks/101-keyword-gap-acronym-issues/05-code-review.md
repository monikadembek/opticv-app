# Code Review — Task 101: Keyword Gap Acronym Issues

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation delivers a working, tested "Acronym issues" actionable flow (select → edit → position → apply-to-CV) that mirrors the Missing Keywords pattern, and all touched unit tests pass (1137/1137). However, the final commit (`c41df1e`) intentionally narrowed scope from the spec by removing `actionType: 'add'` entirely, which is an undocumented deviation from `02-spec.md`/`04-implementation-plan.md` that was never reflected back into those spec documents. There is also one confirmed behavioral deviation from the spec's Edge Cases section (silent fallback-to-append on `experience_bullet` replace when no match is found).

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. **Method naming inconsistency** — `keyword-gap.ts:147` (`getAcronymDisplayFixedText`) does not follow the plan's specified name `getAcronymDisplayText` (see `04-implementation-plan.md` Step 4 §3) or the parallel naming convention of the sibling method `getKeywordDisplayText` (`keyword-gap.ts:118`). Purely cosmetic, but breaks the "mirror the existing pattern" convention the whole task is built on.
2. **`apply-selections.ts:134-145`** (`placement === 'skills'` replace branch) — uses `findIndex` + `.includes(term)` (substring match) while the plan (Step 3 §2, `'replace'` → `'skills'`) specified an exact case-insensitive equality match ("find the skill entry that equals `entry.term` case-insensitively"). The implemented substring-based approach is actually reasonable and is covered by a dedicated test (`apply-selections.spec.ts` "replaces a skill entry containing the term as a substring"), but it's an undocumented divergence from the written plan.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `seed.ts`: add `acronymIssues` to top-level `required` | Covered | `seed.ts` diff confirms. |
| `seed.ts`: `actionType` + `suggestedPlacement` added to `acronymIssues.items` | Partial | Implemented, but `actionType` enum is `['replace']` only, not `['add', 'replace']` as spec §Scope Item 1 required. This is a deliberate scope-narrowing from commit `c41df1e`, not an oversight, but the spec document itself was not updated to reflect it. |
| Shared types: `KeywordGapAcronymIssue.actionType`/`suggestedPlacement` | Partial | Present, but typed as `actionType?: 'replace'` instead of `'add' \| 'replace'` per spec. |
| Shared types: `UserSelections.selectedAcronymIssues` | Covered | `datatypes.ts:557`. |
| Shared types: `BulletUserState` acronym fields | Covered | `datatypes.ts:578-580`. |
| `keyword-gap.ts`/`.html`: full Missing-Keywords-parity interaction (checkbox, edit, badges, position picker) | Covered | Present in both files; historical/non-actionable fallback (`@if (item.actionType)` / `@else`) implemented per Edge Cases. |
| `keyword-gap.ts`/`.html`: keep expand/collapse toggle unchanged | **Deviated** (documented, see Plan Deviations) | Toggle was removed in commit `ff340c5`; section is now always expanded. Spec explicitly said "Keep the existing expand/collapse toggle ... unchanged." |
| `cv-optimization.ts`: new signals, handlers, `mergedCv` wiring | Covered | Matches plan almost line-for-line. |
| `cv-optimization.ts`: persistence + rehydration of acronym state | Covered | `persistBulletState()` and load branch both updated symmetrically. |
| `cv-optimization.ts`: reset points updated | Covered | `runOptimization()` reset block includes all four new signals. |
| `apply-selections.ts`: `actionType: 'add'` handling | **Missing** | Entire `'add'` branch removed in `c41df1e`; function only branches on `'replace'` now (any entry with `actionType !== 'replace'`... actually only checks `!entry?.actionType`, see Null Safety Issues). |
| `apply-selections.ts`: `'replace'` across `skills`/`experience_bullet`/`summary`/`multiple`/`title` | Covered | All branches present and unit-tested. |
| `apply-selections.ts` Edge Case: no fallback-append when `replace` term not found | **Fixed** | `experience_bullet` branch no longer appends a new bullet when no match is found — now no-ops, matching the `skills` branch and the spec's Edge Cases. Corresponding test updated to assert bullets are left unchanged. |
| Unit tests for `applySelectionsToCV()` add/replace × placements + no-match case | Partial | `'add'` tests don't exist (feature removed); `'replace'` tests are comprehensive, including the now-corrected no-match no-op case for `experience_bullet`. |
| Unit tests for `keyword-gap.ts` toggle/edit/position | Covered | `keyword-gap.spec.ts` "acronym issues interactions" describe block. |
| No breaking changes to Missing Keywords / Underweighted / Fabrication Warnings | Covered | Diffs show no changes to those sections' logic; `keyword-gap.spec.ts` still passes for those sections. |

## Plan Deviations

1. **`actionType: 'add'` removed entirely** (commit `c41df1e`, "Simplify acronym issues actions... remove logic related to actionType 'add'"). Spec §Scope Item 1 required the enum `['add', 'replace']`; the shipped `seed.ts`, `datatypes.ts`, and `apply-selections.ts` only support `'replace'`. This is a legitimate product-scope decision made mid-implementation, but neither `02-spec.md` nor `04-implementation-plan.md` was updated to reflect it — reviewers/future readers of the spec will see a doc that no longer matches the code.
2. **Expand/collapse toggle removed** (commit `ff340c5`, "Remove collapse/expand toggle button from acronym issues section making it always expanded"). Spec §Scope Item 3 explicitly said to keep `isAcronymIssuesExpanded`/`toggleAcronymIssues` unchanged; the toggle button and the `@if (isAcronymIssuesExpanded())` gating were removed from `keyword-gap.html`, and the `keyword-gap.spec.ts` test "expands acronym issues panel on toggle" was deleted rather than updated. `isAcronymIssuesExpanded`/`toggleAcronymIssues` were also fully removed from `keyword-gap.ts` — verified no dead code remains from this removal.
3. ~~**`experience_bullet` replace fallback-to-append**~~ — **Fixed**: the append-on-no-match branch was removed from `apply-selections.ts`; `experience_bullet` now no-ops when `entry.term` isn't found in the bullet at the chosen position, consistent with the `skills` branch and the spec's Edge Cases. Test updated accordingly.
4. **`getAcronymDisplayText` renamed to `getAcronymDisplayFixedText`** without a corresponding note in the plan (see Non-Critical above).

## Null Safety Issues

None. All new Map/optional-field accesses (`acronymEdits().get(term)`, `entry?.actionType`, `acronymBulletPositions.get(term)`) use `??`/optional chaining consistent with the rest of the codebase; bounds checks on `experienceIndex` are present in `apply-selections.ts:148-150`.

## Code Smells

1. **`seed.ts` enum `['replace']`** (a single-value string enum): if `actionType` can now only ever be `'replace'`, consider whether the field carries its intended value at all, or whether this is a placeholder for a still-desired future `'add'` re-introduction — worth a one-line comment or a spec update to make the intent explicit either way.

## Recommendation

- Fix critical issues before merge — no criticals found, code is mergeable as-is functionally.
- **Strongly recommended before merge (non-blocking but should not be skipped)**: reconcile `02-spec.md`/`04-implementation-plan.md` with the actual shipped scope (drop `'add'`, drop the toggle-removal note) so the spec remains a truthful record.
