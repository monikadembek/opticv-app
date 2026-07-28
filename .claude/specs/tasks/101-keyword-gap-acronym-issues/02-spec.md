# Task Specification

## Source

Azure DevOps Task: 101 — Acronym issues - implement adding/replacing keywords in optimized resume

## Goal

Make the "Acronym issues" section of the Keyword Gap results actionable, mirroring the existing "Missing Keywords" select → edit → apply-to-CV flow, so users can choose to add or replace an acronym term directly in their optimized CV instead of only reading about it.

## Context

- Backend: `apps/opticv-be/prisma/seed.ts` — `PromptType.KEYWORD_GAP` prompt definition, `outputSchema.input_schema` (JSON schema sent to the LLM as the tool-call schema for structured output).
- Shared types: `packages/shared/datatypes/src/lib/datatypes.ts` — `KeywordGapAcronymIssue`, `KeywordGapResult`, `KeywordGapMissingKeyword`, `UserSelections`, `BulletUserState`.
- Frontend: `apps/opticv-web/src/app/features/cv-optimization/`
  - `components/keyword-gap/keyword-gap.ts` / `.html` — presentational component rendering the Keyword Gap results, including the read-only "Acronym issues" collapsible section.
  - `cv-optimization.ts` — parent smart component holding selection state (signals), event handlers, persistence (`persistBulletState()`), and the `mergedCv` computed that feeds the CV preview/export.
  - `utils/apply-selections.ts` — pure function `applySelectionsToCV()` that merges all user selections into a `CvStructuredData` clone.
- DB: `apps/opticv-be/prisma/schema.prisma` — `PromptVersion.outputSchema` (Json?) stores the schema above; `OptimizationResult.structuredOutput` (Json?) stores the LLM's actual result matching `KeywordGapResult`; `OptimizationResult.userEditedOutput` (String?, holds serialized `BulletUserState`) is the persistence target for user edits/selections.

## Scope

### In scope

1. **`seed.ts` schema change** (`PromptType.KEYWORD_GAP`, `outputSchema.input_schema`):
   - Add `'acronymIssues'` to the top-level `required` array (currently: `matchScore`, `matchScoreBreakdown` is NOT required today — verify exact list at edit time — `matchedKeywords`, `missingKeywords`, `underweightedKeywords`, `fabricationWarnings`).
   - Within `acronymIssues.items`, add two new required properties alongside the existing `term`, `issue`, `fix`:
     - `actionType`: `type: 'string'`, `enum: ['add', 'replace']` — tells the app whether the fix should be added as a new term or should replace the existing `term` occurrence.
     - `suggestedPlacement`: `type: 'string'`, `enum: ['summary', 'skills', 'experience_bullet', 'title', 'multiple']` — reuses the exact same enum values as `missingKeywords[].suggestedPlacement`, telling the app where in the CV the fix applies.
   - Update `items.required` to `['term', 'issue', 'fix', 'actionType', 'suggestedPlacement']`.
   - Add a short `description` field to `actionType` and `suggestedPlacement` (following the style of neighboring properties), e.g.:
     - `actionType`: `"'add' if the fix should be inserted as a new term, 'replace' if it should replace the existing term wherever it appears"`.
     - `suggestedPlacement`: `"Where in the resume this acronym fix applies"`.

2. **Shared types update** (`packages/shared/datatypes/src/lib/datatypes.ts`):
   - Extend `KeywordGapAcronymIssue`:
     ```ts
     export type KeywordGapAcronymIssue = {
       term: string;
       issue: string;
       fix: string;
       actionType: 'add' | 'replace';
       suggestedPlacement:
         | 'summary'
         | 'skills'
         | 'experience_bullet'
         | 'title'
         | 'multiple';
     };
     ```
   - Extend `UserSelections` with `selectedAcronymIssues: string[]` (selection keyed by `term`, parallel to `selectedKeywords`).
   - Extend `BulletUserState` with the acronym-issue equivalents of the existing keyword fields:
     ```ts
     acronymEdits?: Array<{ originalTerm: string; editedText: string }>;
     acronymBulletPositions?: Array<{ term: string; experienceIndex: number }>;
     selectedAcronymIssues?: string[];
     ```

