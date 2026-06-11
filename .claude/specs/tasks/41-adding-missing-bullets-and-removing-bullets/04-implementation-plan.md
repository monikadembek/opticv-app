# Implementation Plan

## Task ID: 41-adding-missing-bullets-and-removing-bullets

---

## Review issues resolved in this plan

- **Non-critical #1 (undeclared `MissingBulletSelectionKey`)**: Do NOT introduce a named type. Use the inline anonymous type `{ forPosition: string; suggestedBullet: string }` consistently everywhere. Remove the `MissingBulletSelectionKey` name from the spec's Behavior section — it does not appear in code.
- **Non-critical #2 (pre-fill resolution for `onMissingBulletEditStarted`)**: The handler receives a composite key string `"${forPosition}|${suggestedBullet}"`. Split on the **first** pipe only (use `key.indexOf('|')`) since `forPosition` and `suggestedBullet` may themselves contain `|`. Look up the fallback text from `bulletUpgradeResult().missingBulletSuggestions` by matching both `forPosition` and `suggestedBullet`.
- **Non-critical #3 (Map mutation in signals)**: The existing pattern in `cv-optimization.ts` already creates a new `Map` instance on every update (`new Map(map)`). Follow the same pattern for `missingBulletEdits`.
- **Ambiguity #2 (cancel output)**: Use the **existing** `editCancelled` output for both rewrite and missing-bullet editors. Do NOT add `missingBulletEditCancelled`. The parent already handles `onBulletEditCancelled()` which resets `activeBulletEditKey` and `editedBulletText` — it works for both editor types.
- **Ambiguity #1 (border color for recommend_cut)**: Use `border-red-400` when checked (remove the "/ amber" ambiguity).

---

## Files to modify

1. `packages/shared/datatypes/src/lib/datatypes.ts`
2. `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`
3. `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts`
4. `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html`
5. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

No new files. No backend changes.

---

## Step 1 — Extend `BulletUserState` in shared types

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Locate the `BulletUserState` type (currently lines 421–424). Replace it with:

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

Both new fields are required (not `?`) in the type — callers always pass them. Backward-compat with old persisted JSON is handled in the consumer via `?? []`.

---

## Step 2 — Extend `applySelectionsToCV()`

**File:** `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`

### 2a. Add three new parameters to the function signature (with defaults)

After the existing `bulletEdits` parameter, add:

```ts
removedBullets: BulletSelectionKey[] = [],
selectedMissingBullets: Array<{ forPosition: string; suggestedBullet: string }> = [],
missingBulletEdits: Map<string, string> = new Map(),
```

### 2b. Apply removals — insert **before** the existing `selectedBullets` block

After cloning the CV and before the summary block, add:

For each entry in `removedBullets`:
- Find the `experience` entry where `e.company === key.company && e.title === key.title`.
- If found, filter out the bullet where `b.trim() === key.originalText.trim()`.

### 2c. Apply missing bullet additions — insert **after** the existing `selectedBullets` block

For each entry in `selectedMissingBullets`:
- Compute `missingKey = \`${entry.forPosition}|${entry.suggestedBullet}\``.
- Resolve text: `missingBulletEdits.get(missingKey) ?? entry.suggestedBullet`.
- Find the matching `experience` entry where `\`${e.title} at ${e.company}\` === entry.forPosition`.
- If found, push the resolved text to `clone.experience[idx].bullets`.
- If not found, skip silently.

---

