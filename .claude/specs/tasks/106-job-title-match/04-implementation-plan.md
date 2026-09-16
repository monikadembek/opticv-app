# Implementation Plan: 106-job-title-match

Source spec: `02-spec.md` · Review: `03-spec-review.md` (PASS WITH ISSUES)

This plan resolves the two critical review issues before listing steps:

- **`jobTitle` plumbing**: confirmed by code inspection that `jobTitle` does NOT currently reach the `KEYWORD_GAP` prompt. It must be threaded through `OptimizationJobPayload` → `optimization.service.ts` (`loadAndValidateApplication` + 3 call sites) → `optimization.processor.ts` → `PromptVariables`/`SharedPromptVariables` → `SHARED_CONTEXT`. This is Phase 1 below, done first since everything else depends on it.
- **`matchScore` computation**: confirmed by reading `seed.ts` that `matchScore` is a value the model emits directly in its structured JSON output (not derived by backend code from `matchScoreBreakdown`). No new score-derivation code is needed — only a prompt-instruction sentence telling the model to factor the title check into the `matchScore` and `matchScoreBreakdown.requiredMatched`/`requiredTotal` it already returns.
- **Prompt version convention**: confirmed by git history (Task 101, Task 61) that in-place prompt-schema changes edit the existing seed entry without bumping `version` — the seed script's `upsert` re-applies `update` to the same `promptType_version` row. No version bump, no deactivation logic needed.

---

## Phase 1 — Backend: thread `jobTitle` into the prompt pipeline

### 1.1 `apps/opticv-be/src/app/optimization/optimization.types.ts`
- Add `jobTitle: string | null` to `OptimizationJobPayload`.

### 1.2 `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `loadAndValidateApplication`: add `jobTitle: record.jobTitle` to the returned object and its return type annotation.
- `triggerOptimization`: destructure `jobTitle` from `loadAndValidateApplication`'s result and add it to `payloadBase`.
- `triggerSingleJob`: destructure `jobTitle` and add it to the inline `OptimizationJobPayload` object passed to `this.queue.add`.
- `retryFailedJob`: same — destructure `jobTitle` and add it to the payload object built there.

### 1.3 `apps/opticv-be/src/app/optimization/optimization.processor.ts`
- Destructure `jobTitle` from `job.data`.
- Pass `jobTitle: jobTitle ?? ''` into the `buildUserPrompt` vars object (alongside `targetRole`, which stays `''` as today — unrelated field, not touched).

### 1.4 `apps/opticv-be/src/app/ai/types/prompt.types.ts`
- Add `jobTitle: string` to `SharedPromptVariables`.

### 1.5 `apps/opticv-be/src/app/ai/services/prompt.service.ts`
- Add a line to `SHARED_CONTEXT`'s `<context>` block: `Target job title: {{jobTitle}}` (directly under `Target role: {{targetRole}}`).

