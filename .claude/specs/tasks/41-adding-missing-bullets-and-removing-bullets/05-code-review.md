# Code Review — Task 41: Bullet Upgrades — Add Missing Bullets & Remove Recommended-Cut Bullets

**Reviewer:** Claude Code (senior fullstack)
**Branch:** feature/41-missing-bullets-cutting-bullets
**Date:** 2026-06-11

---

## Summary

- **Overall result: PASS WITH ISSUES**
- The implementation correctly covers all specified requirements: missing bullet selection, inline editing, recommend-cut removal, `BulletUserState` persistence, state restoration, and `applySelectionsToCV()` additions. All new signals, event handlers, component inputs/outputs, and template changes are present and functionally correct. The test suite is comprehensive and well-structured. However, there is one convention violation (misplaced import) and several small non-critical issues that should be addressed before merge.

---

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. **Misplaced `type` import in `bullet-rewriter.ts` (line 13)**

   ```ts
   type MissingBulletKey = { forPosition: string; suggestedBullet: string };
   import { ButtonModule } from 'primeng/button';  // ← import after a type alias
   ```

   `import` statements must come before any type alias declarations. Move the `type MissingBulletKey` line to after the two `import` blocks. This is a linting/formatting issue that will likely fail `nx lint` or cause confusing diffs.

