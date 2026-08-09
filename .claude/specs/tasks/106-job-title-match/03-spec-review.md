# Specification Review: 106-job-title-match

## Summary

- Overall assessment: **PASS WITH ISSUES**
- The spec is well-grounded in the existing keyword-gap architecture and correctly enumerates the frontend/type/persistence changes needed, but it rests on one factually incorrect premise inherited from the raw task — that `jobTitle` is "already received" by the `KEYWORD_GAP` job via `SHARED_CONTEXT` — when in fact `jobTitle` does not flow through `OptimizationJobPayload`, `optimization.service.ts`, or `PromptVariables` at all today. This is flagged in the spec's Data/API section only as a soft "confirm ... or add if missing" aside, which understates a required, multi-file backend wiring change (job payload, service query, processor, prompt variables). One clarified decision (score integration via `requiredMatched`/`requiredTotal`) is also non-trivial to implement given the score is currently returned as a flat number rather than derived by the backend from the breakdown, and the spec doesn't clarify who computes `matchScore` from the new breakdown value.

## Findings

### Critical Issues

1. **Incorrect/understated premise: `jobTitle` is not currently available to the `KEYWORD_GAP` prompt.** The raw task states: "The KEYWORD_GAP AI job already receives both texts: the CV's contact.position ... and the job posting's jobTitle/jobDescription, via the seeded prompt ... and PromptService's SHARED_CONTEXT." This is false for `jobTitle`:
   - `OptimizationJobPayload` (`optimization.types.ts`) has no `jobTitle` field — only `jobDescription`.
   - `optimization.service.ts`'s `loadAndValidateApplication` selects/returns only `cvText`, `parsedSections`, `jobDescription` — not `jobTitle` — and all three call sites (`runAllPrompts`, `runSinglePrompt`, `retryPrompt`) build `OptimizationJobPayload` without it.
   - `optimization.processor.ts` hardcodes `targetRole: ''` (line 61) — the one `SharedPromptVariables` field that could have carried a role/title is always empty, not populated from `JobApplication.jobTitle`.
   - `PromptVariables`/`SharedPromptVariables` (`prompt.types.ts`) has no `jobTitle` key; `SHARED_CONTEXT` in `prompt.service.ts` interpolates `{{targetRole}}`, not `{{jobTitle}}`.
   The spec's Data/API section (item "PromptService / SHARED_CONTEXT") does surface this as a to-do ("Confirm the caller ... already passes jobTitle ... or add it if missing"), but frames it as a minor confirmation step rather than what it actually is: a required change touching `OptimizationJobPayload`, the Prisma select in `loadAndValidateApplication`, all three job-enqueue call sites in `optimization.service.ts`, `optimization.processor.ts`, and `PromptVariables`/`SharedPromptVariables`. This should be promoted to an explicit, itemized in-scope change, not a parenthetical caveat, since it's on the critical path for the entire feature (without it, the model has no `jobTitle` to compare against).

