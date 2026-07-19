# Implementation Plan

Task ID: 93-keyword-gap-position-for-bullet-not-preserved

Source spec: `02-spec.md` (review: `03-spec-review.md`, PASS WITH ISSUES — no critical issues, proceed as-is)

## Overview

Replace label-based (`forPosition: string`) matching with index-based (`experienceIndex: number`) matching for a keyword's selected experience-bullet placement, across the shared type, component I/O, host-component state/persistence/restore logic, and the CV-merge utility. Add missing test coverage for this path.

---

## Step 1 — Shared type: `packages/shared/datatypes/src/lib/datatypes.ts`

- Locate `BulletUserState` (around line 558).
- Change:
  ```ts
  keywordBulletPositions?: Array<{ keyword: string; forPosition: string }>;
  ```
  to:
  ```ts
  keywordBulletPositions?: Array<{ keyword: string; experienceIndex: number }>;
  ```
- No other fields in `BulletUserState` change.

---

## Step 2 — `keyword-gap.ts` component I/O

File: `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`

- `keywordBulletPositions` input: change from `input<Map<string, string>>(new Map())` to `input<Map<string, number>>(new Map())`.
- `keywordBulletPositionSelected` output: change from `output<{ keyword: string; forPosition: string }>()` to `output<{ keyword: string; experienceIndex: number | null }>()`.
- `getKeywordPosition(keyword: string)`: change return type from `string` to `number | null`; change body from `?? ''` to `?? null`.
- `onPositionChange(keyword: string, value: string)`: the native `<select>` emits a string value from `$event.target.value`. Convert to the new contract:
  - If `value === ''`, emit `{ keyword, experienceIndex: null }`.
  - Otherwise, emit `{ keyword, experienceIndex: Number(value) }`.

---

## Step 3 — `keyword-gap.html` template

File: `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html`

Two duplicated blocks contain the position `<select>` (lines ~169–193 and ~297–321). In both:

