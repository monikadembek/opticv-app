# Task Specification

## Source

Task 77: Save the selected cover letter and the eventual edited version

## Goal

Persist the user's selected cover letter variant and their edited version of the cover letter text, and restore that state when the user reopens a stored CV optimization. Today, `CoverLetterEditor` only holds this state in local component signals (`selectedVariantIndex`, `editorContent`) that are never sent to the backend and are reset to the AI-recommended variant every time the `result` input changes — so selections and edits are lost on reload.

## Context

- Frontend: `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.ts` (+ `.html`) — the cover letter variant picker + PrimeNG rich-text editor.
- Parent: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` (+ `.html`) — owns `results()`, orchestrates optimization runs, and already implements the identical save/restore pattern for `SUMMARY_REWRITE` (`SummaryUserState`, `summaryRewriteResultId`, `persistSummarySubject` / `persistSummaryState()`) and partially for `BULLET_UPGRADE` (`selectedKeywords` in `BulletUserState`).
- Shared types: `packages/shared/datatypes/src/lib/datatypes.ts` — `CoverLetterResult`, `CoverLetterVariant`, `CoverLetterHookType`, and the existing `SummaryUserState` / `BulletUserState` persistence-shape types this task will mirror.
- Backend: `apps/opticv-be/src/app/optimization/` — `OptimizationResult` Prisma model already has a generic `userEditedOutput String?` column plus `PATCH /optimizations/:id/user-output` (save) and `GET /optimizations/job-applications/:jobApplicationId/results` (restore) endpoints, both prompt-type-agnostic. `PromptType.COVER_LETTER` already exists and produces one `OptimizationResult` row per job application (`@@unique([applicationId, promptType])`).

This task follows the exact pattern established by the recent fixes for bug 75 (summary variant not saved) and bug 76 (selected keywords not saved): no backend or Prisma changes are required — only frontend + shared-datatypes changes that write to and read from the existing `userEditedOutput` column as an opaque JSON string.

## Scope

### In scope

- Add a `CoverLetterUserState` type to `@opticv/datatypes`:
  ```ts
  export type CoverLetterUserState = {
    selectedVariant: CoverLetterHookType | null;
    editedContent: string | null;
  };
  ```
- `CoverLetterEditor` component:
  - Add two optional inputs: `initialSelectedVariant = input<CoverLetterHookType | null>(null)` and `initialEditedContent = input<string | null>(null)`.
  - Update the constructor `effect()` so that when `result()` changes: if `initialSelectedVariant` matches a variant's `hookType` in `result().variants`, select that variant's index instead of `safeIndex()`; and if `initialEditedContent` is non-null, seed `editorContent` with it instead of the AI-generated `buildContent(idx)`. Otherwise fall back to current behavior (AI-recommended variant, generated content).
  - This restore-preference logic must only apply on the initial application of a given `result()` (i.e., once the user selects a different variant or edits the text, subsequent unrelated change detection must not re-clobber their state). Reuse the existing `safeIndex`-based effect structure; do not introduce a second effect that fights the first.
  - Add two `output()`s: `variantSelected = output<CoverLetterHookType>()` and `contentEdited = output<string>()`.
    - `selectVariant(index)` emits `variantSelected` with the newly selected variant's `hookType` after updating local signals.
    - The `(ngModelChange)` handler on `<p-editor>` (or a new method wrapping it) updates `editorContent` and emits `contentEdited` with the new HTML string.
- `CvOptimization` parent component:
  - Add `coverLetterResultId = signal<string | null>(null)`.
  - Add `persistCoverLetterSubject = new Subject<void>()`, wired in `ngOnInit` with `debounceTime(500)` + `takeUntilDestroyed(this.destroyRef)` → calls `persistCoverLetterState()`, mirroring `persistSummarySubject`.
  - Add `selectedCoverLetterVariant` and `editedCoverLetterContent` state (either as new fields on `UserSelections`, consistent with how `selectedSummaryAngle`/`customSummaryText` are stored there, or as dedicated component signals — follow whichever existing convention is cleaner at the call site; prefer adding to `UserSelections` for consistency with the summary pattern).
  - Add `onCoverLetterVariantSelected(hookType: CoverLetterHookType)` and `onCoverLetterTextEdited(content: string)` handlers bound to the new `CoverLetterEditor` outputs in `cv-optimization.html`; each updates the relevant selection state and calls `this.persistCoverLetterSubject.next()`.
  - Add `persistCoverLetterState()` (mirrors `persistSummaryState()`): if `coverLetterResultId()` is unknown, resolve it via the existing `getOptimizationResults(jobApplicationId)` lookup (find the `COVER_LETTER` row) and cache it; then build a `CoverLetterUserState` from current selection state, `JSON.stringify` it, and call `cvOptimizationApiService.saveUserOutput(resultId, JSON.stringify(state))`. On error, show the same `MessageService` error toast pattern used by `persistSummaryState()`.
  - Add a `COVER_LETTER` branch in the `loadStoredOptimization()` per-result loop: set `coverLetterResultId.set(r.id)`, and if `r.userEditedOutput != null`, `JSON.parse` it as `CoverLetterUserState` (wrapped in try/catch with the same `console.warn` fallback pattern as the summary/bullet branches) and update selection state (`selectedSummaryAngle`-equivalent fields) accordingly.
  - Pass `[initialSelectedVariant]` and `[initialEditedContent]` inputs, and bind `(variantSelected)` / `(contentEdited)` outputs, on `<app-cover-letter-editor>` in `cv-optimization.html`.
  - Reset `coverLetterResultId.set(null)` (and the corresponding selection fields) wherever `summaryRewriteResultId` is reset when starting a fresh optimization run (`runOptimization()` / `resetSelections`).

### Out of scope

- Any backend/Prisma schema changes — the existing generic `userEditedOutput` column and `PATCH /optimizations/:id/user-output` / `GET /optimizations/job-applications/:id/results` endpoints are reused as-is.
- Changes to cover letter generation/AI prompt logic.
- Changes to PDF/DOCX export behavior (`onExportPdf`/`onExportDocx` already read from `editorContent()`, which will now correctly reflect restored/edited state — no code change needed there beyond what's listed above).
- Migrating `cv-optimization.ts` to an NgRx Signal Store — stay consistent with its current plain-signal, in-component pattern.

## Behavior

1. User runs a CV optimization; a `COVER_LETTER` result is generated with several variants. `CoverLetterEditor` auto-selects the AI-`recommendedVariant` and seeds the rich-text editor, as today.
2. User clicks "Use this version" on a different variant → `CoverLetterEditor` updates its local selection/content and emits `variantSelected` → parent updates its selection state and (debounced 500ms) calls `PATCH /optimizations/:id/user-output` with `{ selectedVariant, editedContent }` JSON-stringified into `userEditedOutput`, resolving the `COVER_LETTER` result id first if not yet cached.
3. User edits the letter text in the `<p-editor>` → `CoverLetterEditor` emits `contentEdited` on each change → parent updates `editedContent` in its selection state and (debounced 500ms) persists the same way.
4. User navigates away and later reopens the same stored optimization → `loadStoredOptimization()` fetches optimization results, finds the `COVER_LETTER` row, caches `coverLetterResultId`, parses `userEditedOutput` into `CoverLetterUserState`, and passes `selectedVariant`/`editedContent` down to `CoverLetterEditor` via `initialSelectedVariant`/`initialEditedContent` inputs.
5. `CoverLetterEditor` applies the restored variant selection and edited content instead of resetting to the AI recommendation, so the user sees exactly what they left off with, including their edits.
6. If the user starts a brand-new optimization run, all cover-letter selection state and the cached result id are reset, and the editor defaults to the freshly generated AI recommendation.

## Edge Cases

- **No prior saved state** (`userEditedOutput` is `null`, e.g. a first-time optimization or a row saved before this feature existed): `initialSelectedVariant`/`initialEditedContent` remain `null`, and `CoverLetterEditor` falls back to its current behavior (AI-recommended variant, generated content) — same as today, no regression.
- **Corrupt/unparseable `userEditedOutput` JSON**: caught in `loadStoredOptimization()`, logged via `console.warn`, restore is skipped, editor falls back to AI-recommended variant (mirrors existing summary/bullet error handling — no user-facing error).
- **`selectedVariant` no longer matches any `hookType` in a freshly regenerated `result().variants`** (e.g. AI output shape changed): `CoverLetterEditor` falls back to `safeIndex()` (AI-recommended variant) since no matching variant is found.
- **User edits text before a variant selection triggers a result id lookup**: `persistCoverLetterState()` must resolve `coverLetterResultId` on demand (via `getOptimizationResults`) the same way `persistSummaryState()` does, so persistence works regardless of which action (select vs. edit) happens first.
- **Rapid variant switching or fast typing**: covered by the existing 500ms debounce via `persistCoverLetterSubject`, consistent with summary/bullet sections — avoids excessive PATCH calls.
- **Save request fails** (network/server error): show the same `MessageService` error toast pattern (`severity: 'error'`) used by `persistSummaryState()`; local UI state is not reverted (user's selection/edit remains visible, matching existing behavior for summary/bullet failures).

## Data / API

- **No new endpoints.** Reuses:
  - `PATCH /optimizations/:id/user-output` — `apps/opticv-be/src/app/optimization/optimization.controller.ts`, `SaveUserOutputDto { userEditedOutput: string }`.
  - `GET /optimizations/job-applications/:jobApplicationId/results` — returns `OptimizationResultSummary[]` including `userEditedOutput` per `promptType`.
- **No Prisma/DB migration.** Reuses the existing `userEditedOutput String?` column on `OptimizationResult` (`apps/opticv-be/prisma/schema.prisma`), scoped by the existing `@@unique([applicationId, promptType])` constraint for `promptType = COVER_LETTER`.
- **New shared type** in `packages/shared/datatypes/src/lib/datatypes.ts`:
  ```ts
  export type CoverLetterUserState = {
    selectedVariant: CoverLetterHookType | null;
    editedContent: string | null;
  };
  ```
- **New/changed frontend fields:**
  - `CoverLetterEditor`: new inputs `initialSelectedVariant`, `initialEditedContent`; new outputs `variantSelected`, `contentEdited`.
  - `CvOptimization`: new signal `coverLetterResultId`; new subject `persistCoverLetterSubject`; new method `persistCoverLetterState()`; new `COVER_LETTER` branch in `loadStoredOptimization()`; new selection fields for `selectedVariant`/`editedContent` (added to `UserSelections` or as dedicated signals, per implementation).

## Acceptance (DEV)

- `npm exec nx build opticv-web`, `npm exec nx build opticv-be`, and `npm exec nx build datatypes` all pass.
- `npm exec nx typecheck opticv-web` and `npm exec nx typecheck opticv-be` pass.
- `npm exec nx lint opticv-web` passes.
- Unit tests added/updated for:
  - `CoverLetterEditor`: restore via `initialSelectedVariant`/`initialEditedContent` inputs; fallback to AI-recommended variant when inputs are `null` or don't match; `variantSelected`/`contentEdited` outputs emit correctly.
  - `CvOptimization`: `persistCoverLetterState()` builds correct payload and calls `saveUserOutput` with resolved result id; `loadStoredOptimization()` restores `CoverLetterUserState` correctly, including the corrupt-JSON fallback path.
- `npm exec nx test opticv-web` passes.
- No breaking changes to existing summary/bullet persistence behavior or to cover letter export (PDF/DOCX).
- Manual verification: select a non-recommended cover letter variant and/or edit the text, reload/reopen the stored optimization, confirm the selection and edits are restored exactly as left.
