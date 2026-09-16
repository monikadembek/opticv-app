# Code Review: 106-job-title-match

Reviewed against `02-spec.md` and `04-implementation-plan.md`. Scope: all files touched by commits `7dcb16a` (backend) and `e6c6b37` (frontend). The unstaged, unrelated changes to `apps/opticv-be/src/app/quota/quota.service.ts` / `quota.service.spec.ts` currently sitting in the working tree are **not** part of this task's commits and are excluded from this review.

### Summary

- Overall result: **PASS**
- The implementation follows the plan closely: `jobTitle` is correctly threaded from `JobApplication` through the queue payload into the prompt's shared context (Phase 1), the shared types match the spec exactly (Phase 2), the seed prompt/schema changes are in place without an unnecessary version bump per the plan's resolved decision (Phase 3), and the frontend apply/recompute/UI/persistence wiring mirrors the existing keyword/acronym patterns throughout (Phases 4–7). Backend (45/45) and frontend (1187/1197, all 10 failures pre-existing/unrelated in `supabase.spec.ts`) tests pass, and `datatypes`/`opticv-be` build and typecheck cleanly.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts:21-42` — `applySelectionsToCV` now takes 16 positional parameters (2 of which are new: `selectedJobTitle`, `jobTitleEdit`). This continues a pre-existing pattern in the file rather than introducing a new problem, so not blocking, but worth flagging: the function is approaching the point where an options object would materially improve readability and call-site safety (tests already pass `new Map()` several times positionally to reach the job-title params). Out of scope for this task per "minimal footprint," but a good candidate for a follow-up refactor.
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts:264-266` — three separate signals (`activeJobTitleEditState`, `editedJobTitleText`, `jobTitleEdit`) mirror the existing keyword/acronym edit-state triplet pattern exactly, which is consistent with conventions, but note the naming is slightly inconsistent with the sibling groups (`activeKeywordEditKey`/`editedKeywordText`/`keywordEdits` vs. `activeJobTitleEditState`/`editedJobTitleText`/`jobTitleEdit`) — a single-title field doesn't need a "key", so this is a reasonable and intentional deviation, not a defect.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `KeywordGapJobTitleMatch` type + `jobTitleMatch` on `KeywordGapResult` | Covered | `datatypes.ts:343-350,359` matches spec shape exactly |
| Prompt change in `seed.ts` (schema + instructions) | Covered | `jobTitleMatch` added to `required`/`properties`; system+user prompt instructions added. Plan explicitly overrode the spec's "bump version" instruction after code inspection confirmed in-place edits are the existing convention — version intentionally not bumped |
| Pass `jobTitle` into prompt's shared context | Covered | Threaded through `OptimizationJobPayload` → service → processor → `PromptVariables` → `SHARED_CONTEXT` (`prompt.service.ts:30`) |
| UI title-match banner (candidate/target title, badge, reasoning) | Covered | `keyword-gap.html:67-168`, always renders when `jobTitleMatch` present, badge color-coded via `jobTitleBadgeClass` |
| "Use suggested title" button, shown only when `matchLevel !== 'exact'` and `suggestedTitle` present | Covered | `keyword-gap.html:79` guard matches spec section 4 exactly; verified via `keyword-gap.spec.ts` exact-match test |
| Banner absent when `jobTitleMatch` undefined | Covered | Outer `@if (result().jobTitleMatch; as titleMatch)` guard; test at `keyword-gap.spec.ts:651-653` |
| Apply logic sets `contact.position` | Covered | `apply-selections.ts:209-212`, guarded on `selectedJobTitle && suggestedTitle` present, no-op/no-throw otherwise |
| Persistence via `BulletUserState` (`selectedJobTitle`, `jobTitleEdit`) | Covered | Added to type (`datatypes.ts:592-593`), save path (`cv-optimization.ts:1333-1334`), restore path (`cv-optimization.ts:714-717`) |
| Score contribution folded into `matchScoreBreakdown.requiredMatched/requiredTotal` (AI-side) and client recompute | Covered | Prompt instructs AI (`seed.ts`); `recompute-scores.ts:34-43` credits one more `requiredMatched` client-side when applied and not already exact, clamped to `requiredTotal` |
| Edge case: `candidateTitle` null → banner shows `—` | Covered | `keyword-gap.html:146`; test at `keyword-gap.spec.ts:667-675` |
| Edge case: missing `jobTitleMatch` on older results → no crash, no banner | Covered | Optional chaining throughout (`result().jobTitleMatch?.…`); apply/recompute both guard on presence |
| Edge case: retry regenerates `jobTitleMatch`, prior selection not auto-cleared | Covered (by omission) | No new clearing logic added; consistent with existing keyword/acronym retry behavior — matches spec's explicit "out of scope to change" |
| Unit tests: `apply-selections.spec.ts`, `recompute-scores.spec.ts`, `keyword-gap.spec.ts`, `prompt.service.spec.ts` | Covered | All four files extended with job-title-specific cases per the plan's Phase 6.3/4.2/5.2/1.6 lists |
| AXE / WCAG AA — aria-labels on toggle/edit input | Covered | `aria-label="Use suggested title"`, `aria-label="Edit suggested title"`, `aria-label="Edit job title text"` present in `keyword-gap.html:87,105,124` |

### Plan Deviations

None. The two "critical issues" flagged in `03-spec-review.md` (jobTitle plumbing, matchScore computation) were resolved in the plan itself before implementation, and the implementation follows that resolution (no version bump on the seed entry; `jobTitle` threaded end-to-end).

### Null Safety Issues

None found. All new `jobTitleMatch` access sites use optional chaining (`result().jobTitleMatch?.matchLevel`, `keywordResult?.jobTitleMatch?.suggestedTitle`, `original.jobTitleMatch &&`), consistent with the spec's edge-case requirement to treat an absent field as a no-op rather than a non-null assertion.

### Code Smells

None beyond the pre-existing positional-parameter growth in `applySelectionsToCV` noted above (non-critical). No duplication, no magic values — match-level color mapping in `jobTitleBadgeClass` (`keyword-gap.ts:210-215`) reuses the same green/amber/red palette convention as the existing importance badges in the same template.

### Recommendation

- **Merge as-is**