3. **Frontend — `keyword-gap.ts` / `.html`** (presentational component): replicate the full "Missing Keywords" interaction pattern for "Acronym issues":
   - New inputs: `selectedAcronymIssues = input<string[]>([])`, `acronymEdits = input<Map<string, string>>(new Map())`, `activeAcronymEditKey = input<string | null>(null)`, `editedAcronymText = input<string>('')`, `acronymBulletPositions = input<Map<string, number>>(new Map())`. Reuses the existing `experiencePositions` input.
   - New outputs: `acronymIssueToggled = output<string>()`, `acronymEditStarted = output<string>()`, `acronymEditSaved = output<{ key: string; text: string }>()`, `acronymEditCancelled = output<void>()`, `acronymEditTextChanged = output<string>()`, `acronymBulletPositionSelected = output<{ term: string; experienceIndex: number | null }>()`.
   - New helper methods paralleling the keyword ones: `isAcronymSelected(term)`, `toggleAcronymIssue(term)`, `isEditingAcronym(term)`, `isEditedAcronym(term)`, `getAcronymDisplayText(term)`, `getAcronymPosition(term)`, `onAcronymPositionChange(term, value)`.
   - Template: replace the current read-only `<li>` block (lines ~537-582 of `keyword-gap.html`) with a version matching the Missing Keywords markup:
     - Checkbox bound to `isAcronymSelected(item.term)`, emitting `acronymIssueToggled`.
     - Label showing `getAcronymDisplayText(item.term)` (falls back to `item.fix` when not edited — see Behavior below).
     - A badge showing `item.actionType` (uppercase, small pill — same visual treatment as the `suggestedPlacement` badge on Missing Keywords) and a badge showing `item.suggestedPlacement.replace('_', ' ')`.
     - "Edit" button (hidden while editing) that emits `acronymEditStarted`.
     - While editing: text input bound to `editedAcronymText()`, emitting `acronymEditTextChanged` on input, with Save/Cancel buttons emitting `acronymEditSaved` / `acronymEditCancelled`.
     - `item.issue` shown as descriptive text (replacing the current plain `<p>`), still shown when not editing.
     - When `isAcronymSelected(item.term)` and `item.suggestedPlacement === 'experience_bullet'`: show the same experience-position `<select>` as Missing Keywords, bound to `getAcronymPosition(item.term)`, emitting `acronymBulletPositionSelected`.
   - Keep the existing expand/collapse toggle (`isAcronymIssuesExpanded`, `toggleAcronymIssues()`) unchanged.

