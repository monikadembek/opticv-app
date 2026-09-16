# Implementation Done: 106-job-title-match

Source commits: `7dcb16a` (backend), `e6c6b37` (frontend).

## Summary

Job title matching was added to the existing Keyword Gap analysis. The `KEYWORD_GAP` prompt now receives the job posting's `jobTitle` (threaded through the optimization job payload, service, and processor into the prompt's shared context) and returns an additional `jobTitleMatch` object alongside its existing output. The frontend renders this as a banner in the Keyword Gap card showing the candidate's current title vs. the target title, a color-coded match-level badge, the AI's reasoning, and — when the match is not exact — a "Use suggested title" toggle with an inline edit affordance. Applying the suggestion updates `contact.position` in the exported/merged CV and is persisted alongside other keyword/acronym edits in the existing `BulletUserState` payload. The client-side score recompute credits the title match as one additional required-signal match, consistent with how accepting a missing keyword is credited today.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| New shared type `KeywordGapJobTitleMatch` and `jobTitleMatch` field on `KeywordGapResult` | Implemented | `packages/shared/datatypes/src/lib/datatypes.ts` |
| Prompt change in `seed.ts`: `jobTitleMatch` added to `outputSchema` (required + properties) | Implemented | Version not bumped — in-place edit, per plan's resolution of spec-review issue |
| Pass job's `jobTitle` into prompt's shared context | Implemented | `OptimizationJobPayload` → `optimization.service.ts` → `optimization.processor.ts` → `PromptVariables`/`SharedPromptVariables` → `SHARED_CONTEXT` |
| UI: title-match banner in `keyword-gap.html` (candidate title → target title, badge, reasoning) | Implemented | Rendered under score ring, above missing-keywords list |
| "Use suggested title" button shown when `suggestedTitle` present and `matchLevel !== 'exact'` | Implemented | |
| Apply logic: sets `contact.position` to `suggestedTitle` (or edited text) in `applySelectionsToCV` | Implemented | `apps/opticv-web/.../utils/apply-selections.ts` |
| Persistence: title selection + edited text persisted in `BulletUserState` | Implemented | `selectedJobTitle`, `jobTitleEdit` fields added to type, save path, and restore path |
| Score contribution: AI folds title match into `matchScoreBreakdown`; client recompute credits applied selection | Implemented | Prompt instructions updated; `recomputeKeywordGapResult` extended with `selectedJobTitle` param |
| Out of scope: `experience[0].title` not changed | Implemented (respected) | Only `contact.position` is set |
| Out of scope: no new AI call/endpoint | Implemented (respected) | Reuses existing `KEYWORD_GAP` job/response |
| Out of scope: `JobApplication.jobTitle` not editable via this feature | Implemented (respected) | No new endpoint/mutation added |
| Out of scope: no backfill of `jobTitleMatch` on older stored results | Implemented (respected) | Field is optional; UI guards on absence |
| Edge case: `candidateTitle` null → banner shows `—` | Implemented | |
| Edge case: `jobTitleMatch` missing entirely → no banner, no crash | Implemented | Optional chaining throughout |
| Edge case: `matchLevel === 'exact'` → no apply button | Implemented | |
| Edge case: retry regenerates `jobTitleMatch`, prior selection not auto-cleared | Implemented (by omission — no new clearing logic added) | |
| Edge case: `targetTitle`/`jobTitle` null → AI instructed not to fabricate | Implemented | Prompt instruction added in `seed.ts` system prompt |
| Unit tests: `apply-selections.spec.ts` | Implemented | Covers applying suggested title with/without edit |
| Unit tests: `recompute-scores.spec.ts` | Implemented | Covers score recompute crediting applied title match |
| Unit tests: `keyword-gap.spec.ts` | Implemented | Covers banner rendering per `matchLevel`, absence case, apply/edit flow |
| Unit tests: `prompt.service.spec.ts` | Implemented | Covers `jobTitle` interpolation into shared context |
| Unit tests: `optimization.service.spec.ts` / `optimization.processor.spec.ts` updates | Implemented | Payload assertions and prompt-build assertions extended with `jobTitle` |

## Files

### Created

None. All changes extend existing files, per the implementation plan.

### Modified

**Backend:**
- `apps/opticv-be/src/app/optimization/optimization.types.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`
- `apps/opticv-be/src/app/optimization/optimization.processor.ts`
- `apps/opticv-be/src/app/optimization/optimization.processor.spec.ts`
- `apps/opticv-be/src/app/ai/types/prompt.types.ts`
- `apps/opticv-be/src/app/ai/services/prompt.service.ts`
- `apps/opticv-be/src/app/ai/services/prompt.service.spec.ts`
- `apps/opticv-be/prisma/seed.ts`

**Shared types:**
- `packages/shared/datatypes/src/lib/datatypes.ts`

**Frontend:**
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`

**Other:**
- `docs/tasks-list.md`

## Components

| Component (per plan) | Status |
| --- | --- |
| `KeywordGap` (`keyword-gap.ts`/`.html`) — new inputs/outputs/methods for job title match | Exist |
| `CvOptimization` (`cv-optimization.ts`/`.html`) — new signals, handlers, wiring | Exist |

## Stores

Not applicable — this task does not introduce or modify any NgRx Signals store; state is held in component-level signals on `CvOptimization`, consistent with the plan.

## Deviations

- Per the implementation plan's Phase 1 resolution of a critical issue raised in `03-spec-review.md`, the `KEYWORD_GAP` prompt version in `apps/opticv-be/prisma/seed.ts` was **not** bumped (spec suggested bumping to `'1.1.0'`); the existing seed entry was edited in place, consistent with the in-place-edit convention the plan cites from prior tasks (Task 101, Task 61).
- The spec's Data/API section describes the apply logic as `clone.contact.position = jobTitleEdit ?? keywordResult.jobTitleMatch.suggestedTitle`; the implemented guard in `apply-selections.ts` additionally checks `selectedJobTitle && keywordResult?.jobTitleMatch?.suggestedTitle` truthiness before assignment (optional chaining throughout), matching the plan's explicit no-op/no-throw requirement for absent `jobTitleMatch`.

## Additional Implementation

None.