### 1.6 Tests
- `apps/opticv-be/src/app/optimization/optimization.processor.spec.ts`: update `basePayload` to include `jobTitle: 'Engineer'` (or similar); add/extend an assertion that the built user prompt or `buildUserPrompt` call includes `jobTitle`.
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`: update the mocked `jobApplication.findUnique` fixture to include `jobTitle`; update `expect.objectContaining(...)` assertions on queued payloads to include `jobTitle` for all three methods under test (`triggerOptimization`, `triggerSingleJob`, `retryFailedJob`).
- `apps/opticv-be/src/app/ai/services/prompt.service.spec.ts`: add `jobTitle: 'Engineer'` to `BASE_VARS`; add a test asserting `{{SHARED_CONTEXT}}` interpolation includes the job title text (mirrors the existing "substitutes all shared context variables" test).

---

## Phase 2 — Shared types

### 2.1 `packages/shared/datatypes/src/lib/datatypes.ts`
- Add new type directly above `KeywordGapResult`:
  ```ts
  export type KeywordGapJobTitleMatch = {
    candidateTitle: string | null;
    targetTitle: string;
    matchLevel: 'exact' | 'close' | 'mismatch';
    suggestedTitle: string | null;
    reasoning: string;
  };
  ```
- Add optional field to `KeywordGapResult`: `jobTitleMatch?: KeywordGapJobTitleMatch;`
- `UserSelections`: add `selectedJobTitle: boolean;`
- `BulletUserState`: add `selectedJobTitle?: boolean;` and `jobTitleEdit?: string;`

### 2.2 Build
- `npm exec nx build datatypes` before touching consumers, so both apps see the updated types.

---

## Phase 3 — Backend: prompt content and schema (`seed.ts`)

### 3.1 `apps/opticv-be/prisma/seed.ts` — `KEYWORD_GAP` entry (in place, same `version: '1.0.0'`)
- `systemPrompt`: add one analysis principle about comparing candidate title vs. target job title as a high-weight ATS signal, and instruct that if the job title was not provided, note that in `reasoning` rather than fabricating a target title.
- `userPromptTemplate`: add an instruction step (after the existing keyword-gap steps) telling the model to also compare the candidate's current title (from `parsedSectionsJson.contact.position`) against the job title provided in the shared context, and to fold the result into `matchScoreBreakdown.requiredMatched`/`requiredTotal` as one more required item (matched if `exact`, unmatched if `close`/`mismatch`) before computing `matchScore`.
- `outputSchema.input_schema.required`: add `'jobTitleMatch'`.
- `outputSchema.input_schema.properties`: add
  ```ts
  jobTitleMatch: {
    type: 'object',
    required: ['candidateTitle', 'targetTitle', 'matchLevel', 'suggestedTitle', 'reasoning'],
    properties: {
      candidateTitle: { type: ['string', 'null'] },
      targetTitle: { type: 'string' },
      matchLevel: { type: 'string', enum: ['exact', 'close', 'mismatch'] },
      suggestedTitle: { type: ['string', 'null'] },
      reasoning: { type: 'string' },
    },
  },
  ```
  (Follow the exact JSON-schema conventions already used for nullable/enum fields elsewhere in the same file, e.g. `missingKeywords`/`acronymIssues` items.)

### 3.2 Run seed
- After the code change, run `npm exec prisma db seed` (or the project's existing seed command) against a dev DB to upsert the updated `KEYWORD_GAP` prompt row. Confirm via `npm exec prisma studio` or a query that `outputSchema` reflects the new field.

---

## Phase 4 — Frontend: `apply-selections.ts`

### 4.1 `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`
- Add two new parameters to `applySelectionsToCV`: `selectedJobTitle = false` and `jobTitleEdit: string | undefined = undefined` (placed after `acronymBulletPositions`, before `includeGdprClause`, matching the existing parameter-ordering convention of grouping related edit maps together).
- Add logic block (near the acronym/keyword blocks): if `selectedJobTitle` is true AND `keywordResult?.jobTitleMatch?.suggestedTitle` is present, set `clone.contact.position = jobTitleEdit ?? keywordResult.jobTitleMatch.suggestedTitle`. If `jobTitleMatch` is absent (older result) or `suggestedTitle` is null, this is a no-op — do not throw.

### 4.2 Tests — `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`
- Add a `KeywordGapResult` fixture (or extend the existing mock) with a `jobTitleMatch` block.
- Test: `selectedJobTitle: true`, no `jobTitleEdit` → `contact.position` becomes `suggestedTitle`.
- Test: `selectedJobTitle: true`, `jobTitleEdit` provided → `contact.position` becomes the edited text.
- Test: `selectedJobTitle: false` → `contact.position` unchanged.
- Test: `selectedJobTitle: true` but `keywordResult` has no `jobTitleMatch` (or `keywordResult` is `null`) → `contact.position` unchanged, no throw.

---

## Phase 5 — Frontend: `recompute-scores.ts`

### 5.1 `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.ts`
- `recomputeKeywordGapResult`: add a new parameter `selectedJobTitle: boolean = false`.
- If `selectedJobTitle` is true and `original.jobTitleMatch` is present and `original.jobTitleMatch.matchLevel !== 'exact'`, increment `clone.matchScoreBreakdown.requiredMatched` by 1 (clamped to `requiredTotal`, same pattern as the existing missing-keyword loop) before the ratio/score recompute math runs.
- No change to the weighting formula itself — the existing `reqRatio`/`prefRatio`/`w` logic already operates generically on `requiredMatched`/`requiredTotal`, so it picks up the extra credit without modification.

### 5.2 Tests — `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.spec.ts`
- Add a test: applying `selectedJobTitle: true` with a `mismatch`/`close` `jobTitleMatch` increments `requiredMatched` and recomputes `matchScore` upward, consistent with existing keyword-acceptance test expectations.
- Add a test: `selectedJobTitle: true` with an `exact` `jobTitleMatch` does NOT increment `requiredMatched` (already counted as matched by the AI).
- Add a test: `selectedJobTitle: true` with no `jobTitleMatch` on the result is a no-op.

---

## Phase 6 — Frontend: `keyword-gap` component

### 6.1 `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`
- New `input()`s: `selectedJobTitle = input<boolean>(false)`, `activeJobTitleEdit = input<boolean>(false)`, `editedJobTitleText = input<string>('')`.
- New `output()`s: `jobTitleToggled = output<void>()`, `jobTitleEditStarted = output<void>()`, `jobTitleEditSaved = output<string>()`, `jobTitleEditCancelled = output<void>()`, `jobTitleEditTextChanged = output<string>()`.
- New methods mirroring the keyword/acronym pattern: `isEditingJobTitle()`, `getJobTitleDisplayText()` (returns `editedJobTitleText()` while editing or the AI `suggestedTitle` otherwise), plus a `jobTitleBadgeClass` / `matchLevelLabel` helper computed from `result().jobTitleMatch?.matchLevel` for badge coloring (green=exact, amber=close, red=mismatch — reuse the existing importance-badge color classes already in the template).

### 6.2 `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html`
- Insert a new block directly after the closing `</div>` of the score-ring section (before the `<!-- Missing Keywords -->` comment), guarded by `@if (result().jobTitleMatch; as titleMatch)`:
  - Row: `Your title: {{ titleMatch.candidateTitle ?? '—' }} → Job wants: {{ titleMatch.targetTitle }}`.
  - Match-level badge using the same `text-xs font-semibold uppercase ... rounded-full` classes as the importance badges, color-mapped from `matchLevel`.
  - `<p>` with `titleMatch.reasoning`.
  - `@if (titleMatch.matchLevel !== 'exact' && titleMatch.suggestedTitle)`: render the apply/edit affordance — a toggle button "Use suggested title" (checkbox-style like keyword rows, or a `p-button` toggle — follow the "Edit" button visual pattern already in the file) plus, when `isEditingJobTitle()` is true, the same `input + Save/Cancel` pattern used for `keywordEditStarted`/`keywordEditSaved`.
  - Include `aria-label`s on the toggle/button and the edit input, consistent with existing `aria-label="Select keyword ..."` / `aria-label="Edit keyword text"` patterns, to satisfy the AXE/WCAG AA acceptance criterion.

### 6.3 Tests — `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts`
- Extend `MOCK_RESULT` with a `jobTitleMatch` fixture (or add a second fixture variant without it).
- Test: banner renders candidate/target title, badge, reasoning when `jobTitleMatch` is present.
- Test: banner does not render when `jobTitleMatch` is `undefined`.
- Test: "Use suggested title" button is hidden when `matchLevel === 'exact'`.
- Test: "Use suggested title" button visible and clicking it emits `jobTitleToggled` when `matchLevel` is `'close'`/`'mismatch'` and `suggestedTitle` is non-null.
- Test: edit flow — starting edit emits `jobTitleEditStarted`, typing emits `jobTitleEditTextChanged`, saving emits `jobTitleEditSaved` with the typed text, cancel emits `jobTitleEditCancelled`.

---

## Phase 7 — Frontend: `cv-optimization` parent (state, wiring, persistence)

### 7.1 `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- New signals alongside the existing keyword/acronym edit signals: `activeJobTitleEditState = signal<boolean>(false)`, `editedJobTitleText = signal<string>('')`.
- `selections` signal's shape already comes from `UserSelections` — add `selectedJobTitle: false` to every place `selections.set({...})` is constructed from scratch (initial state, `runOptimization` reset).
- Handler methods mirroring existing `onKeywordToggled`/`onKeywordEditStarted`/etc.:
  - `onJobTitleToggled()`: flips `this.selections().selectedJobTitle` via `update`.
  - `onJobTitleEditStarted()`: sets `activeJobTitleEditState.set(true)` and seeds `editedJobTitleText` from the current suggestion (`keywordGapResult()?.jobTitleMatch?.suggestedTitle ?? ''`) or existing edit if present.
  - `onJobTitleEditSaved(text: string)`: stores the edit (component-level signal, e.g. `jobTitleEdit = signal<string | undefined>(undefined)`, set to `text`), closes edit mode.
  - `onJobTitleEditCancelled()`: closes edit mode without saving.
  - `onJobTitleEditTextChanged(text: string)`: updates `editedJobTitleText`.