4. **Frontend — `cv-optimization.ts`** (parent smart component):
   - New signals: `readonly acronymEdits = signal<Map<string, string>>(new Map())`, `readonly activeAcronymEditKey = signal<string | null>(null)`, `readonly editedAcronymText = signal<string>('')`, `readonly acronymBulletPositions = signal<Map<string, number>>(new Map())`.
   - Extend the `selections` signal's initial value and all reset points with `selectedAcronymIssues: []`.
   - New handlers paralleling `onKeywordToggled` / `onKeywordEditStarted` / `onKeywordEditTextChanged` / `onKeywordEditCancelled` / `onKeywordEditSaved` / `onKeywordBulletPositionSelected`:
     - `onAcronymIssueToggled(term: string)`
     - `onAcronymEditStarted(term: string)` — default edit text seeds from `item.fix` (the acronym's suggested fix), not from a `recommendation` regex match (acronym issues have no `recommendation` field).
     - `onAcronymEditTextChanged(text: string)`
     - `onAcronymEditCancelled()`
     - `onAcronymEditSaved(event: { key: string; text: string })`
     - `onAcronymBulletPositionSelected(event: { term: string; experienceIndex: number | null })`
   - Wire these into the `app-keyword-gap` binding in `cv-optimization.html` and pass the new inputs (`selectedAcronymIssues`, `acronymEdits`, `activeAcronymEditKey`, `editedAcronymText`, `acronymBulletPositions`).
   - Update `mergedCv` computed to pass the new state through to `applySelectionsToCV()`.
   - Update `persistBulletState()` to serialize `acronymEdits`, `acronymBulletPositions`, and `selections().selectedAcronymIssues` into the `BulletUserState` object, and update the load/rehydration logic (around line 693-721) to restore them symmetrically.
   - Update all `selections` reset points (e.g. lines 777, 790, 793) to also reset the new acronym signals.

5. **Frontend — `apply-selections.ts`**: extend `applySelectionsToCV()` with two new parameters, `acronymEdits: Map<string, string> = new Map()` and `acronymBulletPositions: Map<string, number> = new Map()`, plus read `keywordResult.acronymIssues` and `selections.selectedAcronymIssues`. For each selected acronym term:
   - Resolve `displayText = acronymEdits.get(term) ?? entry.fix`.
   - Branch on `entry.actionType`:
     - `'add'`: same placement logic as missing keywords — if `suggestedPlacement` is `'skills'` or `'multiple'` (or falsy), push `displayText` onto `clone.skills` (de-duplicated case-insensitively, same as today); if `'experience_bullet'`, push `displayText` as a new bullet at `acronymBulletPositions.get(term)` (bounds-checked exactly like the keyword flow).
     - `'replace'`: find and replace the first case-insensitive occurrence of `entry.term` with `displayText` in the field(s) implied by `suggestedPlacement`:
       - `'skills'`: replace the matching entry in `clone.skills`.
       - `'experience_bullet'`: replace the substring `entry.term` with `displayText` inside the bullet at `acronymBulletPositions.get(term)` (bounds-checked); if no position chosen, skip.
       - `'summary'`: replace the substring in `clone.summary`.
       - `'title'`: replace the substring in the current experience entry's `title` is ambiguous (there's no single "title" field on `CvStructuredData` guaranteed to be the CV title) — see Assumptions; default to replacing in `clone.summary` if a dedicated title field isn't found, otherwise treat like `'multiple'`.
       - `'multiple'`: replace the substring across `clone.summary`, all `clone.skills` entries, and all experience bullets wherever `entry.term` occurs (case-insensitive, whole-array scan).

### Out of scope

- Changing behavior of Missing Keywords, Underweighted Keywords, or Fabrication Warnings sections.
- Any change to `matchScoreBreakdown`'s required status (verify current state but do not alter unless it was accidentally omitted from the same array being edited).
- Backfilling/migrating historical `OptimizationResult.structuredOutput` rows that lack `actionType`/`suggestedPlacement` on existing acronym issues (see Edge Cases — handled defensively at read time instead).
- Any change to `PromptVersion` versioning strategy (this is a content change to the seed data at the current active version, not a new prompt version) — confirm with the team whether this warrants a version bump per existing conventions before merging (see Assumptions).

## Behavior

1. When a new Keyword Gap analysis result includes `acronymIssues`, each item now also carries `actionType` (`'add'` | `'replace'`) and `suggestedPlacement` (same enum as missing keywords).
2. In the "Acronym issues" panel, each item renders with a checkbox (unchecked by default), the acronym `term` as the label, an `actionType` badge, a `suggestedPlacement` badge, the `issue` description text, and — when not selected/edited — the suggested `fix` shown as before.
3. Checking the checkbox selects the acronym issue for inclusion in the optimized CV (`onAcronymIssueToggled`).
4. Clicking "Edit" opens an inline text input pre-filled with the current display text (`acronymEdits.get(term) ?? item.fix`), with Save/Cancel actions — identical UX to Missing Keywords editing.
5. If the item's `suggestedPlacement === 'experience_bullet'` and the item is selected, an experience-position `<select>` appears, letting the user choose which experience entry the fix should be added to or replaced within.
6. On save (`mergedCv` recompute via `applySelectionsToCV`), for each selected acronym issue:
   - `actionType: 'add'` inserts the (possibly user-edited) fix text into the resume at the location implied by `suggestedPlacement`.
   - `actionType: 'replace'` finds the original `term` in the resume at the location implied by `suggestedPlacement` and replaces it with the (possibly user-edited) fix text.
