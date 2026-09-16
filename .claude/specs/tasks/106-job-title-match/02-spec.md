# Task Specification

## Source

Task: 106-job-title-match

## Goal

Add job title matching to the existing Keyword Gap analysis: compare the candidate's current CV title (`contact.position`) against the target job's title (`jobTitle`), surface the comparison as a compact banner at the top of the Keyword Gap card, and let the user apply the AI-suggested title to their CV with one click. No new AI call — this is one more field returned by the existing `KEYWORD_GAP` prompt call, and it contributes to the existing `matchScore`/`matchScoreBreakdown`.

## Context

- Backend: `KEYWORD_GAP` prompt definition in `apps/opticv-be/prisma/seed.ts`, built via `PromptService` (`apps/opticv-be/src/app/ai/services/prompt.service.ts`) using `SHARED_CONTEXT` (which already includes `<resume>`, `<parsed_resume_sections>` — containing `contact.position` — and `<job_description>`, but not the job's `jobTitle` as a standalone field).
- Shared types: `packages/shared/datatypes/src/lib/datatypes.ts` (`KeywordGapResult`, `CvContactInfo`, `JobApplication`).
- Frontend: `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.{ts,html}` (presentational component), orchestrated by `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.{ts,html}` (owns all edit/selection signals and persistence), `utils/apply-selections.ts` (merges selections into the exported CV), `utils/recompute-scores.ts` (client-side score recompute after user selections).

## Scope

### In scope

1. New shared type `KeywordGapJobTitleMatch` and a `jobTitleMatch` field on `KeywordGapResult`.
2. Prompt change in `seed.ts`: new prompt version for `KEYWORD_GAP` (bump `version`) that instructs the model to compare candidate title vs. job title and adds `jobTitleMatch` to `outputSchema` (required) and to the `userPromptTemplate` instructions.
3. Pass the job's `jobTitle` into the prompt's shared context (it is not currently interpolated) so the model can compare it against `contact.position`.
4. UI: a title-match banner in `keyword-gap.html`, placed under the score ring and above the missing-keywords list, showing candidate title → target title, a match-level badge (`exact`/`close`/`mismatch`), the one-line `reasoning`, and (when `suggestedTitle` is present and `matchLevel !== 'exact'`) a "Use suggested title" button.
5. Apply logic: clicking "Use suggested title" sets `contact.position` to `suggestedTitle` in the exported/optimized CV, following the existing single-field override pattern (`keywordEdits`-style map/selection), applied in `applySelectionsToCV`.
6. Persistence: the title selection (and any manual edit to the suggested text) is persisted alongside other `BulletUserState` fields so it survives reload, mirroring `keywordEdits`/`selectedKeywords`.
7. Score contribution: the AI folds the title match into `matchScoreBreakdown.requiredMatched`/`requiredTotal` as one additional required-signal count (no new breakdown field). `recompute-scores.ts`'s `recomputeKeywordGapResult` is extended so that applying the suggested title also increments `requiredMatched` client-side, consistent with how accepting a missing keyword does today.

### Out of scope

- Changing `experience[0].title` (most recent role) — only `contact.position` is updated by "Use suggested title," per clarification.
- Any new AI call/endpoint — this reuses the existing `KEYWORD_GAP` job/response.
- Editing `JobApplication.jobTitle` itself.
- Retroactively backfilling `jobTitleMatch` on already-stored `KeywordGapResult` records generated under the old prompt version (existing records simply won't have this field — handled as an optional/absent case in the UI, see Edge Cases).

## Behavior

1. When the `KEYWORD_GAP` job runs, the prompt now receives the job posting's `jobTitle` (in addition to the existing `jobDescription`) and the candidate's `contact.position` (already available via `parsedSectionsJson`).
2. The model additionally returns a `jobTitleMatch` object:
   - `candidateTitle`: candidate's current title as read from the resume, or `null` if absent.
   - `targetTitle`: the job's title (mirrors `JobApplication.jobTitle`).
   - `matchLevel`: `'exact' | 'close' | 'mismatch'`.
   - `suggestedTitle`: AI-suggested replacement title, or `null` if `matchLevel` is `'exact'` (no change needed) or no reasonable suggestion applies.
   - `reasoning`: one-line explanation of the gap or why it's a match.
3. The model also factors this comparison into `matchScoreBreakdown` as one additional required item: if `matchLevel` is `'exact'`, it counts as matched; `'close'`/`'mismatch'` count as an unmatched required item. `requiredTotal` is incremented accordingly. `matchScore` is computed the same way it already is today (using the updated breakdown).
4. In the Keyword Gap UI, directly under the score ring:
   - If `jobTitleMatch` is present, render a banner: `Your title: {candidateTitle ?? '—'} → Job wants: {targetTitle}`, a badge for `matchLevel` (color-coded like the existing importance/score badges: green for exact, amber for close, red for mismatch), and the `reasoning` text below.
   - If `matchLevel !== 'exact'` and `suggestedTitle` is not null, show a "Use suggested title" button (same visual pattern as the existing "Edit" button on keyword rows).
   - If `jobTitleMatch` is absent (older stored results, see Edge Cases), the banner is not rendered at all.
5. Clicking "Use suggested title" toggles a selection (applied/not applied) — same toggle affordance as keyword checkboxes — and reveals an inline edit affordance to tweak the suggested text before applying, reusing the existing edit-row pattern (edit icon → input + Save/Cancel).
6. When applied, `contact.position` in the merged/exported CV (`applySelectionsToCV`) is set to the (possibly user-edited) suggested title.
7. The title selection and any edit to the suggested text are persisted in the same `BulletUserState`-style payload used for keyword/acronym edits, so re-opening the optimization restores the applied state.
8. Applying the suggested title recomputes `matchScore` client-side the same way accepting a missing keyword does (credits one more required match), via `recomputeKeywordGapResult`.

## Edge Cases

- `candidateTitle` is `null` (CV has no `contact.position`): banner still renders, showing `—` in place of the candidate title; `matchLevel` will typically be `'mismatch'` in this case, decided by the AI.
- `jobTitleMatch` is missing entirely (result generated by an older `PromptVersion` before this change, or the model omits it despite being a required schema field): treat as absent — no banner rendered, no score contribution change, no crash. Guard with an optional check (`result().jobTitleMatch`) in the component; do not make the field non-optional-unsafe on the frontend even though the schema marks it required for new results.
- `matchLevel === 'exact'`: banner shows the green "exact" badge and reasoning, no "Use suggested title" button (since `suggestedTitle` will be `null` or nonsensical to apply).
- User applies the suggested title, then edits the CV's `contact.position` in another part of the app before export: last-applied-wins, consistent with how other overrides in `applySelectionsToCV` compose (the merged CV is derived fresh from `cvStructuredData` plus current selections each time).
- Retry of the `KEYWORD_GAP` job (existing "Retry" button) regenerates `jobTitleMatch` along with the rest of the result; any previously applied title selection is not automatically cleared — same behavior as existing keyword/acronym selections on retry (out of scope to change).
- `targetTitle` is empty/`jobTitle` is `null` on the `JobApplication`: the existing `KEYWORD_GAP` job already depends on job description text; if `jobTitle` is null, interpolate an empty string / omit the targeted-title comparison context, and the AI should be instructed to note this rather than fabricate a target title (`reasoning` should reflect that no job title was provided, `matchLevel` defaults to `'mismatch'`, `suggestedTitle` to `null`).

## Data / API

- No new endpoints. Existing `KEYWORD_GAP` optimization job/response pipeline is reused end-to-end.
- **`packages/shared/datatypes/src/lib/datatypes.ts`**:
  ```ts
  export type KeywordGapJobTitleMatch = {
    candidateTitle: string | null;
    targetTitle: string;
    matchLevel: 'exact' | 'close' | 'mismatch';
    suggestedTitle: string | null;
    reasoning: string;
  };

  export type KeywordGapResult = {
    matchScore: number;
    matchScoreBreakdown: KeywordGapMatchScoreBreakdown;
    matchedKeywords: KeywordGapMatchedKeyword[];
    missingKeywords: KeywordGapMissingKeyword[];
    underweightedKeywords: KeywordGapUnderweightedKeyword[];
    fabricationWarnings: KeywordGapFabricationWarning[];
    acronymIssues: KeywordGapAcronymIssue[];
    jobTitleMatch?: KeywordGapJobTitleMatch; // optional: absent on results from older prompt versions
  };
  ```
- **`UserSelections`**: add `selectedJobTitle: boolean` (whether the suggested title is applied) — mirrors the boolean nature of a single toggle, unlike the array-based `selectedKeywords`.
- **`BulletUserState`** (persisted payload): add
  ```ts
  selectedJobTitle?: boolean;
  jobTitleEdit?: string; // user-edited version of suggestedTitle, if edited
  ```
- **`apps/opticv-be/prisma/seed.ts`** (`KEYWORD_GAP` entry):
  - Bump `version` (e.g. `'1.1.0'`), keep `isActive: true` (deactivate the prior version per existing seeding convention — confirm seeding script behavior for version activation is unchanged).
  - Add `jobTitleMatch` to `outputSchema.input_schema.required` and `properties`, matching the shape above (`matchLevel` as `enum: ['exact', 'close', 'mismatch']`).
  - Extend `systemPrompt`/`userPromptTemplate` with instructions to compare candidate title vs. job title and fold the result into the required-match counts.
- **`PromptService` / `SHARED_CONTEXT`**: add a `Target job title: {{jobTitle}}` line inside the existing `<context>` block (or a new tag) so the interpolated prompt carries `JobApplication.jobTitle`. Confirm the caller (optimization processor / job) already passes `jobTitle` in its `PromptVariables`, or add it if missing.
- **`apps/opticv-web/.../utils/apply-selections.ts`**: new parameter(s) for `selectedJobTitle: boolean` and `jobTitleEdit: string | undefined` (or bundled similarly to other edit maps); when applied, sets `clone.contact.position` to `jobTitleEdit ?? keywordResult.jobTitleMatch.suggestedTitle`.
- **`apps/opticv-web/.../utils/recompute-scores.ts`**: `recomputeKeywordGapResult` gains awareness of the job-title selection to credit one more `requiredMatched` when applied (same clamping against `requiredTotal` as existing logic).
- **`keyword-gap.ts`/`.html`**: new `input()`s (`selectedJobTitle: boolean`, `activeJobTitleEdit: boolean`, `editedJobTitleText: string`) and `output()`s (`jobTitleToggled`, `jobTitleEditStarted`, `jobTitleEditSaved`, `jobTitleEditCancelled`, `jobTitleEditTextChanged`) following the exact naming/event pattern already used for `keywordEdit*`/`acronymEdit*`.
- **`cv-optimization.ts`/`.html`**: new signals (`selectedJobTitle`, `activeJobTitleEditState`, `editedJobTitleText`) wired the same way as `keywordEdits`/`activeKeywordEditKey`, included in `mergedCv` computation and `persistBulletState`/state-restore logic.

## Acceptance (DEV)

- `npm exec nx build opticv-be`, `npm exec nx build opticv-web`, and `npm exec nx build datatypes` (or `run-many -t build`) pass.
- `npm exec nx typecheck opticv-be` and `npm exec nx typecheck opticv-web` pass.
- Unit tests added/updated:
  - `apply-selections.spec.ts`: covers applying the suggested title (with and without a user edit) to `contact.position`.
  - `recompute-scores.spec.ts`: covers score recompute crediting the applied title match.
  - `keyword-gap.spec.ts`: covers banner rendering for each `matchLevel`, absence of banner when `jobTitleMatch` is undefined, and the "Use suggested title" button/edit flow.
  - `prompt.service.spec.ts`: covers `jobTitle` interpolation into the shared context, if `PromptVariables`/`SHARED_CONTEXT` changes.
- No breaking changes to `KeywordGapResult` consumers — `jobTitleMatch` is optional, so existing stored results without it continue to render without the banner.
- UI passes AXE checks / WCAG AA (badge color contrast, `aria-label`s on the new button/toggle, following the existing checkbox/button accessibility patterns in `keyword-gap.html`).
- Manually verified in the running app: generate a fresh Keyword Gap result for a CV/job pair with a title mismatch, confirm banner + suggestion + apply + persistence-after-reload all work; confirm an "exact" match hides the apply button; confirm export reflects the applied title.
