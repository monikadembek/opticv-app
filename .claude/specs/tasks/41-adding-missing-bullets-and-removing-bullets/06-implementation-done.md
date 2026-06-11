# Implementation Done

## Task ID: 41-adding-missing-bullets-and-removing-bullets

---

## Summary

Delivered interactive selection and inline editing for `BulletMissingSuggestion` items, and opt-in removal selection for `recommend_cut` bullets. All new user state is persisted to the backend via the existing `PATCH /api/optimizations/:id/user-output` endpoint and restored on page reload. The `applySelectionsToCV()` utility was extended to apply both additions and removals to the CV clone. No new files were created; five existing files were modified.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Checkbox UI on `BulletMissingSuggestion` items | Implemented | |
| Green border highlight when missing bullet selected | Implemented | `[class.border-green-400]` binding on suggestion card |
| Inline edit affordance (pencil icon) visible only when selected and not editing | Implemented | |
| Textarea + Save/Cancel when editing missing bullet | Implemented | Reuses `editedBulletText` signal and `editCancelled` output |
| "Edited" badge on missing bullet when edit exists | Implemented | |
| Edit retained in map when suggestion deselected | Implemented | `missingBulletEdits` map is not cleared on deselect |
| Checkbox UI on `recommend_cut` bullets | Implemented | |
| Red border highlight when `recommend_cut` bullet checked | Implemented | `[class.border-red-400]` on `<li>` |
| "Will be removed" label when checked | Implemented | |
| `aria-label` on recommend_cut checkbox | Implemented | Includes bullet text in addition to position |
| Extend `BulletUserState` with `selectedMissingBullets` and `removedBullets` | Implemented | Both fields are required (non-optional) in the type |
| `persistBulletState()` includes new fields | Implemented | Serializes `selectedMissingBullets` with `editedText` when present |
| Debounced persistence (500 ms) on toggle | Implemented | Via `persistSubject` |
| Immediate persistence on edit save | Implemented | `persistBulletState()` called directly in `onMissingBulletEditSaved()` and `onMissingBulletEditSaved()` |
| `loadStoredOptimization()` restores `selectedMissingBullets` | Implemented | |
| `loadStoredOptimization()` rebuilds `missingBulletEdits` map | Implemented | |
| `loadStoredOptimization()` restores `removedBullets` | Implemented | |
| Backward compat: `?? []` for missing fields in old records | Implemented | |
| `applySelectionsToCV()` — removals run before additions | Implemented | |
| `applySelectionsToCV()` — find experience by `company` + `title` for removal | Implemented | |
| `applySelectionsToCV()` — filter bullet by `trim()` comparison | Implemented | |
| `applySelectionsToCV()` — find experience by `"${title} at ${company}"` for addition | Implemented | Also supports `"${company} - ${title}"` format (deviation, see below) |
| `applySelectionsToCV()` — resolve edited text or fall back to `suggestedBullet` | Implemented | |
| `applySelectionsToCV()` — append missing bullet to end of `bullets` array | Implemented | |
| Silent skip when `forPosition` has no match | Implemented | |
| `mergedCv` computed passes new parameters | Implemented | |
| `canExportCv` gate includes `selectedMissingBullets` and `removedBullets` | Implemented | |
| New signals reset in `runOptimization()` | Implemented | |
| Only one editor open at a time (shared `activeBulletEditKey`) | Implemented | |
| No `any` types | Implemented | Local `MissingBulletKey` alias used in `bullet-rewriter.ts` |
| No backend changes | Implemented | |

---

## Files

### Modified

| File | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | `BulletUserState` extended with `selectedMissingBullets` and `removedBullets` fields |
| `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` | Three new parameters added; removal and addition logic inserted |
| `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts` | New inputs, outputs, and helper methods added |
| `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html` | `recommend_cut` block replaced with interactive card; missing bullet section replaced with interactive cards |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | New signals, event handlers, updated `persistBulletState()`, `loadStoredOptimization()`, `mergedCv`, `canExportCv`, and `runOptimization()` |

### Created

None.

---

## Components

| Component | Status |
|---|---|
| `BulletRewriter` (extended) | Exist |
| `CvOptimization` (extended) | Exist |

---

## Stores

None defined in plan. No NgRx stores involved — state managed with signals on `CvOptimization`.

---

## Deviations

1. **`applySelectionsToCV()` — dual format matching for `forPosition`**: The implementation also accepts `"${company} - ${title}"` format in addition to the spec's `"${title} at ${company}"` format. Both are checked via `OR` condition. Not in the spec; silently extends coverage.

2. **Local type alias `MissingBulletKey`**: The plan resolved the undeclared `MissingBulletSelectionKey` issue by using the inline anonymous type. The implementation additionally declares a local `type MissingBulletKey = { forPosition: string; suggestedBullet: string }` inside `bullet-rewriter.ts` for conciseness. This is consistent with the plan's intent (no named export in `datatypes.ts`).

3. **`aria-label` on recommend_cut checkbox includes bullet text**: The plan specified `"Remove bullet at ${position.title} — ${position.company}"`. The implementation appends `": " + bullet.originalText` for more specific accessibility labeling.

4. **`missingBulletEditCancelled` output**: Per the plan resolution (Ambiguity #2), the existing `editCancelled` output is reused — no new cancel output was added. This matches the plan.

---

## Additional Implementation

None.
