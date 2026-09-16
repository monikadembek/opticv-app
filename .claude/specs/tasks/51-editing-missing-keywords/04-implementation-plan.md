# Implementation Plan — Task 51: Editing missing keywords

## Source

Spec: `02-spec.md` | Review: `03-spec-review.md` (PASS WITH ISSUES — no critical blockers)

## Resolved ambiguities (from review)

- **Empty-save**: keep edit mode open, do not save.
- **Unchanged text save**: remove existing entry from `keywordEdits` Map (don't add a new one); no "Edited" badge shown.
- **Edited badge**: implemented as inferred from bullet-rewriter reference; treated as an explicit assumption.
- **One active edit at a time**: keyword edit state is fully independent from bullet edit state (separate signals); both can exist simultaneously without conflict.
- **Hydration**: loaded in `loadStoredOptimization()` the same way bullet edits are hydrated — by parsing the `BulletUserState` JSON stored in `userEditedOutput` on the `BULLET_UPGRADE` result.

---

## Files to modify

| # | File | Change type |
|---|------|-------------|
| 1 | `packages/shared/datatypes/src/lib/datatypes.ts` | Modify — add `keywordEdits` to `BulletUserState` |
| 2 | `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` | Modify — add inputs, outputs, helper methods |
| 3 | `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` | Modify — add Edit button, textarea, Save/Cancel, Edited badge |
| 4 | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Modify — add signals, handlers, hydration, persistence |
| 5 | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Modify — wire new inputs/outputs to `<app-keyword-gap>` |
| 6 | `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` | Modify — use edited keyword text in CV export |

---

## Step 1 — Extend `BulletUserState` in `datatypes.ts`

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Add `keywordEdits` as an optional array field to `BulletUserState` (optional for backwards compatibility with stored JSON that predates this change):

```
keywordEdits?: Array<{ originalKeyword: string; editedText: string }>;
```

This is the serialized representation of the `Map<string, string>` held in memory. The field is optional so that existing stored payloads without it can still be parsed without errors.

---

## Step 2 — Update `keyword-gap.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`

### 2a. Add imports

Add `ButtonModule` from `primeng/button` and `TextareaModule` from `primeng/textarea` to the `imports` array of the component decorator.

### 2b. Add inputs

```
readonly keywordEdits = input<Map<string, string>>(new Map());
readonly activeKeywordEditKey = input<string | null>(null);
readonly editedKeywordText = input<string>('');
```

### 2c. Add outputs

```
readonly keywordEditStarted = output<string>();
readonly keywordEditSaved = output<{ key: string; text: string }>();
readonly keywordEditCancelled = output<void>();
readonly keywordEditTextChanged = output<string>();
```

### 2d. Add helper methods

**`isEditingKeyword(keyword: string): boolean`**
Returns `this.activeKeywordEditKey() === keyword`.

**`isEditedKeyword(keyword: string): boolean`**
Returns `this.keywordEdits().has(keyword)`.

**`getKeywordDisplayText(keyword: string): string`**
Returns `this.keywordEdits().get(keyword) ?? keyword`.

---

## Step 3 — Update `keyword-gap.html`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html`

Apply identical changes to both missing keyword list sections: "Likely have — add to your CV" (`@for` over `missingLikelyHas()`) and "Skills to acquire or omit" (`@for` over `missingGenuinelyLacks()`).

### 3a. Keyword label row — add Edit button and Edited badge

Inside the `<div class="flex items-center gap-2 flex-wrap">` that holds the checkbox, importance badge, keyword `<label>`, and placement badge, add after the keyword label:

1. **Edited badge** — shown when `isEditedKeyword(item.keyword)` is true:
   ```
   @if (isEditedKeyword(item.keyword)) {
     <span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 font-medium">Edited</span>
   }
   ```

2. **Edit button** — shown when NOT editing this keyword (`!isEditingKeyword(item.keyword)`). Place before the `ml-auto` placement badge or after the Edited badge:
   ```
   @if (!isEditingKeyword(item.keyword)) {
     <p-button
       type="button"
       variant="outlined"
       severity="success"
       size="small"
       class="py-0!"
       (click)="keywordEditStarted.emit(item.keyword)"
       aria-label="Edit keyword"
     >
       <i class="pi pi-pencil text-xs!"></i> Edit
     </p-button>
   }
   ```

   The `ml-auto` placement badge currently sits on the far right. Keep it rightmost — place the Edit button and Edited badge before it in the flex row.

### 3b. Below the keyword label row — add edit section

After the closing `</div>` of the `flex items-center` row (but still inside the `<li>`), add:

```
@if (isEditingKeyword(item.keyword)) {
  <div class="space-y-2 mt-2">
    <input
      pInputText
      type="text"
      [value]="editedKeywordText()"
      (input)="keywordEditTextChanged.emit($any($event.target).value)"
      class="w-full text-sm"
      aria-label="Edit keyword text"
    />
    <div class="flex gap-2">
      <p-button
        label="Save"
        size="small"
        (onClick)="keywordEditSaved.emit({ key: item.keyword, text: editedKeywordText() })"
      />
      <p-button
        label="Cancel"
        size="small"
        severity="secondary"
        [text]="true"
        (onClick)="keywordEditCancelled.emit()"
      />
    </div>
  </div>
}
```

### 3c. Keyword display text

The keyword `<label>` currently shows `{{ item.keyword }}`. Change it to show the display text:

```
{{ getKeywordDisplayText(item.keyword) }}
```

This means the label text reflects any saved edit. The `[for]` attribute still references `item.keyword` (unchanged), so the checkbox association remains correct.

> Note: The `pInputText` directive requires `InputTextModule` from `primeng/inputtext`. Add it to the component's `imports` array in Step 2a.

---

## Step 4 — Update `cv-optimization.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

### 4a. Add signals

Add three new signals alongside the existing bullet edit signals (after `missingBulletEdits`):

```
readonly keywordEdits = signal<Map<string, string>>(new Map());
readonly activeKeywordEditKey = signal<string | null>(null);
readonly editedKeywordText = signal<string>('');
```

### 4b. Reset signals in `runOptimization()`

In the `runOptimization()` method, after the existing signal resets, add:

```
this.keywordEdits.set(new Map());
this.activeKeywordEditKey.set(null);
this.editedKeywordText.set('');
```

### 4c. Add handler methods

Add four handler methods, modelled directly on the `onBulletEdit*` methods:

**`onKeywordEditStarted(keyword: string): void`**
- Sets `activeKeywordEditKey` to `keyword`.
- Sets `editedKeywordText` to `this.keywordEdits().get(keyword) ?? keyword`.

**`onKeywordEditTextChanged(text: string): void`**
- Sets `editedKeywordText` to `text`.

**`onKeywordEditCancelled(): void`**
- Sets `activeKeywordEditKey` to `null`.
- Sets `editedKeywordText` to `''`.

**`onKeywordEditSaved(event: { key: string; text: string }): void`**
- Trims `event.text`.
- If trimmed is empty: do nothing (keep edit mode open — do NOT update state or call `persistBulletState()`). Return early.
- If trimmed equals `event.key` (unchanged original): remove the key from `keywordEdits` Map (delete existing entry if any).
- Otherwise: set `keywordEdits.get(event.key)` to trimmed text.
- After Map update: set `activeKeywordEditKey` to `null`, set `editedKeywordText` to `''`.
- Call `this.persistBulletState()`.

### 4d. Hydrate keyword edits in `loadStoredOptimization()`

Inside the `if (r.promptType === PromptType.BULLET_UPGRADE)` block, after the existing hydration of `missingBulletEdits`, add:

```
const keywordEditsMap = new Map<string, string>();
for (const e of state.keywordEdits ?? []) {
  keywordEditsMap.set(e.originalKeyword, e.editedText);
}
this.keywordEdits.set(keywordEditsMap);
```

### 4e. Persist keyword edits in `persistBulletState()`

Inside `buildAndSave()`, add `keywordEdits` to the `BulletUserState` object before the `saveUserOutput` call:

```
const keywordEditsArr: Array<{ originalKeyword: string; editedText: string }> = [];
for (const [originalKeyword, editedText] of this.keywordEdits()) {
  keywordEditsArr.push({ originalKeyword, editedText });
}
```

Add `keywordEdits: keywordEditsArr` to the `state` object passed to `JSON.stringify`.

---

## Step 5 — Update `cv-optimization.html`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Extend the `<app-keyword-gap>` element with the four new inputs and four new output bindings:

```html
<app-keyword-gap
  [result]="keywordGapResult()!"
  [selectedKeywords]="selections().selectedKeywords"
  [keywordEdits]="keywordEdits()"
  [activeKeywordEditKey]="activeKeywordEditKey()"
  [editedKeywordText]="editedKeywordText()"
  (keywordToggled)="onKeywordToggled($event)"
  (keywordEditStarted)="onKeywordEditStarted($event)"
  (keywordEditSaved)="onKeywordEditSaved($event)"
  (keywordEditCancelled)="onKeywordEditCancelled()"
  (keywordEditTextChanged)="onKeywordEditTextChanged($event)"
/>
```

---

## Step 6 — Update `apply-selections.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`

The existing `applySelectionsToCV` uses `kw` (the original keyword string) to look up the `missingKeywords` entry and add it to `clone.skills`. With keyword edits, the text added to the CV must be the edited version.

### 6a. Add parameter

Add `keywordEdits: Map<string, string> = new Map()` as a new last parameter.

### 6b. Update keyword-to-skills logic

In the `selections.selectedKeywords` loop, change the text pushed to `clone.skills` from `kw` to `keywordEdits.get(kw) ?? kw`:

```
const displayText = keywordEdits.get(kw) ?? kw;
if (!existing.has(displayText.toLowerCase())) {
  clone.skills.push(displayText);
  existing.add(displayText.toLowerCase());
}
```

> The `existing` Set check still uses the original `kw.toLowerCase()` for the lookup (to avoid duplicate-detection misses when the original is already present), but the pushed value is the edited text.

Actually, to be precise: the `existing` Set should check the `displayText.toLowerCase()` to avoid adding a visually different but same-original keyword twice. Update the Set membership check to use `displayText.toLowerCase()`.

### 6c. Update call site in `cv-optimization.ts`

In `mergedCv = computed(...)`, pass `this.keywordEdits()` as the new last argument to `applySelectionsToCV`.

---

## Acceptance checklist

- [ ] `npm exec nx build opticv-web` passes
- [ ] `npm exec nx typecheck opticv-web` passes
- [ ] `npm exec nx lint opticv-web` passes
- [ ] Edit button appears on each missing keyword row in both subsections
- [ ] Clicking Edit shows a text input pre-filled with current keyword text (edited if previously saved, original otherwise) and Save/Cancel buttons
- [ ] Cancel closes edit section; no state changes
- [ ] Save with empty/whitespace input: edit section stays open, no changes saved
- [ ] Save with unchanged text: closes edit, removes existing Map entry, no Edited badge
- [ ] Save with new text: closes edit, stores edit, shows Edited badge, calls `saveUserOutput`
- [ ] Keyword label shows edited text after save
- [ ] Only one keyword in edit mode at a time (opening a second closes the first)
- [ ] Keyword edits survive page reload (hydrated from API response)
- [ ] Edited keyword text is used in CV export (via `applySelectionsToCV`)
- [ ] No breaking changes to keyword selection (checkbox), bullet editing, or other features
- [ ] Keyword edit state is independent of bullet edit state (no shared signals)