2. **Score-computation ownership is ambiguous.** The spec says (Behavior #3) "the model ... folds the title match into `matchScoreBreakdown`" and separately (Data/API) says `matchScore` "is computed the same way it already is today." But today `matchScore` is a value the AI model returns directly in its JSON output (per `seed.ts`'s existing `outputSchema`, `matchScore` is a required top-level integer field the model fills in, not something computed from `matchScoreBreakdown` server- or client-side for the initial result). The spec doesn't clarify whether the *prompt instructions* simply tell the model to factor the title match into the `matchScore` it already produces (likely correct, but not stated), or whether new code should derive `matchScore` from the breakdown (a bigger, unstated change). This ambiguity should be resolved before implementation — likely resolved by adding a prompt instruction sentence, not code, but the spec should say so explicitly.

### Non-Critical Issues

1. **`UserSelections.selectedJobTitle: boolean` vs. `BulletUserState.selectedJobTitle?: boolean` naming collision risk.** Both are named identically but live in different types with different optionality (required boolean vs. optional boolean). Not a defect, but worth a one-line note in the spec that `UserSelections` (in-memory/runtime) defaults `selectedJobTitle` to `false` while `BulletUserState` (persisted payload) treats it as optional/absent = not applied, mirroring how `selectedKeywords`/`selectedKeywords?` already differ between the two types — this precedent exists in the codebase but isn't called out, which could cause an implementer to over- or under-think the type shape.

2. **Prompt version bump / deactivation mechanics not verified.** The spec says "Bump `version` ..., keep `isActive: true` (deactivate the prior version per existing seeding convention — confirm seeding script behavior for version activation is unchanged)." This hedges on an assumption about how `seed.ts` handles multiple versions/`isActive` uniqueness (e.g., whether it's an upsert keyed on `promptType`+`version`, whether old versions are explicitly set `isActive: false`, or whether `getActivePrompt`'s `findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })` tolerates multiple active rows by just taking the newest). This should be resolved by reading `seed.ts`'s upsert/write logic and the Prisma schema's uniqueness constraints before implementation, not left as a runtime "confirm."

3. **No mention of `optimization.processor.spec.ts` / `optimization.service.spec.ts` updates.** Given Critical Issue #1 requires changes to `OptimizationJobPayload`, `optimization.service.ts`, and `optimization.processor.ts`, the Acceptance section's test list should include updates to `optimization.service.spec.ts` and `optimization.processor.spec.ts` (both already assert on payload shape per the grep results, e.g. `expect.objectContaining({ promptType, jobApplicationId: 'app-1' })`), not just `prompt.service.spec.ts`.

### Unclear or Ambiguous Sections

- **Behavior #3 / Data-API "PromptService / SHARED_CONTEXT" section**: as detailed in Critical Issue #1, it's unclear whether this is a "confirm nothing needed" check or a mandatory multi-file plumbing change. Given the code evidence, it is mandatory — the spec should say so plainly rather than hedging with "Confirm ... or add if missing."
- **Behavior #3, "matchScore is computed the same way it already is today"**: unclear whether this means "the model still emits a flat `matchScore` number, just now informed by one more required-item comparison" (no code change) or implies a code-side derivation. See Critical Issue #2.
- **Data/API, `apply-selections.ts` line**: `clone.contact.position = jobTitleEdit ?? keywordResult.jobTitleMatch.suggestedTitle` — this reads as pseudocode rather than a spec statement; it doesn't address the case where `keywordResult.jobTitleMatch` itself is `undefined` (older results) while `selectedJobTitle` is somehow `true` (stale persisted state referencing a since-regenerated/older result). Worth one sentence: if `jobTitleMatch` is absent, the title selection is a no-op in `applySelectionsToCV`, consistent with the UI not rendering the button in that case.

### Invented or Unsupported Requirements

None. All in-scope items trace back to the five numbered points in the raw task (type field, prompt change, UI banner, "Use suggested title" apply action reusing the keywordEdits/apply-selections pattern, score contribution). The persistence requirement (BulletUserState-style) and the "one more required item" score-integration approach were both explicitly resolved via clarifying questions during spec authoring (per the spec's own framing and the answered-questions context), not invented unilaterally.

## Assumptions Detected

Explicitly stated in the spec:
- "Use suggested title" updates `contact.position` only, not `experience[0].title` (stated as a clarification-derived decision in Out of Scope).
- Title match folds into `requiredMatched`/`requiredTotal` as one more required item, no new breakdown field (stated as a clarification-derived decision in Behavior #3 / Data-API).
- Title selection is persisted like `keywordEdits`/`selectedKeywords` (stated as a clarification-derived decision in Behavior #7).
- Older stored `KeywordGapResult` records won't have `jobTitleMatch` and this is handled as an absent/optional case, not backfilled (stated in Out of Scope and Edge Cases).

Implicit/unstated assumptions found during this review, not flagged as assumptions in the spec itself:
- That `jobTitle` can be threaded through `OptimizationJobPayload` → `optimization.processor.ts` → `PromptVariables` without other side effects on the four other prompt types (`RESUME_AUTOPSY`, `SUMMARY_REWRITE`, `BULLET_UPGRADE`, plus cover-letter/interview-prep/linkedin) that share the same `OptimizationJobPayload`/`SharedPromptVariables` shape and processor code path. Adding a field to a shared payload/variables type is low-risk but should be called out as touching shared infrastructure, not just the `KEYWORD_GAP` prompt.
- That `seed.ts`'s existing version-bump pattern (used previously per the git history context, e.g. "Task 105" prompt hardening commits) is a known, safe, repeatable operation — the spec assumes this convention exists and works but doesn't cite a prior example from the codebase to confirm the exact mechanics (upsert key, deactivation of old versions).
- That `matchScoreBreakdown.requiredTotal` incrementing by exactly 1 for the title check (Behavior #3) won't produce a confusing UI where "Required: 5/6" suddenly appears where "Required: 5/5" was expected on already-generated older results without `jobTitleMatch` (mitigated since those results simply won't have the extra count, per Edge Cases, but worth confirming the UI's "Required X/Y" label reads sensibly when the +1 is a title check rather than a keyword).

## Recommendation

- **Revise specification** — specifically: (1) promote the `jobTitle`-plumbing requirement from a parenthetical "confirm or add" note to an explicit, itemized in-scope change listing the exact files (`optimization.types.ts`, `optimization.service.ts`, `optimization.processor.ts`, `prompt.types.ts`, `prompt.service.ts`), and (2) add one sentence clarifying that `matchScore` remains a model-emitted value (no backend derivation logic), only the prompt instructions change to account for the title check. Once these two points are tightened, the spec is implementable as-is.
