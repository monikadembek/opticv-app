# Implementation Done

Task ID: 40-bullet-upgrades-allow-edit
Date: 2026-06-11

---

## Summary

Inline bullet editing was implemented for the Bullet Upgrades section. Users can now click a pencil icon on any `rewrite`-action bullet to open an inline textarea editor, save or cancel edits, and see an "Edited" badge when a bullet has been modified. Edited text and selection state are serialised as `BulletUserState` JSON and persisted to the backend via the existing `PATCH /api/optimizations/:id/user-output` endpoint. On page reload (stored-optimization mode), persisted edits and selected bullets are restored. The export functions use the edited text in place of the AI-generated rewritten text when a bullet is selected.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Inline edit icon (pencil) for `action === 'rewrite'` bullets with `rewrittenText` | Implemented | `bullet-rewriter.html` |
| Edit icon NOT shown when `rewrittenText` is absent or empty | Implemented | Wrapped in outer `@if (bullet.rewrittenText)` |
| Auto-focused textarea pre-filled with current text on edit open | Partial | `[value]="editedBulletText()"` is set; `autofocus` attribute is absent |
| Textarea auto-resize | Implemented | `pTextarea [autoResize]="true"` |
| Save and Cancel buttons below textarea | Implemented | `bullet-rewriter.html` |
| Save stores edited text in local `bulletEdits` signal map | Implemented | `onBulletEditSaved()` in `cv-optimization.ts` |
| Save triggers backend PATCH call | Implemented | `persistBulletState()` called immediately on save |
| Cancel discards changes with no backend call | Implemented | `onBulletEditCancelled()` resets signals only |
| Empty save reverts to AI text (removes key from map) | Implemented | `onBulletEditSaved()` deletes key when trimmed value is empty |
| "Edited" badge displayed on edited bullets | Implemented | `bullet-rewriter.html` — blue badge via `isEdited()` |
| `BulletEditKey` shared type added to `@opticv/datatypes` | Implemented | `datatypes.ts` lines 415–419 |
| `BulletUserState` shared type added to `@opticv/datatypes` | Implemented | `datatypes.ts` lines 420–424 |
| `PATCH /api/optimizations/:id/user-output` called with `BulletUserState` JSON | Implemented | `persistBulletState()` |
| PATCH error handling — toast error, no UI block | Implemented | `MessageService.add(...)` in error callback; `<p-toast />` and `providers: [MessageService]` absent (see Deviations) |
| Load persisted edits on stored-optimization route | Implemented | `loadStoredOptimization()` parses `userEditedOutput` |
| Restore `selectedBullets` from persisted state on load | Implemented | `selections.update()` in `loadStoredOptimization()` |
| Parse-error fallback on corrupt `userEditedOutput` | Implemented | `console.warn` in catch block |
| `bulletUpgradeResultId` captured on load | Implemented | Set for every `BULLET_UPGRADE` result regardless of status |
| Selection toggle triggers debounced persist (500 ms) | Implemented | `persistSubject.next()` in `onBulletToggled()` |
| Edited text used in CV export | Implemented | `applySelectionsToCV()` checks `bulletEdits` map |
| Only one bullet editor open at a time | Implemented | Opening a new key overwrites `activeBulletEditKey` |
| Export guard closes open editor | Implemented | `exportCvAsPdf/Docx` calls `onBulletEditCancelled()` |
| Reset all bullet signals on new optimization run | Implemented | `runOptimization()` resets `bulletEdits`, `bulletUpgradeResultId`, `activeBulletEditKey`, `editedBulletText` |
| Tests for inline editing in `BulletRewriter` (11 cases) | Implemented | `describe('inline editing')` in `bullet-rewriter.spec.ts` |

---

## Files

### Modified

| File | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added `BulletEditKey` and `BulletUserState` types |
| `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` | Added `bulletEdits: Map<string, string>` parameter; edited text preferred over `rewrittenText` in bullet substitution |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added signals (`bulletEdits`, `bulletUpgradeResultId`, `activeBulletEditKey`, `editedBulletText`), `persistSubject`, `persistBulletState()`, `onBulletEditStarted/Saved/Cancelled/TextChanged()`, persist trigger in `onBulletToggled()`, export guard, load restore logic, reset in `runOptimization()` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Added `[bulletEdits]`, `[activeBulletEditKey]`, `[editedBulletText]`, `(editStarted)`, `(editSaved)`, `(editCancelled)`, `(editTextChanged)` bindings on `<app-bullet-rewriter>` |
| `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts` | Added inputs (`bulletEdits`, `activeBulletEditKey`, `editedBulletText`), outputs (`editStarted`, `editSaved`, `editCancelled`, `editTextChanged`), helper methods (`bulletKey`, `getDisplayText`, `isEditing`, `isEdited`) |
| `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html` | Replaced static rewritten-text display with conditional edit mode: pencil button, "Edited" badge, `getDisplayText()` display, textarea + Save/Cancel in edit mode |
| `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.spec.ts` | Added `describe('inline editing')` block with 11 test cases |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Minor updates (test file included in changed set; no new tests for `CvOptimization` bullet edit methods) |

### Created

None.

---

## Components

| Component | Status |
|---|---|
| `BulletRewriter` — updated with new inputs/outputs/helpers | Exist |
| `CvOptimization` — updated with bullet edit state and handlers | Exist |

---

## Stores

None planned or required.

---

## Deviations

1. **`providers: [MessageService]` not added to `@Component` decorator** — Plan Step 3k requires it. `MessageService` is injected via `inject()` without a local provider declaration. The component relies on a parent or root provider.

2. **`<p-toast />` not added to `cv-optimization.html`** — Plan Steps 3k and 6 require it. Without this element in the template, `MessageService.add()` calls produce no visible toast.

3. **`$event.preventDefault()` in pencil button click handler** — Reviewed in code-review (05-code-review.md) as a non-critical smell; `preventDefault()` has no effect on a plain button click.

4. **`onBulletEditStarted` key-splitting** — Plan uses a simple `key.split('|')` with 3 parts. Implementation uses `parts.slice(2).join('|')` for `originalText` to correctly handle pipe characters inside `originalText`. This is a correct improvement.

5. **`bulletUpgradeResultId` set regardless of result `status`** — Plan implies setting inside the status-filtered block. Implementation sets it for any `BULLET_UPGRADE` record. More robust for the fallback PATCH path.

---

## Additional Implementation

- **`cv-optimization.spec.ts` updated** — File is in the changed set. No new tests for the new `CvOptimization` bullet edit methods were added; existing tests were adjusted as needed. The spec/plan only mandated tests in `bullet-rewriter.spec.ts`.

- **`docs/tasks-list.md` updated** — Task list document updated as part of the commit; not a source code change.
