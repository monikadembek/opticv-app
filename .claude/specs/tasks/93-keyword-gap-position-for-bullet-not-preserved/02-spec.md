# Task Specification

## Source

Azure DevOps Task: 93 — Bug - Keywords gap section - position for added keyword with experience bullet type placement is not preserved

## Goal

Fix the "Keywords gap" section so that when a job application's optimization is reopened in stored mode, a previously selected experience-bullet placement for an added keyword is restored correctly, and stays reliable going forward — by replacing label-based matching with a stable index-based reference.

## Context

`apps/opticv-web/src/app/features/cv-optimization/` — the CV optimization page, specifically:

- `components/keyword-gap/keyword-gap.ts` / `keyword-gap.html` — renders the missing-keywords list; for a selected keyword whose `suggestedPlacement` is `'experience_bullet'`, it renders a `<select>` of experience "positions" so the user can pick which job/experience entry the keyword should be added to.
- `cv-optimization.ts` — hosts the `keywordBulletPositions` signal (`Map<string, string>`, keyword → position), the `experiencePositionLabels` computed (derives the `<option>` values as `"${company} - ${title}"` from `cvStructuredData()`), the stored-mode restore logic (`loadStoredOptimization`), and the persistence logic (`persistBulletState`).
- `utils/apply-selections.ts` — when generating the exported/optimized CV, matches the stored `forPosition` string back to an experience entry to insert the keyword as a new bullet.
- `packages/shared/datatypes/src/lib/datatypes.ts` — `BulletUserState.keywordBulletPositions?: Array<{ keyword: string; forPosition: string }>`, the persisted shape (JSON-stringified into the `BULLET_UPGRADE` `OptimizationResult.userEditedOutput` column).

## Root Cause

The selected experience entry for a keyword's bullet placement is identified purely by a **derived display label string** (`"${company} - ${title}"`), not a stable id:

- `cv-optimization.ts` (`experiencePositionLabels`): the `<select>`'s `<option>` values are recomputed from `cvStructuredData()` on every load as `"${e.company ?? ''} - ${e.title ?? ''}"`.
- `keywordBulletPositions` stores this same label string as the value, keyed by keyword; it's saved verbatim into `BulletUserState.keywordBulletPositions[].forPosition` and persisted server-side.
- On stored-mode reload, the saved label is loaded back into `keywordBulletPositions` and the `<select [value]>` is matched by exact string equality against the freshly recomputed `experiencePositionLabels()`. If the label doesn't match any current `<option>` exactly, the native `<select>` silently falls back to no selection (shows "— pick a position —") — with no error and no fallback logic.
- `apply-selections.ts` independently supports two label formats when matching (`"company - title"` and `"title at company"`), but `experiencePositionLabels()` only ever produces the first format — the second is dead code, evidence of a prior inconsistency in this area.

This label-based scheme is inherently fragile: any drift in how `company`/`title` are (re-)extracted, whitespace/casing differences, or duplicate `company - title` combinations across experience entries can cause the match to silently fail — which is the bug being reported.

## Scope

### In scope

- Change the "which experience entry" reference for a keyword's bullet placement from a derived label string to a **stable index** (`experienceIndex: number`, the entry's position in `cvStructuredData().experience`).
- Update the frontend signal, save, and restore logic in `cv-optimization.ts` to store/restore by index.
- Update `keyword-gap.ts` / `keyword-gap.html` so the `<select>` binds to the index while still displaying the human-readable label as option text.
- Update `apply-selections.ts` to resolve the target experience entry by index instead of label matching; remove the now-dead `atFormat` matching branch.
- Update the shared type `BulletUserState.keywordBulletPositions` in `packages/shared/datatypes/src/lib/datatypes.ts` to carry `experienceIndex` instead of (or alongside, if needed for display/back-compat) `forPosition`.
- Add test coverage for stored-mode restoration of an `experience_bullet` keyword placement, mirroring the existing "restores X from stored mode" tests for `selectedSummaryAngle`, `selectedCoverLetterVariant`, and `selectedKeywords` in `cv-optimization.spec.ts`.
- Add component-level test coverage in `keyword-gap.spec.ts` for the position picker (`experiencePositions`, `keywordBulletPositions`, `getKeywordPosition`), which currently has none.

### Out of scope