## Step 3 — Extend `BulletRewriter` component class

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts`

### 3a. Add new inputs

```ts
readonly selectedMissingBullets = input<Array<{ forPosition: string; suggestedBullet: string }>>([]);
readonly missingBulletEdits = input<Map<string, string>>(new Map());
readonly removedBullets = input<BulletSelectionKey[]>([]);
```

### 3b. Add new outputs

```ts
readonly missingBulletToggled = output<{ forPosition: string; suggestedBullet: string }>();
readonly missingBulletEditStarted = output<string>();
readonly missingBulletEditSaved = output<{ key: string; text: string }>();
readonly removedBulletToggled = output<BulletSelectionKey>();
```

Note: `editCancelled` (existing) is **reused** for missing-bullet editor cancel — no new cancel output.

### 3c. Add new helper methods

```ts
missingBulletKey(forPosition: string, suggestedBullet: string): string
// returns `${forPosition}|${suggestedBullet}`

isMissingSelected(forPosition: string, suggestedBullet: string): boolean
// checks selectedMissingBullets() array for matching entry

isMissingEdited(forPosition: string, suggestedBullet: string): boolean
// checks missingBulletEdits() map has key missingBulletKey(...)

isMissingEditing(forPosition: string, suggestedBullet: string): boolean
// activeBulletEditKey() === missingBulletKey(...)

getMissingDisplayText(forPosition: string, suggestedBullet: string): string
// returns missingBulletEdits().get(missingBulletKey(...)) ?? suggestedBullet

isRemovedBullet(company: string, title: string, originalText: string): boolean
// checks removedBullets() array for matching entry
```

---

## Step 4 — Update `bullet-rewriter.html`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html`

### 4a. Update the `@case ('recommend_cut')` block (currently lines 158–174)

Replace the current read-only div with an interactive card:

Structure:
```
<li> with [class.border-red-400]="isRemovedBullet(...)"
  <label> (flex, items-start, gap-3, cursor-pointer)
    <input type="checkbox"
      [checked]="isRemovedBullet(position.company, position.title, bullet.originalText)"
      (change)="removedBulletToggled.emit({ company: position.company, title: position.title, originalText: bullet.originalText })"
      [attr.aria-label]="'Remove bullet at ' + position.title + ' — ' + position.company"
      class="accent-primary-500 mt-0.5 shrink-0"
    />
    <div class="space-y-1 flex-1">
      <div class="flex items-center gap-2">
        <span badge "Suggested: remove" (existing amber badge, keep as-is)>
        @if (isRemovedBullet(...)) {
          <span badge "Will be removed" class red badge>
        }
      </div>
      <p class="text-sm text-surface-700">{{ bullet.originalText }}</p>
      @if (bullet.cutReason) {
        <p class="text-xs text-surface-500">{{ bullet.cutReason }}</p>
      }
    </div>
  </label>
```

The `<li>` already has a `[class.border-green-400]` binding scoped to `action === 'rewrite'`. The recommend_cut `<li>` should get its own `[class.border-red-400]` binding.

### 4b. Replace the Missing Bullet Suggestions section (currently lines 192–222)

Replace the current read-only card (`<div class="rounded-lg border ...">`) with an interactive card per suggestion:

