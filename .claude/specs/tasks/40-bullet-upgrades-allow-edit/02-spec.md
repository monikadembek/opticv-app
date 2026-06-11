# Task Specification

## Source

Azure DevOps Task: 40 — Bullet upgrades: allow editing rewritten version of bullet

## Goal

Allow users to inline-edit the AI-generated rewritten text for any bullet point in the Bullet Upgrades section, and persist both the edited text and the current bullet selection state to the backend so they survive page refresh.

## Context

The feature lives in `apps/opticv-web/src/app/features/cv-optimization/` and centres on the `BulletRewriter` component and its parent `CvOptimization` page. The AI returns a `BulletUpgradeResult` with a `rewrittenText` per `BulletItem`. Currently this text is read-only. The parent tracks which bullets are selected via the `selections.selectedBullets: BulletSelectionKey[]` signal. `OptimizationResult` already has a `userEditedOutput: string | null` JSON column and a `PATCH /api/optimizations/:id/user-output` endpoint — both will be repurposed to also store bullet edits and selections together.

## Scope

### In scope

- Inline editing of `rewrittenText` for bullets with `action === 'rewrite'`
- Saving edited text (per bullet, keyed by `company + title + originalText`) and selected bullets together to the backend via the existing `PATCH /api/optimizations/:id/user-output` endpoint
- Loading persisted edits and selections when entering stored-optimization mode
- Using the user-edited text (if present) instead of `rewrittenText` when applying selections to the merged CV for export

### Out of scope

- Editing bullets with `action === 'keep_as_is'` or `'recommend_cut'`
- Resetting an edited bullet to the original AI text
- Rich-text / Markdown formatting in the edit area
- Any changes to other optimization result types (summary, keywords, cover letter, etc.)

## Behavior

### Editing a bullet (inline)

1. Each bullet card with `action === 'rewrite'` displays a small edit icon button (pencil) adjacent to the rewritten text.
2. Clicking the edit icon switches the rewritten text display to an auto-focused `<textarea>` pre-filled with the current text (user-edited text if one exists, otherwise `rewrittenText`).
3. The textarea expands to fit its content (auto-resize or a fixed min-height).
4. Two action buttons appear below the textarea: **Save** and **Cancel**.
   - **Save**: stores the edited text in a local signal map keyed by `BulletSelectionKey`, closes the editor, and triggers a backend persist call.
   - **Cancel**: discards changes, closes the editor, restores the previous display without any backend call.
5. If the user empties the textarea entirely and clicks Save, treat it as reverting to the original AI `rewrittenText` (store `null` / remove the key from the map).
6. Edited bullets display a visual indicator (e.g. a small "Edited" badge) so the user knows the text differs from the AI output.

### Persisting to the backend

Persist is triggered on every Save action. The payload is a serialised `BulletUserState` object stored as a JSON string in `userEditedOutput` on the `BULLET_UPGRADE` OptimizationResult record.

`BulletUserState` structure (new shared type in `@opticv/datatypes`):

```ts
type BulletEditKey = {
  company: string;
  title: string;
  originalText: string;
};

type BulletUserState = {
  edits: Array<BulletEditKey & { editedText: string }>;
  selectedBullets: BulletSelectionKey[];
};
```

The frontend serialises the current state as `JSON.stringify(bulletUserState)` and sends it to `PATCH /api/optimizations/:id/user-output` with body `{ userEditedOutput: "<json string>" }`. No new endpoint or DB migration is needed.

### Loading persisted state (stored-optimization mode)

When `loadStoredOptimization()` runs and receives an `OptimizationResultSummary` for `BULLET_UPGRADE`:

1. If `userEditedOutput` is not null, parse it as `BulletUserState`.
2. Populate the local `bulletEdits` signal map from `state.edits`.
3. Restore `selections.selectedBullets` from `state.selectedBullets`.
4. Any bullet whose key is present in `state.edits` renders the `editedText` as the rewritten text display (with the "Edited" badge).

### Selection state persistence

Whenever the user toggles a bullet selection (existing `onBulletToggled` handler), also trigger the same backend persist call (debounced ~500 ms to avoid excess requests) using the current `selectedBullets` and `bulletEdits` state.

### Applying edits to CV export

In `applySelectionsToCV()` (or its call site), when substituting a selected bullet's text, prefer `editedText` from the `bulletEdits` map over `rewrittenText` from the AI result.

## Edge Cases

- **Bullet not in results**: if a persisted edit key no longer matches any bullet in `bulletUpgradeResult` (e.g. after a re-run), silently ignore it.
- **No `BULLET_UPGRADE` result record id**: if `jobApplicationId` is set but the optimization result record id is unknown at save time, look up the id from the loaded results before calling PATCH.
- **Concurrent edits**: only one bullet can be in edit mode at a time; opening another bullet's editor cancels (discards) the currently open one.
- **Empty rewritten text after AI**: if `rewrittenText` is undefined or empty, do not show the edit icon.
- **Save during export**: if the user triggers export while the editor is open, close the editor (cancel, no save) and proceed with export.

## Data / API

### Shared type addition (`packages/shared/datatypes/src/lib/datatypes.ts`)

```ts
export type BulletEditKey = {
  company: string;
  title: string;
  originalText: string;
};

export type BulletUserState = {
  edits: Array<BulletEditKey & { editedText: string }>;
  selectedBullets: BulletSelectionKey[];
};
```

### Existing endpoint (no change needed)

```
PATCH /api/optimizations/:id/user-output
Body: { userEditedOutput: string }   // JSON.stringify(BulletUserState)
Response: { userEditedOutput: string }
```

### Frontend signal additions (`CvOptimization`)

- `bulletEdits: WritableSignal<Map<string, string>>` — key is `${company}|${title}|${originalText}`, value is `editedText`
- `bulletUpgradeResultId: WritableSignal<string | null>` — the DB record id for the BULLET_UPGRADE result, needed for the PATCH call
- `activeBulletEditKey: WritableSignal<string | null>` — which bullet is currently being edited (null = none)
- `editedBulletText: WritableSignal<string>` — textarea buffer while editing

### BulletRewriter inputs/outputs (additions)

New inputs:
- `bulletEdits: Map<string, string>` — edited text per bullet key
- `activeBulletEditKey: string | null` — which card is in edit mode
- `editedBulletText: string` — textarea value

New outputs:
- `editStarted: OutputEmitterRef<string>` — emits bullet key when pencil clicked
- `editSaved: OutputEmitterRef<{ key: string; text: string }>` — emits on Save
- `editCancelled: OutputEmitterRef<void>` — emits on Cancel
- `editTextChanged: OutputEmitterRef<string>` — emits on textarea input

No DB migration required.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`, `npm exec nx build opticv-be`)
- Type check passes (`npm exec nx run-many -t typecheck`)
- Inline editor opens, saves, and cancels correctly
- Edited text is shown in place of AI text; "Edited" badge is visible
- Saving an edit calls `PATCH /api/optimizations/:id/user-output` with a valid JSON payload
- On page reload (stored-optimization route) the edited text and selection state are restored
- Edited bullet text is used in the exported CV when the bullet is selected
- Only one editor open at a time; opening a second cancels the first
- Tests updated for `BulletRewriter` (edit mode rendering, emit events)
- No regressions in other optimization sections
