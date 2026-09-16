# Implementation Plan

Task ID: 101-keyword-gap-acronym-issues

Source: `02-spec.md` (review: PASS WITH ISSUES, `03-spec-review.md`)

This plan sequences the work so each step builds/typechecks in isolation: shared types first, then backend seed data, then the pure CV-merge function, then the presentational component, then the smart parent component, then tests.

---

## Step 1 — Shared types (`packages/shared/datatypes/src/lib/datatypes.ts`)

1. Extend `KeywordGapAcronymIssue` (currently `term`, `issue`, `fix`) with:
   - `actionType: 'add' | 'replace';`
   - `suggestedPlacement: 'summary' | 'skills' | 'experience_bullet' | 'title' | 'multiple';`
   - Since historical rows may lack these fields (Edge Cases), keep both as **optional** (`actionType?:`, `suggestedPlacement?:`) so `KeywordGapAcronymIssue` accurately models both new and historical data without a second type. Non-actionable rendering (Step 4) branches on `item.actionType` being `undefined`.
2. Extend `UserSelections` with `selectedAcronymIssues: string[];` (non-optional, parallel to `selectedKeywords`, since this signal always has a defined initial value in `cv-optimization.ts`).
3. Extend `BulletUserState` with (all optional, matching the existing `keywordEdits?`/`keywordBulletPositions?`/`selectedKeywords?` pattern for backward-compatible JSON parsing of older persisted rows):
   - `acronymEdits?: Array<{ originalTerm: string; editedText: string }>;`
   - `acronymBulletPositions?: Array<{ term: string; experienceIndex: number }>;`
   - `selectedAcronymIssues?: string[];`
4. Build: `npm exec nx build datatypes`.

---

## Step 2 — Backend seed data (`apps/opticv-be/prisma/seed.ts`)

1. Locate the `KEYWORD_GAP` prompt version block (`input_schema` around the `acronymIssues` property).
2. Add `'acronymIssues'` to the top-level `required` array (alongside `matchScore`, `matchedKeywords`, `missingKeywords`, `underweightedKeywords`, `fabricationWarnings`; `matchScoreBreakdown` stays excluded — confirmed not required today).
3. In `acronymIssues.items`:
   - Change `required` from `['term', 'issue', 'fix']` to `['term', 'issue', 'fix', 'actionType', 'suggestedPlacement']`.
   - Add `actionType` property: `{ type: 'string', enum: ['add', 'replace'], description: "'add' if the fix should be inserted as a new term, 'replace' if it should replace the existing term wherever it appears" }`.
   - Add `suggestedPlacement` property: `{ type: 'string', enum: ['summary', 'skills', 'experience_bullet', 'title', 'multiple'], description: 'Where in the resume this acronym fix applies' }`.