- `mergedCv` computed: add `this.selections().selectedJobTitle` and `this.jobTitleEdit()` as new trailing args to the `applySelectionsToCV(...)` call, matching the new parameters added in Phase 4.
- `recomputedKeywordGapResult` (the computed wrapping `recomputeKeywordGapResult`, referenced at line ~369): pass `this.selections().selectedJobTitle` as the new argument added in Phase 5.
- State restore (the `BULLET_UPGRADE` result branch, ~line 685–748, since job-title state piggybacks on the same persisted `BulletUserState` blob): after parsing `state as BulletUserState`, also do:
  ```ts
  this.selections.update((s) => ({ ...s, selectedJobTitle: state.selectedJobTitle ?? false }));
  this.jobTitleEdit.set(state.jobTitleEdit);
  ```
- `persistBulletState` (~line 1220–1280): add `selectedJobTitle: this.selections().selectedJobTitle` and `jobTitleEdit: this.jobTitleEdit()` (omit key if `undefined`, matching how other optional persisted fields are handled) to the constructed `BulletUserState` object.

### 7.2 `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- Add new bindings to the existing `<app-keyword-gap ...>` element (alongside the existing keyword/acronym bindings): `[selectedJobTitle]`, `[activeJobTitleEdit]`, `[editedJobTitleText]`, and the five new `(jobTitle*)` output handlers, following the exact naming convention already used for `(keywordEdit*)`/`(acronymEdit*)` bindings.

