# Implementation Done

Task ID: 101-keyword-gap-acronym-issues

## Summary

The "Acronym issues" section of the Keyword Gap results was made actionable, mirroring the "Missing Keywords" select → edit → apply-to-CV flow. Each acronym issue can be selected via checkbox, edited inline, positioned (for experience-bullet placement), and applied to the optimized CV preview. Selections/edits/positions persist via `persistBulletState()` and rehydrate on reload. The implementation deviated from the spec/plan during a later revision (commit `c41df1e`): `actionType` was simplified from a two-value union (`'add' | 'replace'`) to a single fixed value (`'replace'`), and all "add as new term" logic was removed — only "replace existing term" is supported.

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| 1. `seed.ts` — add `acronymIssues` to top-level `required` | Implemented | |
| 1. `seed.ts` — `acronymIssues.items` gains `actionType` property | Implemented with deviation | `enum: ['replace']` only, not `['add', 'replace']` |
| 1. `seed.ts` — `acronymIssues.items` gains `suggestedPlacement` property | Implemented | Same enum as `missingKeywords[].suggestedPlacement` |
| 1. `seed.ts` — `items.required` updated to include `actionType`, `suggestedPlacement` | Implemented | |
| 2. Shared types — `KeywordGapAcronymIssue` extended | Implemented with deviation | `actionType?: 'replace'` (optional, single value) and `suggestedPlacement?` (optional), not the required `'add' \| 'replace'` union specified |
| 2. Shared types — `UserSelections.selectedAcronymIssues` | Implemented | `string[]`, non-optional |
| 2. Shared types — `BulletUserState` acronym fields | Implemented | `acronymEdits?`, `acronymBulletPositions?`, `selectedAcronymIssues?` all present |
| 3. `keyword-gap.ts`/`.html` — new inputs | Implemented | All five inputs present |
| 3. `keyword-gap.ts`/`.html` — new outputs | Implemented | All six outputs present |
| 3. `keyword-gap.ts` — new helper methods | Implemented with deviation | Method named `getAcronymDisplayFixedText` instead of planned `getAcronymDisplayText` |
| 3. Template — interactive `<li>` replacing read-only block | Implemented | Checkbox, badges, Edit/Save/Cancel, position `<select>` present |
| 3. Template — non-actionable fallback for historical rows without `actionType` | Implemented | Confirmed via dedicated spec test |
| 3. Keep expand/collapse toggle unchanged | Not implemented as specified | Collapse/expand toggle was removed entirely for this section (separate commit `ff340c5`); section is now always expanded |
| 4. `cv-optimization.ts` — new signals | Implemented | `acronymEdits`, `activeAcronymEditKey`, `editedAcronymText`, `acronymBulletPositions` |
| 4. `selections` signal extended with `selectedAcronymIssues: []` | Implemented | |
| 4. New handlers (toggle/edit start/change/cancel/save/position) | Implemented | All six handlers present |
| 4. Wired into `cv-optimization.html` bindings | Implemented | All 5 inputs + 6 outputs bound |
| 4. `mergedCv` computed passes new state to `applySelectionsToCV()` | Implemented | |
| 4. `persistBulletState()` serializes acronym state | Implemented | |
| 4. Load/rehydration restores acronym state | Implemented | |
| 4. Reset points updated | Implemented | `runOptimization()` resets all four acronym signals + selection |
| 5. `apply-selections.ts` — new params `acronymEdits`, `acronymBulletPositions` | Implemented | Appended as final two parameters |
| 5. `apply-selections.ts` — `actionType: 'add'` branch (skills/experience_bullet) | Not implemented | Removed by design change in `c41df1e`; only `'replace'` is handled |
| 5. `apply-selections.ts` — `actionType: 'replace'` branch (skills/experience_bullet/summary/title/multiple) | Implemented | `'title'` and `'multiple'` share the same broad-replace fallback branch, per spec Assumptions |
| Edge case — no match found leaves CV unchanged | Implemented | Covered by test `'replace' + no match found` |
| Edge case — historical rows without `actionType` render read-only | Implemented | Covered by component test |
| Edge case — empty edited text ignored on save | Implemented | |
| Unit tests — `applySelectionsToCV()` add/replace across placements | Implemented with deviation | Only `'replace'` scenarios tested (no `'add'` scenarios, consistent with removed `'add'` logic) |
| Unit tests — `keyword-gap.ts` component interactions | Implemented | Toggle, edit start/save/cancel, position selection, display-text fallback, non-actionable fallback all covered |
| Build/typecheck/lint acceptance criteria | Not verified in this step | Out of scope for this documentation step; not independently re-run |

## Files

### Modified

- `apps/opticv-be/prisma/seed.ts`
- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.spec.ts`
- `docs/keyword-gap-research.md`

### Created

None (no new files, matching plan's "No new files" note).

## Components

| Component | Status |
|---|---|
| `KeywordGap` (`keyword-gap.ts`) | Exist |
| `CvOptimization` (`cv-optimization.ts`) | Exist |
| `OptimSidebar` (`optim-sidebar.ts`) | Exist (touched incidentally by out-of-scope rename commit) |

## Stores

Not applicable — this task uses component signals, not an NgRx Signals store. No store files were part of the plan or the changed file set.

## Deviations

- `KeywordGapAcronymIssue.actionType` type is `'replace'` only (single-value union), not the spec's `'add' | 'replace'`.
- `KeywordGapAcronymIssue.actionType` and `suggestedPlacement` are optional (`actionType?`, `suggestedPlacement?`), matching the plan's optionality choice for backward compatibility with historical rows.
- Seed schema `actionType` enum is `['replace']`, not `['add', 'replace']`; description text changed accordingly to `'Always "replace" — the fix text replaces the existing term in place'`.
- All "add as new term" logic (skills/experience_bullet insertion for acronym issues) specified in spec §5 was removed from `applySelectionsToCV()`; only the `'replace'` branch remains.
- `keyword-gap.ts` method is named `getAcronymDisplayFixedText`, not the plan's `getAcronymDisplayText`.
- The "Acronym issues" section's expand/collapse toggle (`isAcronymIssuesExpanded`/`toggleAcronymIssues()`), which the spec/plan said to leave unchanged, was removed in a later commit (`ff340c5`); the section is now always expanded.
- Test coverage for `applySelectionsToCV()` includes only `'replace'`-action scenarios (skills, experience_bullet, summary, multiple, no-match, edit override, historical no-actionType skip); no `'add'`-action test cases exist, consistent with the removed `'add'` logic.

## Additional Implementation

- `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts`, its spec file, and `cv-optimization.html` were changed in commit `4f2af14` ("Replace Keywords Gap with Keywords") to rename a UI label from "Keywords Gap" to "Keywords". This is unrelated to the acronym-issues feature and not covered by the specification or implementation plan.
- `docs/keyword-gap-research.md` and `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.spec.ts` were modified in the commit range but are not referenced by the specification or implementation plan.