4. Do not touch any other `PromptType` block or the `matchScoreBreakdown` required status.
5. Re-seed after merge: `npm exec prisma db seed` (or the project's existing seed script) — note this in the PR description; existing `PromptVersion` rows are not auto-updated by rebuild.
6. Confirm with the team whether this content change warrants a `PromptVersion.version` bump (`'1.0.0'` → `'1.1.0'`) per existing convention before merging (open item from spec Assumptions — check `apps/opticv-be/prisma/seed.ts` history/convention for other prompt edits, or ask if unclear; do not guess silently).

---

## Step 3 — `apply-selections.ts` (pure function)

File: `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`

1. Add two new parameters to `applySelectionsToCV()`, appended after `keywordBulletPositions` to preserve existing call-site argument order:
   - `acronymEdits: Map<string, string> = new Map()`
   - `acronymBulletPositions: Map<string, number> = new Map()`
2. Add a new block (after the existing `selectedKeywords`/`missingKeywords` block, operating on `clone` in place) that:
   - Reads `selections.selectedAcronymIssues` and `keywordResult?.acronymIssues`.
   - Skips entirely if `selections.selectedAcronymIssues.length === 0` or `!keywordResult`.
   - For each selected `term`:
     - Find `entry = keywordResult.acronymIssues.find((a) => a.term === term)`; skip if not found or `entry.actionType` is undefined (historical/non-actionable row — Edge Cases rule).
     - `displayText = acronymEdits.get(term) ?? entry.fix`.
     - Branch on `entry.actionType`:
       - **`'add'`**: mirror the missing-keywords `'add'` logic exactly —
         - `'skills'` / `'multiple'` / falsy placement: push `displayText` onto `clone.skills`, de-duplicated case-insensitively against the running `existing` set (reuse the same `Set<string>` pattern, seeded once before the loop, shared with or separate from the missing-keywords `existing` set — keep separate to avoid cross-feature coupling since acronym and keyword additions are independent user actions).
         - `'experience_bullet'`: read `acronymBulletPositions.get(term)`; skip if `undefined` or out of bounds (`< 0` or `>= clone.experience.length`); otherwise push `displayText` as a new bullet.
       - **`'replace'`**: locate and replace the first case-insensitive occurrence of `entry.term` with `displayText` in the target field(s), no-op if no match (Edge Cases — do not append as fallback):
         - `'skills'`: find the first `clone.skills[i]` whose value case-insensitively equals or contains `entry.term`; the spec says "replace the matching entry" — implement as: find the skill entry that equals `entry.term` case-insensitively and replace that array element with `displayText` (whole-entry replace, consistent with how skills are single terms, not free text to substring-replace within).
         - `'experience_bullet'`: read `acronymBulletPositions.get(term)`; skip (no-op) if `undefined` or out of bounds; if the bullet at that index contains `entry.term` (case-insensitive substring match), replace that substring occurrence with `displayText` using a case-insensitive single-occurrence replace; if no match in that bullet, no-op per Edge Cases.
         - `'summary'`: if `clone.summary` contains `entry.term` case-insensitively, replace the first occurrence; else no-op.
         - `'title'`: per spec Assumptions, treat identically to `'multiple'` (no dedicated CV-level title field exists on `CvStructuredData` — verified: `CvStructuredData` has no top-level `title`, only `CvExperienceItem.title` per entry, and the spec explicitly defers to `'multiple'`-style broad replace for this case).
         - `'multiple'` (and `'title'`, per above): scan and case-insensitively replace the first occurrence of `entry.term` in `clone.summary`, then in each `clone.skills[i]`, then in each bullet of each `clone.experience[i].bullets`, independently per field (each field is checked for its own match; a miss in one field does not block replacement in another — resolves spec Non-Critical Issue #3 in favor of independent per-field scanning, consistent with how the spec already describes `'multiple'` for `add`).
   - Implement the case-insensitive single-occurrence "find and replace substring" as a small local helper (e.g. `replaceFirstCaseInsensitive(text: string, term: string, replacement: string): string | null`, returning `null` when no match so call sites can no-op cleanly) — keep it colocated in `apply-selections.ts`, not a new shared util file, since it's only used here.
3. Do not alter any existing parameter order for the first 10 parameters or any existing behavior for keywords/bullets/summary.

---

## Step 4 — `keyword-gap.ts` / `.html` (presentational component)

File: `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/`

### `keyword-gap.ts`

1. New inputs (mirroring the keyword equivalents exactly):
   - `readonly selectedAcronymIssues = input<string[]>([]);`
   - `readonly acronymEdits = input<Map<string, string>>(new Map());`
   - `readonly activeAcronymEditKey = input<string | null>(null);`
   - `readonly editedAcronymText = input<string>('');`
   - `readonly acronymBulletPositions = input<Map<string, number>>(new Map());`
   - Reuse existing `experiencePositions` input — no new input needed for positions list.
2. New outputs:
   - `readonly acronymIssueToggled = output<string>();`
   - `readonly acronymEditStarted = output<string>();`
   - `readonly acronymEditSaved = output<{ key: string; text: string }>();`
   - `readonly acronymEditCancelled = output<void>();`
   - `readonly acronymEditTextChanged = output<string>();`
   - `readonly acronymBulletPositionSelected = output<{ term: string; experienceIndex: number | null }>();`
3. New methods (paralleling `isSelected`/`toggleKeyword`/`isEditingKeyword`/`isEditedKeyword`/`getKeywordDisplayText`/`getKeywordPosition`/`onPositionChange`):
   - `isAcronymSelected(term: string): boolean` → `this.selectedAcronymIssues().includes(term)`
   - `toggleAcronymIssue(term: string): void` → `this.acronymIssueToggled.emit(term)`
   - `isEditingAcronym(term: string): boolean` → `this.activeAcronymEditKey() === term`
   - `isEditedAcronym(term: string): boolean` → `this.acronymEdits().has(term)`
   - `getAcronymDisplayText(term: string): string` → `this.acronymEdits().get(term) ?? item.fix` — **note**: unlike keyword display text (which falls back to the keyword string itself), this must fall back to the item's `fix`, per spec Behavior §4. Since the method only receives `term`, look up the item from `this.result().acronymIssues` inside the method: `this.result().acronymIssues.find((a) => a.term === term)?.fix ?? term` as the fallback chain, i.e. `this.acronymEdits().get(term) ?? this.result().acronymIssues.find((a) => a.term === term)?.fix ?? term`.
   - `getAcronymPosition(term: string): number | null` → `this.acronymBulletPositions().get(term) ?? null`
   - `onAcronymPositionChange(term: string, value: string): void` → same pattern as `onPositionChange`, emitting `acronymBulletPositionSelected`.
4. Do not modify `isAcronymIssuesExpanded` / `toggleAcronymIssues` — keep unchanged.

### `keyword-gap.html`

1. Replace the existing read-only `<li>` block inside the "Acronym Issues" `@for` loop (currently ~lines 564–578) with a version structurally matching the Missing Keywords `<li>` markup (~lines 91–228), adapted to acronym fields and the `actionType` non-actionable fallback:
   - Wrap in the same conditional-border `<li>` pattern: `border-emerald-600 bg-emerald-100/40` when `isAcronymSelected(item.term)`, else `border-(--border-subtle)`.
   - **Non-actionable fallback** (Edge Cases — historical rows lacking `actionType`): `@if (item.actionType)` gates the entire interactive block (checkbox, Edit button, badges for `actionType`); `@else` renders today's existing read-only markup (term, `issue`, `fix`) unchanged.
   - When `item.actionType` is present:
     - Checkbox: `[id]="'acr-' + item.term"`, `[checked]="isAcronymSelected(item.term)"`, `(change)="toggleAcronymIssue(item.term)"`, `class="accent-primary"`, `[attr.aria-label]="'Select acronym issue ' + item.term"`.
     - Label: `[for]="'acr-' + item.term"`, text `{{ getAcronymDisplayText(item.term) }}`.
     - `actionType` badge: uppercase small pill, e.g. `<span class="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 uppercase">{{ item.actionType }}</span>` (pill styling consistent with the existing `Required`/`Edited` badges already in this file, since spec review flagged there's no pre-existing `actionType`-style badge to copy verbatim).
     - `suggestedPlacement` badge: same markup/classes as the Missing Keywords one — `<span class="text-xs bg-(--neutral-100) text-surface-600 rounded px-1.5 py-0.5 ml-auto capitalize" title="Suggested placement">{{ item.suggestedPlacement.replace('_', ' ') }}</span>`.
     - "Edit" button: same `p-button` markup as Missing Keywords, hidden via `@if (!isEditingAcronym(item.term))`, emitting `acronymEditStarted.emit(item.term)`.
     - Editing block: `@if (isEditingAcronym(item.term))` — text input bound to `editedAcronymText()`, `(input)` emits `acronymEditTextChanged`, Save button emits `acronymEditSaved.emit({ key: item.term, text: editedAcronymText() })`, Cancel emits `acronymEditCancelled.emit()`.
     - Non-editing block: `@if (!isEditingAcronym(item.term))` shows `item.issue` as the descriptive `<p>` (replacing today's always-shown `issue` `<p>`), followed by the `fix` line only if not selected/edited (per Behavior §2: fix shown "as before" when not selected/edited — keep the existing `@if (item.fix)` "Fix:" `<p>` here, but suppress it once `isAcronymSelected(item.term)` is true and text is being applied, matching how Missing Keywords doesn't show a redundant preview once selected — confirm this suppression condition against Missing Keywords' actual behavior: Missing Keywords always shows `item.recommendation` regardless of selection, so for consistency, **keep the `fix` line always visible when not editing**, not conditionally hidden on selection — this is the simpler, parity-correct reading of Behavior §2's "shown as before").
     - Position picker: `@if (isAcronymSelected(item.term) && item.suggestedPlacement === 'experience_bullet')` — identical `<select>` markup to Missing Keywords, bound to `getAcronymPosition(item.term)`, emitting `acronymBulletPositionSelected.emit({ term: item.term, experienceIndex })` via a new `onAcronymPositionChange`.
     - "Pick a position" warning: `@if (isAcronymSelected(item.term) && getAcronymPosition(item.term) === null)` under the same conditions as Missing Keywords.
2. Keep the outer collapsible section (`toggleAcronymIssues()`, `isAcronymIssuesExpanded()`, header, count badge) unchanged.
3. Do not touch Missing Keywords, Matched Keywords, Underweighted Keywords, or Fabrication Warnings markup.

---

## Step 5 — `cv-optimization.ts` (smart parent component)

File: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

1. New signals, declared alongside the existing keyword signals (~line 253-256):
   - `readonly acronymEdits = signal<Map<string, string>>(new Map());`
   - `readonly activeAcronymEditKey = signal<string | null>(null);`
   - `readonly editedAcronymText = signal<string>('');`
   - `readonly acronymBulletPositions = signal<Map<string, number>>(new Map());`
2. Update the `selections` signal's initial value (~line 215-220) to include `selectedAcronymIssues: []`.
3. Update `mergedCv` computed (~line 308-324) to pass `this.acronymEdits()` and `this.acronymBulletPositions()` as the 11th/12th arguments to `applySelectionsToCV()`.
4. New handlers, placed after the existing `onKeywordBulletPositionSelected` (~line 1000), mirroring each keyword handler's logic 1:1 except for edit-seed source:
   - `onAcronymIssueToggled(term: string): void` — toggle `term` in/out of `selections().selectedAcronymIssues`, same immutable-update pattern as `onKeywordToggled`; call `this.persistBulletState()`.
   - `onAcronymEditStarted(term: string): void` — set `activeAcronymEditKey`; if `acronymEdits().has(term)`, seed `editedAcronymText` from it and return; else seed from `this.keywordGapResult()?.acronymIssues.find((a) => a.term === term)?.fix ?? term` (per spec §4.b: "default edit text seeds from `item.fix`... not from a `recommendation` regex match" — no regex parsing needed here, unlike `onKeywordEditStarted`).
   - `onAcronymEditTextChanged(text: string): void` — `this.editedAcronymText.set(text)`.
   - `onAcronymEditCancelled(): void` — reset `activeAcronymEditKey` and `editedAcronymText`.
   - `onAcronymEditSaved(event: { key: string; text: string }): void` — trim; if empty, return (no-op, per Edge Cases); else update `acronymEdits` map (delete entry if trimmed text equals the original `fix` for that term — mirrors keyword's "equals original key" cleanup, but compare against `entry.fix`, not `event.key`, since `event.key` here is the `term`, not the display text); reset edit state; call `persistBulletState()`.
   - `onAcronymBulletPositionSelected(event: { term: string; experienceIndex: number | null }): void` — same map update pattern as `onKeywordBulletPositionSelected`; call `persistBulletState()`.
5. Update `persistBulletState()` (~line 1125-1166):
   - Build `acronymEditsArr: Array<{ originalTerm: string; editedText: string }>` from `this.acronymEdits()`.
   - Build `acronymBulletPositionsArr: Array<{ term: string; experienceIndex: number }>` from `this.acronymBulletPositions()`.
   - Add `acronymEdits: acronymEditsArr`, `acronymBulletPositions: acronymBulletPositionsArr`, `selectedAcronymIssues: this.selections().selectedAcronymIssues` to the `BulletUserState` object being saved (this is the existing `BULLET_UPGRADE` persistence row — acronym state rides along with it exactly as keyword state already does, per spec Data/API section: no new endpoint).
6. Update the load/rehydration logic inside the `BULLET_UPGRADE` branch (~line 675-728):
   - After the existing `keywordBulletPositions` restoration, add symmetric restoration: parse `state.acronymEdits ?? []` into a `Map<string, string>` keyed by `originalTerm` → `acronymEdits.set(...)`; parse `state.acronymBulletPositions ?? []` into a `Map<string, number>` keyed by `term` → `acronymBulletPositions.set(...)`; restore `selectedAcronymIssues` via the same `this.selections.update((s) => ({ ...s, selectedAcronymIssues: state.selectedAcronymIssues ?? [] }))` (merge into the same `selections.update` call already restoring `selectedBullets`/`selectedKeywords`, not a separate call).
7. Update all `selections` reset points:
   - `runOptimization()` (~line 773-793): add `selectedAcronymIssues: []` to the `selections.set({...})` call, and add `this.acronymEdits.set(new Map())`, `this.activeAcronymEditKey.set(null)`, `this.editedAcronymText.set('')`, `this.acronymBulletPositions.set(new Map())` alongside the existing keyword resets.
   - Any other full-reset point found by searching for `selectedKeywords: []` — verify at implementation time there isn't a second reset path beyond `runOptimization()` (grep confirmed only one `selections.set(...)` reset call site as of spec time; re-verify since `03-spec-review.md` referenced lines 777/790/793 which correspond to this same block).
8. Update `cv-optimization.html` (~line 199-213) `app-keyword-gap` binding: add the five new input bindings (`[selectedAcronymIssues]`, `[acronymEdits]`, `[activeAcronymEditKey]`, `[editedAcronymText]`, `[acronymBulletPositions]`) and six new output bindings (`(acronymIssueToggled)`, `(acronymEditStarted)`, `(acronymEditSaved)`, `(acronymEditCancelled)`, `(acronymEditTextChanged)`, `(acronymBulletPositionSelected)`), wired to the Step 5.4 handlers.

---

## Step 6 — Tests

1. `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`:
   - Add a base `KeywordGapResult.acronymIssues` fixture with at least two entries (one `actionType: 'add'`, one `actionType: 'replace'`) covering different `suggestedPlacement` values.
   - Test cases (new `describe` block, e.g. `describe('acronym issues', ...)`):
     - `'add'` + `'skills'`: pushes fix text into `clone.skills`, de-duplicated case-insensitively.
     - `'add'` + `'experience_bullet'` with a chosen position: pushes bullet at correct index.
     - `'add'` + `'multiple'`/falsy: pushes to skills (same as missing-keyword fallback).
     - `'replace'` + `'skills'`: replaces matching skill entry.
     - `'replace'` + `'experience_bullet'`: replaces substring in the bullet at the chosen position.
     - `'replace'` + `'summary'`: replaces substring in `clone.summary`.
     - `'replace'` + `'multiple'`: replaces substring across summary, skills, and bullets independently.
     - `'replace'` + no match found: CV unchanged for that item (Edge Case).
     - `acronymEdits` override: user-edited text used instead of `entry.fix`.
     - Historical item with `actionType` undefined and `term` in `selectedAcronymIssues`: no-op (skipped), does not throw.
2. `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts`:
   - Extend `MOCK_RESULT.acronymIssues` fixture with `actionType`/`suggestedPlacement` fields.
   - New test cases: `toggleAcronymIssue` emits `acronymIssueToggled` with correct term; `isAcronymSelected` reflects `selectedAcronymIssues` input; edit start/save/cancel emit correct outputs/payloads; `getAcronymDisplayText` falls back to `fix` then `term`; position select emits `acronymBulletPositionSelected` with parsed index or `null`.
3. Run: `npm exec nx test opticv-web`, `npm exec nx test opticv-be` (no backend logic changed, but run per Acceptance criteria).

---

## Step 7 — Full verification (Acceptance criteria from spec)

1. `npm exec nx build datatypes`
2. `npm exec nx build opticv-be`
3. `npm exec nx build opticv-web`
4. `npm exec nx typecheck opticv-web` — confirm no `any` introduced.
5. `npm exec nx typecheck opticv-be`
6. `npm exec nx lint opticv-web`
7. `npm exec nx lint opticv-be`
8. `npm exec nx test opticv-web`
9. Manual verification (`nx serve opticv-web` + `nx serve opticv-be`, after re-seeding):
   - Generate a Keyword Gap analysis with acronym issues.
   - Select one `actionType: 'add'` item and one `'replace'` item, verify optimized CV preview reflects both.
   - Reload the page; verify selections/edits/positions survive.
   - Confirm Missing Keywords, Underweighted Keywords, and Fabrication Warnings sections are visually and behaviorally unchanged.

---

## Files Changed Summary

- `packages/shared/datatypes/src/lib/datatypes.ts` — extend `KeywordGapAcronymIssue`, `UserSelections`, `BulletUserState`.
- `apps/opticv-be/prisma/seed.ts` — `KEYWORD_GAP` `outputSchema.input_schema`: `required` array + `acronymIssues.items` properties/required.
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` — new params, new acronym-issue branch, local replace helper.
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts` — new test cases.
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` — new inputs/outputs/methods.
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` — replace read-only acronym `<li>` with interactive version.
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts` — new test cases.
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` — new signals, handlers, `mergedCv` wiring, `persistBulletState()`/rehydration updates, reset-point updates.
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` — new `app-keyword-gap` input/output bindings.

No new files. No Prisma migration. No new REST endpoints.