Structure:
```
<li> or <div>
  [class.border-green-400]="isMissingSelected(suggestion.forPosition, suggestion.suggestedBullet)"

  <label> (flex, items-start, gap-3, cursor-pointer)
    <input type="checkbox"
      [checked]="isMissingSelected(suggestion.forPosition, suggestion.suggestedBullet)"
      (change)="missingBulletToggled.emit({ forPosition: suggestion.forPosition, suggestedBullet: suggestion.suggestedBullet })"
      [attr.aria-label]="'Add suggested bullet for ' + suggestion.forPosition"
      class="accent-primary-500 mt-0.5 shrink-0"
    />
    <div class="space-y-2 flex-1">
      <!-- Position label -->
      <p class="text-sm font-medium text-surface-700">{{ suggestion.forPosition }}</p>

      <!-- Suggested bullet text + pencil icon (pencil only when selected and not editing) -->
      <div class="flex items-center gap-2">
        <span class="font-semibold text-sm">Suggested bullet:</span>
        @if (isMissingEdited(suggestion.forPosition, suggestion.suggestedBullet)) {
          <span "Edited" badge (blue, same as rewrite)>
        }
        @if (isMissingSelected(...) && !isMissingEditing(...)) {
          <button pencil icon (click)="missingBulletEditStarted.emit(missingBulletKey(suggestion.forPosition, suggestion.suggestedBullet))"
            aria-label="Edit suggested bullet">
        }
      </div>

      <!-- Editor (when editing) -->
      @if (isMissingEditing(suggestion.forPosition, suggestion.suggestedBullet)) {
        <textarea pTextarea [autoResize]="true" [value]="editedBulletText()" (input)="editTextChanged.emit(...)">
        <div class="flex gap-2">
          <p-button label="Save" size="small"
            (onClick)="missingBulletEditSaved.emit({ key: missingBulletKey(...), text: editedBulletText() })" />
          <p-button label="Cancel" size="small" severity="secondary" [text]="true"
            (onClick)="editCancelled.emit()" />   <!-- reuse existing editCancelled -->
        </div>
      } @else {
        <p class="text-sm text-surface-800">
          {{ getMissingDisplayText(suggestion.forPosition, suggestion.suggestedBullet) }}
        </p>
      }

      <!-- Rationale and question (always visible) -->
      @if (suggestion.rationale) { <p class="text-xs italic text-surface-500">{{ suggestion.rationale }}</p> }
      <div class="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
        {{ suggestion.questionToAskUser }}
      </div>
    </div>
  </label>
```

The outer loop changes from `<div class="rounded-lg border ...">` to the same pattern — keep `space-y-4` wrapper.

---

## Step 5 — Extend `cv-optimization.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

### 5a. Add new signals (after `editedBulletText`)

```ts
readonly selectedMissingBullets = signal<Array<{ forPosition: string; suggestedBullet: string }>>([]);
readonly missingBulletEdits = signal<Map<string, string>>(new Map());
readonly removedBullets = signal<BulletSelectionKey[]>([]);
```

### 5b. Reset new signals in `runOptimization()`

After `this.editedBulletText.set('')`, add:

```ts
this.selectedMissingBullets.set([]);
this.missingBulletEdits.set(new Map());
this.removedBullets.set([]);
```

### 5c. Extend `loadStoredOptimization()` — inside the `BULLET_UPGRADE` block

After restoring `state.edits` and `state.selectedBullets`, add:

```ts
this.selectedMissingBullets.set(state.selectedMissingBullets ?? []);

const missingEditsMap = new Map<string, string>();
for (const s of state.selectedMissingBullets ?? []) {
  if (s.editedText !== undefined) {
    missingEditsMap.set(`${s.forPosition}|${s.suggestedBullet}`, s.editedText);
  }
}
this.missingBulletEdits.set(missingEditsMap);

this.removedBullets.set(state.removedBullets ?? []);
```

### 5d. Add new event handlers

**`onMissingBulletToggled(key: { forPosition: string; suggestedBullet: string }): void`**

- Add/remove from `selectedMissingBullets` signal (check existence by comparing both fields).
- Call `this.persistSubject.next()`.

**`onMissingBulletEditStarted(key: string): void`**

- Call `this.activeBulletEditKey.set(key)`.
- Check `this.missingBulletEdits().get(key)` — if present, set `this.editedBulletText.set(existing)` and return.
- Otherwise: split key using `key.indexOf('|')` to get `forPosition` and `suggestedBullet`. Find the matching suggestion in `this.bulletUpgradeResult()?.missingBulletSuggestions`. Set `this.editedBulletText.set(suggestion?.suggestedBullet ?? '')`.

**`onMissingBulletEditSaved(event: { key: string; text: string }): void`**

- Trim the text.
- Update `missingBulletEdits` using `new Map(map)` pattern: set or delete the key depending on whether trimmed text is empty.
- Call `this.activeBulletEditKey.set(null)` and `this.editedBulletText.set('')`.
- Call `this.persistBulletState()` immediately (not debounced).

