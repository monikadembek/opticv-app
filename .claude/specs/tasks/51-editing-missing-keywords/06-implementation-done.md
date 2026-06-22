# Implementation Done — Task 51: Editing missing keywords

## Summary

Inline edit/save/cancel capability was added to every missing keyword row in the `keyword-gap` component. Keyword edits are stored in a `Map<string, string>` in `cv-optimization.ts`, serialized into the existing `BulletUserState` JSON payload, and hydrated on page reload. Edited keyword text is reflected in the UI label, in an "Edited" badge, and in the CV export via `applySelectionsToCV`. A separate `experience_bullet` placement path was also added: keywords with that placement can be assigned to a specific experience position and their text (or a quoted snippet from the AI recommendation) is appended as a bullet to that position.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Edit button on each missing keyword row in "Likely have" subsection | Implemented | |
| Edit button on each missing keyword row in "Skills to acquire or omit" subsection | Implemented | |
| Edit button hidden when that keyword is in edit mode | Implemented | |
| Clicking Edit sets `activeKeywordEditKey` and `editedKeywordText` | Implemented | |
| If another keyword was in edit mode, it closes (one active edit at a time) | Implemented | Setting `activeKeywordEditKey` to new value implicitly closes previous |
| Text input shown pre-filled with current display value | Implemented | Pre-fills with saved edit, or quoted recommendation text for `experience_bullet`, or original keyword |
| Save and Cancel buttons shown below input | Implemented | |
| Cancel clears `activeKeywordEditKey` and `editedKeywordText`; no state change | Implemented | |
| Save with empty/whitespace text: does not save, keeps edit mode open | Implemented | Early return on `trimmed === ''` |
| Save with unchanged text: removes existing Map entry, no "Edited" badge | Implemented | `next.delete(event.key)` when `trimmed === event.key` |
| Save with new text: stores edit, closes edit mode, shows "Edited" badge | Implemented | |
| `saveUserOutput` called on Save | Implemented | Via `this.persistBulletState()` |
| "Edited" badge shown on keyword row after save | Implemented | |
| Edited keyword text displayed in place of original in label | Implemented | `getKeywordDisplayText()` |
| `keywordEdits` added to `BulletUserState` type | Implemented | `datatypes.ts` — optional field `keywordEdits?: Array<{ originalKeyword: string; editedText: string }>` |
| `keywordEdits` serialized into `saveUserOutput` payload | Implemented | `persistBulletState()` in `cv-optimization.ts` |
| `keywordEdits` hydrated from stored payload on page load | Implemented | `loadStoredOptimization()` in `cv-optimization.ts` |
| New signals added to `cv-optimization.ts`: `keywordEdits`, `activeKeywordEditKey`, `editedKeywordText` | Implemented | |
| New signals reset in `runOptimization()` | Implemented | |
| New inputs on `keyword-gap`: `keywordEdits`, `activeKeywordEditKey`, `editedKeywordText` | Implemented | |
| New outputs on `keyword-gap`: `keywordEditStarted`, `keywordEditSaved`, `keywordEditCancelled`, `keywordEditTextChanged` | Implemented | |
| Helper methods on `keyword-gap`: `isEditingKeyword`, `isEditedKeyword`, `getKeywordDisplayText` | Implemented | |
| `cv-optimization.html` wires new inputs/outputs to `<app-keyword-gap>` | Implemented | |
| `applySelectionsToCV` uses edited keyword text for skills placement | Implemented | `keywordEdits.get(kw) ?? kw` |
| Edited keyword text used in CV export | Implemented | Both `skills` and `experience_bullet` paths use `keywordEdits` |
| No breaking changes to keyword selection (checkbox) | Implemented | |
| Keyword edit state independent of bullet edit state | Implemented | Separate signals; no shared state |

---

## Files

### Modified

| File | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added optional `keywordEdits` field to `BulletUserState` |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` | Added inputs, outputs, helper methods, `InputTextModule` import |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` | Added Edit button, edit section (input + Save/Cancel), Edited badge to both missing keyword subsections |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added signals, handler methods, hydration, persistence for keyword edits |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Wired new keyword edit inputs and outputs on `<app-keyword-gap>` |
| `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` | Added `keywordEdits` and `keywordBulletPositions` parameters; updated keyword-to-skills and keyword-to-bullet logic |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Updated unit tests |
| `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts` | Added tests for `keywordEdits` and `experience_bullet` placement |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts` | Updated tests |
| `docs/keyword-gap.md` | Updated documentation |
| `docs/tasks-list.md` | Updated task list |

### Created

None.

---

## Components

| Component | Status |
|---|---|
| `KeywordGap` (`keyword-gap.ts` / `keyword-gap.html`) | Exist — modified |
| `CvOptimization` (`cv-optimization.ts` / `cv-optimization.html`) | Exist — modified |

---

## Stores

The plan uses Angular signals on `CvOptimization` (no NgRx store). No separate store was planned or implemented.

| Signal/State | Status |
|---|---|
| `keywordEdits: signal<Map<string, string>>` | Exist |
| `activeKeywordEditKey: signal<string | null>` | Exist |
| `editedKeywordText: signal<string>` | Exist |

---

## Deviations

1. **`onKeywordEditStarted` pre-fill logic**: Plan specifies pre-fill as `this.keywordEdits().get(keyword) ?? keyword`. Implementation adds a richer fallback for `experience_bullet` keywords: extracts quoted text from `entry.recommendation` using `/'([^']+)'/` if no prior edit exists. Falls back to `keyword` if no quoted text is found.

2. **`BulletUserState` also extended with `keywordBulletPositions`**: Plan only covers `keywordEdits`. The implementation also adds optional `keywordBulletPositions?: Array<{ keyword: string; forPosition: string }>` to `BulletUserState` and serializes/hydrates it alongside `keywordEdits`.

3. **`apply-selections.ts` `experience_bullet` path**: Plan describes adding `keywordEdits.get(kw) ?? kw` for the skills placement path. The actual implementation also adds a full `experience_bullet` branch in `applySelectionsToCV` that appends a bullet to the matched experience position, using `keywordEdits.get(kw) ?? baseText` where `baseText` is extracted from the quoted recommendation.

---

## Additional Implementation

- **`experience_bullet` keyword placement feature** (`keyword-gap.html`, `keyword-gap.ts`, `cv-optimization.ts`, `apply-selections.ts`): Keywords with `suggestedPlacement === 'experience_bullet'` show a position selector dropdown (when selected). The chosen position is stored in `keywordBulletPositions: signal<Map<string, string>>`, serialized with the same `persistBulletState()` call, and used in `applySelectionsToCV` to append the keyword text as a bullet to the matching experience entry. This feature is not covered by the task 51 spec or plan.
