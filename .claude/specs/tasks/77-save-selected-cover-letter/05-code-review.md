# Code Review: Task 77 — Save the selected cover letter and the eventual edited version

## Summary

- Overall result: **PASS**
- The implementation follows the specification and implementation plan precisely, mirroring the existing summary/bullet persistence patterns with no backend or Prisma changes. The `hasAppliedInitialState` guard in `CoverLetterEditor`'s effect correctly restores saved state once per `result()` mount without re-clobbering user edits, and the parent's debounced persist/restore/reset wiring matches the analogous `SUMMARY_REWRITE` implementation line-for-line in structure. Test coverage is thorough and matches the acceptance criteria.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts:1153-1203` — `persistCoverLetterState()` is structurally identical (aside from field names) to `persistSummaryState()` (lines 1101-1151) and `persistBulletState()` (lines 1016-1099). This triplication was already present before this task (summary/bullet) and this change extends the same duplication rather than introducing new duplication, so it's consistent with existing conventions in this file — flagging only because a shared `persistUserState(resultIdSignal, promptType, buildState)` helper could remove ~45 lines across all three, but this is a pre-existing pattern choice, not a regression introduced by this task, so not blocking.
- `cover-letter-editor.spec.ts:234-246, 248-269` — the "falls back... when initialSelectedVariant does not match" and "only applies... on the first effect run" tests each construct a brand-new `TestBed.createComponent(CoverLetterEditor)` instance rather than exercising the guard on a single already-mounted instance across an unrelated re-render. This still validates the required behavior (matches spec edge cases), but the last test's second assertion (`fixture.componentRef.setInput('result', { ...MOCK_RESULT })`) works because `input()` uses reference equality — the effect only skips re-applying the restored variant because `hasAppliedInitialState` is already `true`, not because of no-op detection. The test is exercising the correct code path but the name "not on later result() changes" is slightly more specific than what's proven (a full effect re-run does happen on this new object reference; only the branch guarded by `hasAppliedInitialState` is skipped). Cosmetic naming precision only.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `CoverLetterUserState` type added to `@opticv/datatypes` | Covered | `datatypes.ts:500-503`, matches spec/plan exactly |
| `CoverLetterEditor`: `initialSelectedVariant`/`initialEditedContent` inputs | Covered | `cover-letter-editor.ts:40-41` |
| `CoverLetterEditor`: restore-once-then-don't-reclobber effect logic | Covered | `cover-letter-editor.ts:37, 58-86`, `hasAppliedInitialState` guard as specified |
| `CoverLetterEditor`: `variantSelected`/`contentEdited` outputs | Covered | `cover-letter-editor.ts:43-44, 103-112` |
| `CvOptimization`: `coverLetterResultId` signal | Covered | `cv-optimization.ts:218` |
| `CvOptimization`: dedicated `selectedCoverLetterVariant`/`editedCoverLetterContent` signals (plan deviates from spec's "prefer `UserSelections`" suggestion, justified in plan) | Covered | `cv-optimization.ts:219-222`; plan decision #2 explicitly documents rationale |
| `persistCoverLetterSubject` debounced 500ms wiring | Covered | `cv-optimization.ts:193, 432-434` |
| `onCoverLetterVariantSelected`/`onCoverLetterTextEdited` handlers | Covered | `cv-optimization.ts:788-796` |
| `persistCoverLetterState()` resolve-then-save, with on-demand result id lookup | Covered | `cv-optimization.ts:1153-1203` |
| `loadStoredOptimization()` `COVER_LETTER` branch with corrupt-JSON fallback | Covered | `cv-optimization.ts:623-638` |
| Template bindings for new inputs/outputs on `<app-cover-letter-editor>` | Covered | `cv-optimization.html:269-274` |
| Reset of `coverLetterResultId`/selection state in `runOptimization()` | Covered | `cv-optimization.ts:673-675` |
| No reset in `retryOptimization()` (matches summary/bullet convention) | Covered | Confirmed absent, consistent with plan decision #3 |
| No backend/Prisma changes | Covered | `git diff` confirms no changes under `apps/opticv-be/` |
| Unit tests for `CoverLetterEditor` restore/fallback/output-emission behavior | Covered | `cover-letter-editor.spec.ts:207-287` |
| Unit tests for `CvOptimization` persist/restore/reset/error-toast behavior | Covered | `cv-optimization.spec.ts:2092-2300` |

## Plan Deviations

None. All file changes match the implementation plan's specified locations, signatures, and logic exactly (verified via diff against plan pseudocode for `persistCoverLetterState()`, the `loadStoredOptimization()` branch, and the constructor `effect()`).

## Null Safety Issues

None. `initialSelectedVariant()`/`initialEditedContent()` are read via nullable-typed inputs and checked with explicit `!== null` guards before use (`cover-letter-editor.ts:64-65, 77-78`). `r.userEditedOutput != null` guard before `JSON.parse` (`cv-optimization.ts:625`) matches the existing summary/bullet pattern. `jobApplicationId === null` early-return guards `persistCoverLetterState()` (`cv-optimization.ts:1155`).

## Code Smells

- Minor duplication across `persistBulletState()`, `persistSummaryState()`, `persistCoverLetterState()` — see Non-Critical note above. Pre-existing pattern, not introduced by this task; out of scope per "minimal footprint" rule since refactoring would touch unrelated summary/bullet code paths not in this task's scope.
- No SRP violations, magic values, or new abstractions introduced beyond what the spec required.

## Recommendation

- **Merge as-is.**