**`onRemovedBulletToggled(key: BulletSelectionKey): void`**

- Add/remove from `removedBullets` signal (match by `company`, `title`, `originalText`).
- Call `this.persistSubject.next()`.

Note: missing-bullet editor **cancel** reuses the existing `onBulletEditCancelled()` handler — no new method needed.

### 5e. Extend `persistBulletState()` — inside `buildAndSave`

After building `edits`, also build `selectedMissingBullets` for persistence:

```ts
const selectedMissingBullets = this.selectedMissingBullets().map((s) => {
  const key = `${s.forPosition}|${s.suggestedBullet}`;
  const editedText = this.missingBulletEdits().get(key);
  return editedText !== undefined
    ? { ...s, editedText }
    : s;
});
```

Then build `state`:

```ts
const state: BulletUserState = {
  edits,
  selectedBullets: this.selections().selectedBullets,
  selectedMissingBullets,
  removedBullets: this.removedBullets(),
};
```

### 5f. Update `mergedCv` computed

Pass the three new arguments to `applySelectionsToCV()`:

```ts
return applySelectionsToCV(
  cv,
  this.selections(),
  this.summaryRewriteResult(),
  this.bulletUpgradeResult(),
  this.keywordGapResult(),
  this.bulletEdits(),
  this.removedBullets(),
  this.selectedMissingBullets(),
  this.missingBulletEdits(),
);
```

### 5g. Wire new outputs in `cv-optimization.html`

On the `<app-bullet-rewriter>` element, add:

```html
[selectedMissingBullets]="selectedMissingBullets()"
[missingBulletEdits]="missingBulletEdits()"
[removedBullets]="removedBullets()"
(missingBulletToggled)="onMissingBulletToggled($event)"
(missingBulletEditStarted)="onMissingBulletEditStarted($event)"
(missingBulletEditSaved)="onMissingBulletEditSaved($event)"
(removedBulletToggled)="onRemovedBulletToggled($event)"
```

The existing `(editCancelled)="onBulletEditCancelled()"` binding already covers the missing-bullet cancel — no change needed.

---

## Step 6 — Update `canExportCv` computed (optional gate)

The existing check `s.selectedBullets.length > 0` gates export. Consider whether `selectedMissingBullets().length > 0` or `removedBullets().length > 0` should also enable export. Per spec, all selections affect the merged CV, so yes — update the condition:

```ts
s.selectedBullets.length > 0 ||
s.selectedKeywords.length > 0 ||
this.selectedMissingBullets().length > 0 ||
this.removedBullets().length > 0
```

---

## Implementation order

1. Step 1 — shared types (no deps)
2. Step 2 — `apply-selections.ts` (depends on updated types)
3. Step 3 — `bullet-rewriter.ts` (add inputs/outputs/helpers)
4. Step 4 — `bullet-rewriter.html` (uses new helpers)
5. Step 5 — `cv-optimization.ts` (signals, handlers, persist, mergedCv)
6. Step 5g — `cv-optimization.html` (wire new bindings)
7. Step 6 — `canExportCv` update

---

## Verification checklist

- [ ] `npm exec nx typecheck opticv-web` — no errors
- [ ] `npm exec nx lint opticv-web` — no errors
- [ ] `npm exec nx build opticv-web` — no errors
- [ ] Select a missing bullet → border turns green → persists on reload
- [ ] Edit a missing bullet → "Edited" badge → persists on reload
- [ ] Deselect a missing bullet → edit text is retained in map
- [ ] Select a `recommend_cut` bullet → border turns red → persists on reload
- [ ] Export CV includes added missing bullet appended at end of correct position
- [ ] Export CV excludes removed `recommend_cut` bullet
- [ ] Rewrite bullet editing (Task 40) still works unchanged
- [ ] Only one editor open at a time (opening missing-bullet editor closes any open rewrite editor)
