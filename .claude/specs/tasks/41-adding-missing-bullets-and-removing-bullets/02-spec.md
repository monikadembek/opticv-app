# Task Specification

## Source

Azure DevOps Task: 41 — Bullet upgrades: add missing bullets suggestions and remove recommended_cut bullets

## Goal

Extend the bullet upgrade UI and state model with two new interaction types:

1. **Missing bullets** — user can select a `BulletMissingSuggestion`, optionally inline-edit its text, and apply it to the optimized CV (appended to the matching position's bullet list).
2. **Recommended cut** — user can select a `recommend_cut` bullet to mark it for removal from the optimized CV.

All user choices must be persisted to the backend via the existing `PATCH /api/optimizations/:id/user-output` endpoint.

## Context

This feature lives entirely within the `cv-optimization` feature module:

- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` — parent smart component
- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/` — presentational component
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` — CV merge logic
- `packages/shared/datatypes/src/lib/datatypes.ts` — shared types used by both FE and BE

The persistence mechanism (`BulletUserState` → `PATCH /api/optimizations/:id/user-output`) already exists from Task 40 and is extended here with new fields.

## Scope

### In scope

- Checkbox UI on `BulletMissingSuggestion` items (select to add bullet to CV)
- Inline edit UI on selected `BulletMissingSuggestion` items (same pattern as rewrite editing)
- Checkbox UI on `recommend_cut` bullets (select to remove from CV)
- Extending `BulletUserState` with `selectedMissingBullets` and `removedBullets` fields
- Extending `applySelectionsToCV()` to handle additions and removals
- Persisting new state via the existing `PATCH` endpoint
- Restoring new state when `loadStoredOptimization()` runs

### Out of scope

- Any changes to the backend API beyond what the existing `PATCH /api/optimizations/:id/user-output` already provides
- Adding an `id` field to `BulletMissingSuggestion` in the AI prompt or schema
- Editing `recommend_cut` bullet text (only selection/deselection is needed)
- Reordering bullets

## Assumptions

- `forPosition + suggestedBullet` is sufficient as a composite key for missing bullet suggestions. Format: `"${suggestion.forPosition}|${suggestion.suggestedBullet}"`. This mirrors the existing `company|title|originalText` key pattern.
- `recommend_cut` is **opt-in**: bullet stays in the CV unless the user explicitly checks the removal checkbox.
- When a missing bullet is applied, it is appended to the **end** of the matching position's `bullets` array in the CV. Matching is done by finding the `experience` entry where the concatenation `"${title} at ${company}"` equals `suggestion.forPosition`. If no match is found, the bullet is skipped silently.
- Missing bullet edits are independent of the existing `bulletEdits` map (which covers `rewrite` bullets). A separate map is used: `missingBulletEdits: Map<string, string>`.

## Behavior

### 1. Missing Bullet Suggestions — selection

Each `BulletMissingSuggestion` card gains a checkbox at the top left.

- Unchecked by default.
- Checking adds a `MissingBulletSelectionKey` to `selectedMissingBullets`.
- Unchecking removes it.
- The card border highlights green when selected (same visual pattern as selected rewrite bullets).
- Triggers `persistBulletState()` (debounced 500 ms, same as bullet toggle).

### 2. Missing Bullet Suggestions — inline editing

The inline edit affordance (pencil icon + textarea) is available **only when the suggestion is selected**.

- When the suggestion is selected, a pencil icon appears next to the suggested bullet text.
- Clicking it opens a `<textarea>` pre-filled with the current display text (edited text if already edited, otherwise `suggestion.suggestedBullet`).
- User edits and clicks **Save** → stores the edited text in `missingBulletEdits` map under the composite key, closes editor, calls `persistBulletState()` immediately.
- User clicks **Cancel** → closes editor without saving.
- If the suggestion is deselected while an edit exists, the edit is **retained** in the map (same behaviour as rewrite edits).
- An "Edited" badge appears when `missingBulletEdits` has an entry for this key.

### 3. Recommend-cut bullets — selection

Each `recommend_cut` bullet card gains a checkbox.

- Unchecked by default (opt-in removal).
- Checking adds a `BulletSelectionKey` (using `{ company, title, originalText }`) to `removedBullets`.
- Unchecking removes it.
- When checked, the card border highlights red / amber to indicate pending removal.
- Triggers `persistBulletState()` (debounced 500 ms).

### 4. Persistence

`BulletUserState` is extended with two new optional fields (optional for backward compatibility with records saved before this task):

```ts
selectedMissingBullets: Array<{ forPosition: string; suggestedBullet: string; editedText?: string }>;
removedBullets: BulletSelectionKey[];
```

`persistBulletState()` builds `BulletUserState` as before, now also including:

- `selectedMissingBullets` — array of selected missing suggestions, each with `forPosition`, `suggestedBullet`, and `editedText` (omitted if not edited).
- `removedBullets` — array of `{ company, title, originalText }` for `recommend_cut` bullets the user chose to remove.

The serialized object is `JSON.stringify`'d and sent to `PATCH /api/optimizations/:id/user-output` (no backend changes required).

### 5. Restoring saved state

`loadStoredOptimization()` already parses `userEditedOutput` as `BulletUserState`. It is extended to:

- Populate `selectedMissingBullets` signal from `state.selectedMissingBullets ?? []`.
- Rebuild `missingBulletEdits` map from entries where `editedText` is present.
- Populate `removedBullets` signal from `state.removedBullets ?? []`.

### 6. CV merge — `applySelectionsToCV()`

Signature gains two new parameters:

```ts
missingBulletEdits: Map<string, string> = new Map(),
selectedMissingBullets: Array<{ forPosition: string; suggestedBullet: string }> = [],
removedBullets: BulletSelectionKey[] = [],
```

Logic additions (applied to the cloned CV):

**Removals (run first):**
For each entry in `removedBullets`, find the `experience` entry by `company` + `title`, then remove the bullet where `b.trim() === originalText.trim()`.

**Additions (run after removals):**
For each entry in `selectedMissingBullets`:
1. Find the matching `experience` entry by comparing `"${exp.title} at ${exp.company}"` to `forPosition`.
2. If found, resolve display text: `missingBulletEdits.get(key) ?? suggestedBullet`.
3. Append the text to `experience[idx].bullets`.

## Data / API

### Shared types (`datatypes.ts`)

**Extended `BulletUserState`:**

```ts
export type BulletUserState = {
  edits: Array<BulletEditKey & { editedText: string }>;
  selectedBullets: BulletSelectionKey[];
  selectedMissingBullets: Array<{
    forPosition: string;
    suggestedBullet: string;
    editedText?: string;
  }>;
  removedBullets: BulletSelectionKey[];
};
```

No other type changes required. No new API endpoints. No DB schema changes.

### Key identifier patterns

| Entity | Key format |
|---|---|
| Rewrite bullet (existing) | `"${company}\|${title}\|${originalText}"` |
| Missing bullet suggestion | `"${forPosition}\|${suggestedBullet}"` |
| Recommend-cut bullet | `{ company, title, originalText }` (same as `BulletSelectionKey`) |

## Frontend component changes

### `bullet-rewriter.ts`

New inputs:
- `selectedMissingBullets: Array<{ forPosition: string; suggestedBullet: string }>` — which missing suggestions are selected
- `missingBulletEdits: Map<string, string>` — edited text for missing suggestions
- `removedBullets: BulletSelectionKey[]` — which recommend_cut bullets are marked for removal

New outputs:
- `missingBulletToggled: OutputEmitterRef<{ forPosition: string; suggestedBullet: string }>` — fired when a missing bullet checkbox changes
- `missingBulletEditStarted: OutputEmitterRef<string>` — fired when pencil icon clicked on a missing bullet (emits composite key)
- `missingBulletEditSaved: OutputEmitterRef<{ key: string; text: string }>` — fired on Save
- `missingBulletEditCancelled: OutputEmitterRef<void>` — fired on Cancel
- `removedBulletToggled: OutputEmitterRef<BulletSelectionKey>` — fired when recommend_cut checkbox changes

New helper methods:
- `isMissingSelected(forPosition, suggestedBullet): boolean`
- `isMissingEdited(forPosition, suggestedBullet): boolean`
- `isMissingEditing(forPosition, suggestedBullet): boolean`
- `missingBulletKey(forPosition, suggestedBullet): string` — returns `"${forPosition}|${suggestedBullet}"`
- `getMissingDisplayText(forPosition, suggestedBullet): string`
- `isRemovedBullet(company, title, originalText): boolean`

The `activeBulletEditKey` input is reused for the missing-bullet editor (same signal, same pattern as rewrite editing). Only one editor can be open at a time across both bullet types.

### `bullet-rewriter.html`

**Missing Bullet Suggestions section** — replaces the current read-only card:

Each card gains:
- Checkbox (top-left) — calls `missingBulletToggled.emit(...)` on change
- Green border highlight when selected
- Pencil icon (visible only when selected and not editing) — calls `missingBulletEditStarted.emit(key)`
- "Edited" badge when `isMissingEdited()`
- Textarea + Save/Cancel buttons when `isMissingEditing()` (same markup pattern as rewrite editor)
- Display text resolves via `getMissingDisplayText()` when not editing
- The existing `rationale`, `questionToAskUser` text remains visible below

**Recommend-cut section** — replaces current read-only display:

The `@case ('recommend_cut')` block gains:
- Checkbox — calls `removedBulletToggled.emit(...)` on change
- Red/amber border highlight when checked (e.g. `border-red-400`)
- "Will be removed" label text when checked
- `aria-label` on checkbox: `"Remove bullet at ${position.title} — ${position.company}"`

### `cv-optimization.ts`

New signals:
- `selectedMissingBullets: Signal<Array<{ forPosition: string; suggestedBullet: string }>>` — initialized to `[]`
- `missingBulletEdits: Signal<Map<string, string>>` — initialized to `new Map()`
- `removedBullets: Signal<BulletSelectionKey[]>` — initialized to `[]`

New event handlers (wired to new BulletRewriter outputs):
- `onMissingBulletToggled(key)` — add/remove from `selectedMissingBullets`, call `persistSubject.next()`
- `onMissingBulletEditStarted(key)` — set `activeBulletEditKey` + load existing edit or suggestion text into `editedBulletText`
- `onMissingBulletEditSaved({ key, text })` — store in `missingBulletEdits`, close editor, call `persistBulletState()`
- `onMissingBulletEditCancelled()` — close editor (reuse `onBulletEditCancelled()` logic)
- `onRemovedBulletToggled(key)` — add/remove from `removedBullets`, call `persistSubject.next()`

`persistBulletState()` updated to include `selectedMissingBullets` and `removedBullets` in the serialized `BulletUserState`.

`loadStoredOptimization()` updated to restore `selectedMissingBullets`, `missingBulletEdits`, and `removedBullets` from parsed `BulletUserState`.

`mergedCv` computed updated to pass new parameters to `applySelectionsToCV()`.

## Edge Cases

- **`forPosition` does not match any CV experience entry** — the missing bullet is silently skipped in `applySelectionsToCV()`. The suggestion is still selectable in the UI; the user sees it in the review panel even if it won't land in the export.
- **Missing bullet selected then deselected** — it is removed from `selectedMissingBullets` but its edit (if any) remains in `missingBulletEdits`. This matches the existing behaviour for rewrite bullet edits.
- **`BulletUserState` loaded from backend without the new fields** (records saved before this task) — default to `[]` / `new Map()` for the new fields via `?? []`.
- **Only one editor open at a time** — `activeBulletEditKey` signal is shared across rewrite and missing-bullet editors. Opening either closes any currently open editor.
- **`recommend_cut` bullet not found in CV** — removal is a no-op in `applySelectionsToCV()`; the item may have already been removed or the text may not match exactly.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- Type check passes (`npm exec nx typecheck opticv-web`)
- Lint passes (`npm exec nx lint opticv-web`)
- Selecting a missing bullet suggestion and refreshing the page restores the selection
- Editing a missing bullet suggestion, saving, and refreshing restores the edited text
- Selecting a `recommend_cut` bullet for removal and refreshing restores the selection
- `applySelectionsToCV()` appends selected missing bullets to the correct position and removes selected `recommend_cut` bullets from the CV clone
- No existing Task 40 behaviour is broken (rewrite selection/editing/persistence)
- No `any` types introduced; all new code uses strict TypeScript
