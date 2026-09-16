# Code Review — Task 51: Editing missing keywords

Reviewed against: `02-spec.md`, `04-implementation-plan.md`, project conventions.

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The core feature is fully implemented and correct: Edit/Save/Cancel flow, "Edited" badge, `keywordEdits` Map persistence, hydration on reload, and CV export integration all work as specified. One non-trivial deviation from the spec exists in `onKeywordEditStarted` — the edit field pre-fill logic was extended to extract quoted text from the `recommendation` property for `experience_bullet` keywords, which is not in the spec but is clearly intentional and useful. There are no critical convention violations. Two minor issues should be addressed.

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`cv-optimization.ts` line 430** — `console.log('results: ', results)` debug statement inside `loadStoredOptimization()`. The conventions rule requires clean, production-grade code. Remove before merge.

2. **`keyword-gap.html` lines 125 and 254** — Missing whitespace between adjacent `@if` blocks (e.g. `} @if (isEditedKeyword(…)) { … } @if (!isEditingKeyword(…)) {`). These render correctly but are not idiomatic Angular control-flow formatting and reduce readability. Should be separated by a blank line or structured as `@else`.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Edit button on each missing keyword row (both subsections) | Covered | Both `missingLikelyHas` and `missingGenuinelyLacks` sections have Edit button |
| Edit button hidden when in edit mode | Covered | `@if (!isEditingKeyword(item.keyword))` |
| Text input pre-filled with current keyword text | Covered | `[value]="editedKeywordText()"` |
| Save / Cancel buttons below input | Covered | Both present in edit section |
| Cancel closes edit, no state change | Covered | `onKeywordEditCancelled()` resets active key and text |
| Save persists to `keywordEdits` Map and calls `saveUserOutput` | Covered | `onKeywordEditSaved` → `this.persistBulletState()` |
| "Edited" badge on saved keyword row | Covered | `@if (isEditedKeyword(item.keyword))` |
| One keyword in edit mode at a time | Covered | `activeKeywordEditKey` is set on edit start, previous closes |
| `keywordEdits` stored in `BulletUserState` | Covered | `datatypes.ts` extended; serialized in `persistBulletState` |
| Hydration on page reload | Covered | `loadStoredOptimization()` parses `state.keywordEdits ?? []` |
| Edited keyword text shown in place of original | Covered | `getKeywordDisplayText()` used in label |
| Empty/whitespace Save does not persist | Covered | `if (trimmed === '') return;` in `onKeywordEditSaved` |
| Saving unchanged text removes Edited badge | Covered | `next.delete(event.key)` when `trimmed === event.key` |
| `applySelectionsToCV` uses edited keyword text for CV export | Covered | `keywordEdits.get(kw) ?? kw` and `keywordEdits.get(kw) ?? baseText` |
| Keyword edit state independent of bullet edit state | Covered | Separate signals; no shared state |
| No breaking changes to existing keyword selection | Covered | `keywordToggled` output and `isSelected` logic untouched |

---

### Plan Deviations

1. **`onKeywordEditStarted` pre-fill logic** (plan step 4c vs actual `cv-optimization.ts` lines 655–673): The plan says to pre-fill with `this.keywordEdits().get(keyword) ?? keyword`. The implementation adds a richer fallback: for `experience_bullet` keywords, it extracts the quoted text from `entry.recommendation` using `/'([^']+)'/` and uses that as the pre-fill if no prior edit exists. This is a **positive enhancement** — it is consistent with how `apply-selections.ts` computes the `baseText` for `experience_bullet` placement. The spec does not explicitly disallow it; the commit message mentions this as an intentional change. Not a concern.

2. **`BulletUserState` also now includes `keywordBulletPositions`** — this is a separate in-flight feature (experience bullet position selection) added alongside task 51. It is not in the spec or plan for task 51, but the implementation correctly adds it as optional in the type, so backwards compatibility is preserved.

---

### Null Safety Issues

None. All nullable accesses use optional chaining or `?? []` / `?? new Map()` defaults:
- `state.keywordEdits ?? []` (line 478 in `cv-optimization.ts`)
- `state.keywordBulletPositions ?? []` (line 483)
- `this.keywordGapResult()?.missingKeywords.find(…)` (line 661)
- `match ? match[1] : keyword` (line 669)

---

### Code Smells

1. **Template duplication** (`keyword-gap.html`): The edit section block (lines 144–168 and 272–296) is identical in both the `missingLikelyHas` and `missingGenuinelyLacks` `@for` loops. This is an accepted trade-off given the component is presentational and both sections share the same template structure. Not a blocking issue, but extracting into a sub-component would reduce duplication if the edit UI grows.

2. **`$any()` cast in template** (`keyword-gap.html` lines 150, 278, 181, 309): `$any($event.target).value` is used to access the native input value. This is an established pattern in this codebase (same approach used in other templates) and avoids a dummy type assertion. Acceptable.

---

### Recommendation

**Fix critical issues before merge** — but the only outstanding items are non-critical:

- Remove the `console.log` on line 430 of `cv-optimization.ts`.
- Optionally improve control-flow block formatting in `keyword-gap.html`.

Both are minor. The feature logic is complete, correct, and well-tested. The implementation can merge once the debug log is removed.