### 7.3 Tests — `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- Test: toggling job title selection updates `mergedCv()`'s `contact.position`.
- Test: state restore from a persisted `BulletUserState` containing `selectedJobTitle`/`jobTitleEdit` correctly repopulates signals.
- Test: `persistBulletState` includes `selectedJobTitle`/`jobTitleEdit` in the saved payload.

---

## Phase 8 — Verification

1. `npm exec nx build datatypes` — must pass before other builds (dependency order).
2. `npm exec nx typecheck opticv-be` and `npm exec nx typecheck opticv-web`.
3. `npm exec nx test opticv-be` — covers Phase 1, 3 (via `prompt.service.spec.ts`, `optimization.service.spec.ts`, `optimization.processor.spec.ts`).
4. `npm exec nx test opticv-web` — covers Phases 4–7.
5. `npm exec nx lint opticv-be` / `npm exec nx lint opticv-web`.
6. `npm exec nx build opticv-be` / `npm exec nx build opticv-web`.
7. Manual verification (per spec Acceptance): run the dev servers, trigger a fresh `KEYWORD_GAP` optimization for a CV/job pair with a title mismatch, confirm:
   - Banner renders with correct candidate/target titles and badge color.
   - "Use suggested title" applies and is reflected in the exported/merged CV preview.
   - Editing the suggested text before applying works and persists.
   - Reloading the page restores the applied selection.
   - A CV/job pair with an exact title match hides the apply button and shows the green badge.
8. AXE/accessibility check on the new banner markup (keyboard focus reachable, `aria-label`s present, badge color contrast meets WCAG AA) — per project conventions (`.claude/context/conventions.md` accessibility requirements).

---

## Planned Files (created/modified)

**Backend:**
- `apps/opticv-be/src/app/optimization/optimization.types.ts` (modify)
- `apps/opticv-be/src/app/optimization/optimization.service.ts` (modify)
- `apps/opticv-be/src/app/optimization/optimization.processor.ts` (modify)
- `apps/opticv-be/src/app/ai/types/prompt.types.ts` (modify)
- `apps/opticv-be/src/app/ai/services/prompt.service.ts` (modify)
- `apps/opticv-be/prisma/seed.ts` (modify — `KEYWORD_GAP` entry only)
- `apps/opticv-be/src/app/optimization/optimization.processor.spec.ts` (modify)
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` (modify)
- `apps/opticv-be/src/app/ai/services/prompt.service.spec.ts` (modify)

**Shared types:**
- `packages/shared/datatypes/src/lib/datatypes.ts` (modify)

**Frontend:**
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.ts` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/utils/recompute-scores.spec.ts` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` (modify)

No new files — every change extends an existing module, consistent with the "reuse the existing pattern" intent of the raw task.