- Backend changes — `userEditedOutput` remains an opaque JSON string column; no Prisma schema or DTO changes needed.
- Changing where keyword-gap selections are persisted (i.e., still smuggled into the `BULLET_UPGRADE` result's state blob rather than the `KEYWORD_GAP` result) — this is an existing architectural quirk not related to this bug.
- Fixing the silent no-op in `persistBulletState()` when no `BULLET_UPGRADE` result row exists yet (separate latent issue, not the reported symptom).
- Handling the case where `cvStructuredData().experience` entries are reordered or removed between save and reload (index-based matching does not fully solve this either, but it is strictly more stable than label matching and is the agreed approach — no additional reconciliation logic is required for this task).

## Behavior

1. User selects a missing keyword whose `suggestedPlacement` is `experience_bullet`.
2. A `<select>` of experience entries appears (label text unchanged: `"${company} - ${title}"`), but its underlying value is now the experience entry's **index**.
3. User picks an entry. `onKeywordBulletPositionSelected` now emits `{ keyword, experienceIndex }` instead of `{ keyword, forPosition }`. `cv-optimization.ts` stores this in `keywordBulletPositions: Map<string, number>` and persists it via `persistBulletState()` (debounced, unchanged mechanism).
4. On stored-mode reload (`loadStoredOptimization`), `keywordBulletPositions` is rehydrated directly from the persisted `experienceIndex` values — no string matching involved.
5. The `<select>`'s bound value resolves to the same index, so the correct `<option>` (by position, using the freshly loaded `cvStructuredData().experience[index]`) is shown as selected — as long as the index is within bounds of the current experience array.
6. If the stored index is out of bounds for the current `cvStructuredData().experience` array (e.g. an experience entry was deleted), the `<select>` falls back to unselected ("— pick a position —"), same as today's failure behavior for an unmatched label — this is an acceptable degraded fallback, not a new failure mode introduced by this fix.
7. `apply-selections.ts` looks up `clone.experience[experienceIndex]` directly by index when inserting the keyword's bullet, instead of scanning for a label match.

## Edge Cases

- Stored `experienceIndex` is `undefined`/missing (e.g., data saved before this fix, or the keyword was deselected) → treat as "no position selected", same as an empty string today.
- Stored `experienceIndex` is out of bounds for the current experience array → falls back to unselected in the `<select>` (see Behavior #6); `apply-selections.ts` should also skip insertion in this case (`expIndex` check already guards with `!== -1`/bounds check).
- Two experience entries with identical `"company - title"` labels → previously ambiguous under label matching; index-based matching resolves this correctly since each entry has a distinct index.
- Keyword deselected then reselected → its stored `experienceIndex` (if any) should still be shown when the position `<select>` reappears (existing `getKeywordPosition` behavior, just keyed by index now).

## Data / API

- No backend endpoint or Prisma schema changes.
- Shared type change in `packages/shared/datatypes/src/lib/datatypes.ts`:

  ```ts
  export type BulletUserState = {
    ...
    keywordBulletPositions?: Array<{ keyword: string; experienceIndex: number }>;
    ...
  };
  ```

  (Replaces the current `{ keyword: string; forPosition: string }[]` shape. No backend migration needed since this is stored as opaque JSON in `userEditedOutput`; existing stored records with the old `forPosition` shape will simply fail to match on restore and fall back to unselected — acceptable per the same degraded-fallback behavior in Edge Cases.)

- Frontend signal: `keywordBulletPositions = signal<Map<string, number>>(new Map())` (was `Map<string, string>`).
- Component I/O changes in `keyword-gap.ts`:
  - `keywordBulletPositions` input becomes `Map<string, number>`.
  - `keywordBulletPositionSelected` output becomes `{ keyword: string; experienceIndex: number | null }` (null represents "— pick a position —" cleared).
  - `getKeywordPosition(keyword)` returns `number | null` (or a sentinel) instead of `string`.

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx typecheck opticv-web` passes.
- `npm exec nx test opticv-web` passes, including:
  - New test(s) in `cv-optimization.spec.ts` asserting that a stored `keywordBulletPositions` entry (by `experienceIndex`) is restored into the `keywordBulletPositions` signal on `loadStoredOptimization`, and correctly round-trips through `persistBulletState`.
  - New test(s) in `keyword-gap.spec.ts` covering `experiencePositions`, `keywordBulletPositions` input, and `getKeywordPosition`/`onPositionChange` behavior.
  - Updated/new test(s) in `apply-selections.spec.ts` (if it exists) or equivalent, covering index-based bullet insertion, replacing any existing label-matching assertions.
- No breaking changes to unrelated placement types (`summary`, `skills`, `title`, `multiple`), which remain unaffected by this change.