2. **`MissingBulletKey` is a local alias that duplicates an inline type used elsewhere**

   `bullet-rewriter.ts` defines a local `type MissingBulletKey` but the plan explicitly resolved (plan note, non-critical #1) that no named type should be introduced for this shape — it should remain an inline anonymous type consistent with `cv-optimization.ts` and `datatypes.ts`. The alias itself is benign but breaks the stated convention from the implementation plan.

3. **`apply-selections.ts` matching now uses two formats but the spec says only `"${title} at ${company}"`**

   `applySelectionsToCV` (lines 77–79) matches `forPosition` against both `"${company} - ${title}"` (dash format) and `"${title} at ${company}"` (at format). The spec (Behavior §6, Assumptions §3) only specifies the `"${title} at ${company}"` format. The dash format is an undocumented extension. This is covered by a test (`appends the suggested bullet using dash format matching`), making it deliberate — but it deviates from the spec without a recorded reason. If both formats are needed, the spec/assumption should be updated; otherwise remove the dash case.

4. **`cv-optimization.ts` `loadStoredOptimization()` strips `editedText` from restored `selectedMissingBullets` (line 337–340)**

   ```ts
   this.selectedMissingBullets.set(
     (state.selectedMissingBullets ?? []).map((s) => ({
       forPosition: s.forPosition,
       suggestedBullet: s.suggestedBullet,
     })),
   );
   ```

   This is functionally correct because `selectedMissingBullets` signal holds `{ forPosition, suggestedBullet }` only (without `editedText`) — edits live in `missingBulletEdits`. The mapping is not wrong, but the explicit destructuring adds noise. The spec (Behavior §5) agrees with the two-field shape. Minor style issue.

5. **No ARIA label on the recommend_cut checkbox input in `bullet-rewriter.html` includes the `originalText`**

   The spec says aria-label should be `"Remove bullet at ${position.title} — ${position.company}"` (line 147 of spec). The implementation matches this exactly — but the label does not disambiguate which bullet is being removed when a position has multiple `recommend_cut` bullets. Not a blocker, but a future accessibility concern.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Checkbox on `BulletMissingSuggestion` — unchecked by default | Covered | `selectedMissingBullets` starts as `[]` |
| Checking adds key to `selectedMissingBullets` | Covered | `onMissingBulletToggled` adds entry |
| Unchecking removes it | Covered | `onMissingBulletToggled` filters entry |
| Green border when selected | Covered | `[class.border-green-400]` in template |
| Debounced persist on toggle (500 ms) | Covered | `persistSubject.next()` in handler |
| Pencil icon visible only when selected and not editing | Covered | `@if (isMissingSelected(...) && !isMissingEditing(...))` |
| Textarea pre-filled with edited/suggested text on pencil click | Covered | `onMissingBulletEditStarted` sets `editedBulletText` |
| Save stores in `missingBulletEdits`, immediate persist | Covered | `onMissingBulletEditSaved` |
| Cancel closes editor without saving | Covered | Reuses `editCancelled` / `onBulletEditCancelled` |
| Edit retained after deselection | Covered | Map not cleared on toggle |
| "Edited" badge when edit exists | Covered | `@if (isMissingEdited(...))` |
| Checkbox on `recommend_cut` bullets | Covered | `input[type="checkbox"]` in `@case ('recommend_cut')` |
| Checking adds to `removedBullets` | Covered | `onRemovedBulletToggled` |
| Unchecking removes from `removedBullets` | Covered | `onRemovedBulletToggled` |
| Red border when checked (`border-red-400`) | Covered | `[class.border-red-400]` on `<li>` |
| "Will be removed" label when checked | Covered | Conditional badge in template |
| `aria-label` on remove checkbox | Covered | `[attr.aria-label]` present |
| `BulletUserState` extended with `selectedMissingBullets` | Covered | `datatypes.ts` updated |
| `BulletUserState` extended with `removedBullets` | Covered | `datatypes.ts` updated |
| `persistBulletState()` serializes new fields | Covered | Both fields included in `state` |
| `loadStoredOptimization()` restores `selectedMissingBullets` | Covered | `??[]` default used |
| `loadStoredOptimization()` rebuilds `missingBulletEdits` | Covered | Loop over `editedText` entries |
| `loadStoredOptimization()` restores `removedBullets` | Covered | `??[]` default used |
| `applySelectionsToCV` — removals run first | Covered | Removal loop precedes selection loop |
| `applySelectionsToCV` — additions run after removals | Covered | `selectedMissingBullets` loop is last before keywords |
| Missing bullet appended to correct position | Covered | `findIndex` + `push` |
| Non-matching `forPosition` silently skipped | Covered | `continue` when `expIndex === -1` |
| `canExportCv` updated for new selection types | Covered | `selectedMissingBullets().length > 0 \|\| removedBullets().length > 0` |
| Only one editor open at a time | Covered | Shared `activeBulletEditKey` signal |
| Backward compat with old `BulletUserState` records | Covered | `?? []` in restore paths |
| New signals reset in `runOptimization()` | Covered | All three signals reset to empty |
| New inputs/outputs wired in `cv-optimization.html` | Covered | All bindings present |

---

## Plan Deviations

1. **Dual `forPosition` format matching in `applySelectionsToCV`** (lines 77–79 of `apply-selections.ts`)

   The plan specifies matching using `"${e.title} at ${e.company}"` only (Step 2c). The implementation also accepts `"${e.company} - ${e.title}"` (dash format). A test (`appends the suggested bullet using dash format matching`) validates this behaviour deliberately. This is an unrecorded extension beyond the plan.

2. **`type MissingBulletKey` alias introduced in `bullet-rewriter.ts`**

   The plan explicitly resolved (plan preamble, non-critical #1): "Do NOT introduce a named type. Use the inline anonymous type `{ forPosition: string; suggestedBullet: string }` consistently everywhere." The implementation introduces `type MissingBulletKey` at line 12.

---

## Null Safety Issues

None. All optional fields use `?? []` / `?? ''` where required. The `structuredClone` in `applySelectionsToCV` and all `findIndex` checks are properly guarded with `continue`/early return.

---

## Code Smells

1. **Redundant `map` in `loadStoredOptimization` (cv-optimization.ts lines 337–340)**

   The explicit `map((s) => ({ forPosition: s.forPosition, suggestedBullet: s.suggestedBullet }))` strips `editedText` from elements before storing in `selectedMissingBullets`. This is correct behaviour (edits live separately in `missingBulletEdits`) but the intent is non-obvious without a comment or a type cast. A type annotation on the `.set()` call would make the stripping deliberate rather than incidental.

2. **`MissingBulletKey` local alias in `bullet-rewriter.ts` (line 12)**

   Duplicate shape defined locally when the type is expressed inline everywhere else. Minor — but the plan was explicit about not doing this.

---

## Recommendation

**Fix critical issues before merge** — The misplaced `import` after the `type` alias (non-critical #1 above) will likely break the linter. The `MissingBulletKey` named alias contradicts the explicit plan resolution and should be inlined. All other findings are minor and do not block correctness.

Specifically, before merging:
1. Move `type MissingBulletKey = ...` in `bullet-rewriter.ts` to after all `import` statements, or inline it and remove the alias entirely.
2. Decide whether dual-format `forPosition` matching is intentional and either update the spec/assumption or remove the dash format case.
