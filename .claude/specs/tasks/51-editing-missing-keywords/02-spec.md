# Task Specification

## Source

Azure DevOps Task: 51 — Editing missing keywords

## Goal

Add inline editing capability to each missing keyword item in the `keyword-gap` component, following the same edit/save/cancel pattern already implemented for bullet upgrades in `bullet-rewriter`.

## Context

The CV Optimization feature (`apps/opticv-web/src/app/features/cv-optimization/`) displays keyword gap analysis results. The `keyword-gap` component lists missing keywords in two subsections: "Likely have — add to your CV" and "Skills to acquire or omit". Currently users can only select/deselect keywords via checkbox. Task 51 adds an **Edit** button per keyword that lets the user modify the keyword text and persist it via `saveUserOutput`.

The bullet-rewriter component is the reference implementation. The keyword editing pattern should mirror it as closely as possible.

## Scope

### In scope

- Add an **Edit** button to each missing keyword row (both subsections)
- When Edit is clicked: show a text input pre-filled with the current keyword text, and **Save** / **Cancel** buttons below it
- **Cancel** closes the edit section and restores the original (or last-saved edited) value
- **Save** persists the edited keyword text by calling `saveUserOutput` (same API call used for bullet edits)
- Show an "Edited" badge on the keyword row when an edit has been saved (similar to bullet-rewriter)
- Store keyword edits in a `Map<string, string>` keyed by the original keyword string
- One keyword can be in edit mode at a time (same constraint as bullets — `activeKeywordEditKey`)
- Persist keyword edits as part of `UserSelections` / the existing `saveUserOutput` state payload

### Out of scope

- Editing keywords in the "Present keywords" or "Nice-to-have keywords" sections
- Deleting keywords
- Adding new keywords
- Validating keyword text content (no length limit, no format checks)
- Undo/redo history beyond the single edit Map

## Behavior

1. Each missing keyword row (in both "Likely have" and "Skills to acquire or omit" subsections) displays an **Edit** button (icon or labeled button) to the right of the keyword text, visible at all times when not in edit mode.

2. Clicking **Edit** on a keyword:
   - Sets `activeKeywordEditKey` to that keyword's original string.
   - Populates `editedKeywordText` with the current display value (edited text if previously saved, otherwise original keyword string).
   - Hides the Edit button for that row and renders a text input below the keyword text.
   - Renders **Save** and **Cancel** buttons below the input.
   - If another keyword was already being edited, that one's edit section closes (only one active edit at a time).

3. User types in the input → updates `editedKeywordText` signal.

4. Clicking **Cancel**:
   - Clears `activeKeywordEditKey` (sets to `null`).
   - Resets `editedKeywordText` to `''`.
   - The keyword row reverts to its display state (no change to saved edits).

5. Clicking **Save**:
   - Stores `{ [originalKeyword]: editedKeywordText }` in `keywordEdits` Map.
   - Clears `activeKeywordEditKey` and `editedKeywordText`.
   - Calls `saveUserOutput` with the updated state (same mechanism as bullet edits).
   - The keyword row now shows the edited text and an "Edited" badge.

6. The edited keyword text is used in place of the original wherever the keyword appears in the missing keywords list.

## Edge Cases

- If `editedKeywordText` is empty or whitespace-only when Save is clicked, do not save — keep edit mode open (or show no badge). Treat as a no-op save.
- If user saves the same text as the original keyword, no "Edited" badge is shown (edit Map entry is removed or not added).
- On page reload, persisted edits are loaded from `saveUserOutput` payload and restored into `keywordEdits` Map (same hydration pattern as bullet edits).
- If a keyword is selected (checkbox) and then edited, both the selection and the edit persist independently.

## Data / API

**No new API endpoints or DB changes required.**

Edits are persisted as part of the existing `saveUserOutput` call:

```
POST /api/cv-optimization/:resultId/user-output
Body: JSON string of the full user state
```

The existing state payload (currently holds bullet edits, selected keywords, etc.) must be extended to include `keywordEdits`:

```typescript
// Add to the UserSelections / user output state type:
keywordEdits: Record<string, string>; // originalKeyword → editedText
```

**New signals in `cv-optimization.ts`:**

```typescript
readonly keywordEdits = signal<Map<string, string>>(new Map());
readonly activeKeywordEditKey = signal<string | null>(null);
readonly editedKeywordText = signal<string>('');
```

**New inputs on `keyword-gap` component:**

```typescript
readonly keywordEdits = input<Map<string, string>>(new Map());
readonly activeKeywordEditKey = input<string | null>(null);
readonly editedKeywordText = input<string>('');
```

**New outputs on `keyword-gap` component:**

```typescript
readonly keywordEditStarted = output<string>();         // emits originalKeyword
readonly keywordEditSaved = output<{ key: string; text: string }>();
readonly keywordEditCancelled = output<void>();
readonly keywordEditTextChanged = output<string>();
```

**Handler methods added to `cv-optimization.ts`** (mirroring `onBulletEdit*` handlers):

```typescript
onKeywordEditStarted(key: string): void
onKeywordEditTextChanged(text: string): void
onKeywordEditSaved(event: { key: string; text: string }): void
onKeywordEditCancelled(): void
```

**State persistence**: `keywordEdits` is serialized as `Record<string, string>` in the `saveUserOutput` JSON payload and hydrated back on load.

## Assumptions

- The original keyword string is unique enough to serve as the Map key (no two missing keywords share the same `keyword` value within a result).
- Edit UI follows the same component-level split as bullet-rewriter: state lives in `cv-optimization.ts`, `keyword-gap` is purely presentational.
- Styling and button design (Edit icon/label, Save/Cancel appearance) should match the bullet-rewriter UI for visual consistency.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- TypeScript strict mode passes (`npm exec nx typecheck opticv-web`)
- Lint passes (`npm exec nx lint opticv-web`)
- Edit button appears on each missing keyword row
- Clicking Edit shows text input pre-filled with current keyword text and Save/Cancel buttons
- Cancel closes edit section without changes
- Save persists the edit, shows "Edited" badge, calls `saveUserOutput`
- Only one keyword in edit mode at a time
- Edited keyword text is displayed in place of original
- Edits survive page reload (hydrated from API response)
- Empty/whitespace Save does not persist
- Saving unchanged text does not show "Edited" badge
- No breaking changes to existing keyword selection or other CV optimization features