- `[value]="getKeywordPosition(item.keyword)"` — now bound to a `number | null`; since `<option [value]>` values must render as strings, bind display value with a nullish fallback: `[value]="getKeywordPosition(item.keyword) ?? ''"`.
- The `@for (pos of experiencePositions(); track pos)` loop currently iterates over label strings (`experiencePositions()` — an array of `string`, per Step 4). Change the loop to iterate with index:
  ```html
  @for (pos of experiencePositions(); track $index; let i = $index) {
    <option [value]="i">{{ pos }}</option>
  }
  ```
  (Angular's `@for` provides `$index` natively — use the `let i = $index` alias for readability in the option binding.)
- `(change)="onPositionChange(item.keyword, $any($event.target).value)"` — unchanged; `onPositionChange` now performs the string→number conversion internally (Step 2).
- The warning text block `@if (!getKeywordPosition(item.keyword))` — condition still works since `null` and `''` are both falsy; no change needed structurally, but confirm behavior: `!null` is `true`, `!0` is also `true`. **Note:** if a valid selection is index `0` (the first experience entry), `!getKeywordPosition(item.keyword)` would incorrectly evaluate to `true` for a valid selection of index 0, showing the "pick a position" warning erroneously. Fix by changing the condition to an explicit null check: `@if (getKeywordPosition(item.keyword) === null)`.

---

## Step 4 — `cv-optimization.ts` — signals, computed, event handler, restore, persist

File: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

1. **Signal type** (line ~246):
   ```ts
   readonly keywordBulletPositions = signal<Map<string, number>>(new Map());
   ```

2. **`experiencePositionLabels` computed** (lines ~263–267): no type change needed — it still produces `string[]` for display purposes (option text). Keep as-is.

3. **Event handler `onKeywordBulletPositionSelected`** (lines ~905–919):
   ```ts
   onKeywordBulletPositionSelected(event: {
     keyword: string;
     experienceIndex: number | null;
   }): void {
     this.keywordBulletPositions.update((map) => {
       const next = new Map(map);
       if (event.experienceIndex === null) {
         next.delete(event.keyword);
       } else {
         next.set(event.keyword, event.experienceIndex);
       }
       return next;
     });
     this.persistBulletState();
   }
   ```

4. **Restore logic in `loadStoredOptimization`** (lines ~639–643, inside the `BULLET_UPGRADE` branch):
   ```ts
   const kwBulletPosMap = new Map<string, number>();
   for (const p of state.keywordBulletPositions ?? []) {
     kwBulletPosMap.set(p.keyword, p.experienceIndex);
   }
   this.keywordBulletPositions.set(kwBulletPosMap);
   ```
   No bounds validation against `cvStructuredData().experience.length` is added here — per spec Edge Cases, an out-of-bounds index is handled downstream by the `<select>` (Step 3) and `apply-selections.ts` (Step 5), not at restore time.

5. **Persist logic in `persistBulletState` → `buildAndSave`** (lines ~1070–1076):
   ```ts
   const keywordBulletPositionsArr: Array<{
     keyword: string;
     experienceIndex: number;
   }> = [];
   for (const [keyword, experienceIndex] of this.keywordBulletPositions()) {
     keywordBulletPositionsArr.push({ keyword, experienceIndex });
   }
   ```
   The rest of `buildAndSave` (building `state: BulletUserState`) is unchanged — the field name `keywordBulletPositions` on `state` stays the same, only its element shape changed (per Step 1).

6. **`mergedCv` computed → `applySelectionsToCV` call** (lines ~294–309): the call already passes `this.keywordBulletPositions()` positionally as the last argument — no call-site change needed beyond the signal's new generic type (`Map<string, number>`), which must match the updated `applySelectionsToCV` parameter type from Step 5.

---

## Step 5 — `apply-selections.ts`

File: `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`

1. **Function signature** (line 24): change last parameter from
   ```ts
   keywordBulletPositions: Map<string, string> = new Map(),
   ```
   to:
   ```ts
   keywordBulletPositions: Map<string, number> = new Map(),
   ```

2. **`experience_bullet` placement branch** (lines 101–115): replace label-matching with index lookup and explicit bounds check:
   ```ts
   } else if (placement === 'experience_bullet') {
     const experienceIndex = keywordBulletPositions.get(kw);
     if (experienceIndex === undefined) continue;
     if (experienceIndex < 0 || experienceIndex >= clone.experience.length) continue;
     const quotedMatch = entry?.recommendation?.match(/'([^']+)'/);
     const baseText = quotedMatch ? quotedMatch[1] : kw;
     const displayText = keywordEdits.get(kw) ?? baseText;
     clone.experience[experienceIndex].bullets.push(displayText);
   }
   ```

3. **Do not touch** the `selectedMissingBullets` loop (lines 78–88) — it uses the same `dashFormat`/`atFormat` label-matching pattern, but operates on a different feature (`BulletUserState.selectedMissingBullets`, keyed by `forPosition` string) that is explicitly out of scope per the spec ("Out of scope" only calls out the `atFormat` branch inside the `experience_bullet` keyword-placement logic, not this separate missing-bullets feature). Leave lines 78–88 unchanged.

---

## Step 6 — Tests

### 6a. `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`

- Existing tests referencing `forPosition: 'Frontend Developer at Acme Corp'` / `'Acme Corp - Frontend Developer'` in the `experience_bullet placement` describe block (~lines 301–340) must be updated to pass `experienceIndex: <n>` instead of a label string, matching the fixture's experience array order.
- Add a test: keyword with `experience_bullet` placement and an out-of-bounds `experienceIndex` (e.g. `99`) → bullet is not added to any experience entry (mirrors old "does nothing when forPosition does not match" test at line 270, adapted to index).
- Add a test: keyword with `experience_bullet` placement and no entry in `keywordBulletPositions` map at all → bullet is not added (covers the `undefined` → `continue` branch).
- Leave the unrelated `selectedMissingBullets`/`forPosition` tests (e.g. line 238, 244, 261, 270, 434) untouched — different feature, out of scope.

### 6b. `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts`

Currently has no coverage for the position picker. Add a new `describe` block covering:

- `experiencePositions` input renders one `<option>` per label, and the picker `<select>` only appears when `isSelected(keyword)` is true and `suggestedPlacement === 'experience_bullet'`.
- `getKeywordPosition(keyword)` returns `null` when no entry exists in `keywordBulletPositions`, and returns the stored index when one exists.
- `onPositionChange(keyword, '')` emits `keywordBulletPositionSelected` with `{ keyword, experienceIndex: null }`.
- `onPositionChange(keyword, '1')` emits `keywordBulletPositionSelected` with `{ keyword, experienceIndex: 1 }`.
- Selecting index `0` does not trigger the "pick a position" warning message (regression test for the falsy-zero bug fixed in Step 3).

### 6c. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`

Mirror the existing `selectedKeywords` persistence/restore test pattern (describe blocks at lines 2370 and 2406):

- New `describe('onKeywordBulletPositionSelected — persistence', ...)`:
  - Selecting an experience index for a keyword persists `keywordBulletPositions: [{ keyword, experienceIndex }]` via `saveUserOutput` to the known `BULLET_UPGRADE` result id (mirrors pattern at line 2371–2389).
  - Clearing a position (`experienceIndex: null`) removes the entry from the persisted array.
- New `describe('loadStoredOptimization — restores keyword bullet positions', ...)`:
  - Given a stored `BULLET_UPGRADE` result with `userEditedOutput` containing `keywordBulletPositions: [{ keyword: 'React', experienceIndex: 0 }]`, after `loadStoredOptimization` runs, `component.keywordBulletPositions()` contains `Map { 'React' => 0 }` (mirrors pattern at lines 2407–2432).
  - Defaults to an empty map when `keywordBulletPositions` is absent from stored state (mirrors line 2434–2454).

---

## Files Touched

- `packages/shared/datatypes/src/lib/datatypes.ts` — modify (`BulletUserState.keywordBulletPositions` element shape)
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` — modify (input/output types, `getKeywordPosition`, `onPositionChange`)
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` — modify (option value binding, index-based loop, null-check fix for the "pick a position" warning)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` — modify (signal type, event handler, restore logic, persist logic)
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` — modify (parameter type, `experience_bullet` branch lookup)
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts` — modify (update existing `experience_bullet` tests, add out-of-bounds/missing-entry tests)
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts` — modify (add position-picker test coverage)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` — modify (add persistence + restore tests for `keywordBulletPositions`)

No files created; no backend, Prisma, or DTO files touched.

## Verification

- `npm exec nx typecheck opticv-web`
- `npm exec nx test opticv-web`
- `npm exec nx build opticv-web`
- Manual: run an optimization, select a missing keyword with `experience_bullet` placement, pick a position, reload the page in stored mode, confirm the position is still selected in the dropdown.