7. Selections, edits, and bullet positions persist via `persistBulletState()` into `OptimizationResult.userEditedOutput` and are restored on reload, matching the existing Missing Keywords persistence flow.

## Edge Cases

- **Existing/historical results without `actionType`/`suggestedPlacement`** (rows created before this change): treat a missing `actionType` as non-actionable — do not render checkbox/Edit controls for that item (fall back to today's read-only rendering) rather than crashing or defaulting silently to `'add'`.
- **`replace` with no match found**: if `entry.term` is not found (case-insensitive) in the target field(s) for the chosen `suggestedPlacement`, no replacement happens (leave CV unchanged for that item) — do not fall back to appending.
- **`experience_bullet` placement without a chosen position**: same as Missing Keywords — show the "Pick a position to include this in your CV" warning; nothing is applied to `mergedCv` until a position is chosen.
- **Duplicate `term` values** in `acronymIssues` (unlikely but possible): selection/edit state is keyed by `term` string, same collision behavior as `selectedKeywords`/`keywordEdits` today (last one wins in the Map).
- **Empty edited text on Save**: mirror Missing Keywords — trim and ignore save if the trimmed text is empty.

## Data / API

- No new REST endpoints. No Prisma schema (migration) changes — `outputSchema` and `structuredOutput`/`userEditedOutput` are all `Json?`/`String?` columns already.
- Changed files:
  - `apps/opticv-be/prisma/seed.ts` — `input_schema.required` + `acronymIssues.items` properties/required.
  - `packages/shared/datatypes/src/lib/datatypes.ts` — `KeywordGapAcronymIssue`, `UserSelections`, `BulletUserState`.
  - `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` and `.html`.
  - `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` and its template.
  - `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`.
- After the seed change, the database seed must be re-run (`npm exec prisma db seed` or equivalent existing seed script) for the updated prompt schema to take effect for new analyses; existing `PromptVersion` rows are not auto-updated by an app rebuild.

## Assumptions

- `actionType` and `suggestedPlacement` use lowercase string-literal-union types (`'add' | 'replace'`, and the existing `suggestedPlacement` union), per user decision — consistent with all other `KeywordGapResult` sub-fields, not a real TS/Prisma enum.
- Full parity with the Missing Keywords UX (checkbox + inline edit + position picker) was explicitly requested, rather than a simpler checkbox-only flow.
- `suggestedPlacement: 'title'` has no unambiguous single target field on `CvStructuredData`; pending confirmation of the exact CV data model, this spec defaults `'title'` handling to the same broad replace behavior as `'multiple'`. Flag for review during implementation once `CvStructuredData`'s shape is inspected directly.
- Whether this schema change requires bumping `PromptVersion.version` (e.g. `'1.0.0'` → `'1.1.0'`) versus editing the active version in place is left to existing project convention for prompt-schema edits — not specified in the raw task, and not investigated as part of this spec since it doesn't affect app code behavior either way.
- Historical `OptimizationResult` rows with acronym issues lacking the new fields are handled defensively (rendered read-only) rather than migrated.

## Acceptance (DEV)

- `npm exec nx build opticv-be`, `npm exec nx build opticv-web`, and `npm exec nx build datatypes` all pass.
- `npm exec nx typecheck opticv-web` and `npm exec nx typecheck opticv-be` pass with no `any` workarounds.
- `npm exec nx lint opticv-web` and `npm exec nx lint opticv-be` pass.
- Unit tests added/updated for:
  - `applySelectionsToCV()` — both `add` and `replace` action types, across `skills`, `experience_bullet`, `summary`, and `multiple` placements, plus the "no match found" edge case.
  - `keyword-gap.ts` component — selection toggle, edit start/save/cancel, position selection emit the correct outputs.
- Manual verification in the running app (`nx serve opticv-web` + `nx serve opticv-be`, after re-seeding): generate a Keyword Gap analysis with acronym issues, select one with `actionType: 'add'` and one with `'replace'`, verify the optimized CV preview reflects both correctly, and verify selections survive a page reload.
- No breaking changes to Missing Keywords, Underweighted Keywords, or Fabrication Warnings behavior.
