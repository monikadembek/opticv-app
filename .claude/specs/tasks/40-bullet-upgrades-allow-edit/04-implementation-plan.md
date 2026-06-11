# Implementation Plan

Task ID: 40-bullet-upgrades-allow-edit
Spec: 02-spec.md | Review: 03-spec-review.md (PASS WITH ISSUES — all open items resolved below)

---

## Resolved open items from review

- **PATCH error handling**: on failure, show a PrimeNG `Toast` error message; do not block the UI (the local edit is already applied).
- **Empty-save backend payload**: when the user saves an empty textarea, remove the key from the local `bulletEdits` map and omit it from `BulletUserState.edits`; the PATCH is still called so the backend reflects the cleared state.
- **Parse-error fallback on load**: if `userEditedOutput` cannot be parsed as `BulletUserState`, log a `console.warn` and continue with empty edits/selections (silent graceful degradation).

---

## Files to change

### Created
- `packages/shared/datatypes/src/lib/datatypes.ts` ← two new exported types appended

### Modified
1. `packages/shared/datatypes/src/lib/datatypes.ts`
2. `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts`
3. `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html`
4. `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.spec.ts`
5. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
6. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
7. `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`

---

## Step 1 — Add shared types

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Append after the `UserSelections` type (end of file):

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

No other changes to this file.

---

## Step 2 — Update `applySelectionsToCV`

**File:** `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`

**What changes:**

Add a fourth parameter `bulletEdits: Map<string, string>` (key = `${company}|${title}|${originalText}`, value = user's edited text).

In the bullet substitution loop, before using `bulletItem.rewrittenText`, check whether `bulletEdits` contains an entry for the current key. If yes, use the edited text; if no, fall back to `bulletItem.rewrittenText`.

Callers must pass the new argument.

**Signature change:**
```ts
export function applySelectionsToCV(
  cv: CvStructuredData,
  selections: UserSelections,
  summaryResult: SummaryRewriteResult | null,
  bulletResult: BulletUpgradeResult | null,
  keywordResult: KeywordGapResult | null,
  bulletEdits: Map<string, string>,
): CvStructuredData
```

The `mergedCv` computed in `CvOptimization` is the only call site — pass `this.bulletEdits()` as the sixth argument.

---

## Step 3 — Add signals and persist logic to `CvOptimization`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

### 3a — New imports

Add to the `@opticv/datatypes` import:
- `BulletUserState`

Add to Angular core imports if not already present:
- `debounceTime`, `Subject` from `rxjs`

Add `MessageService` from `primeng/api` and `ToastModule` from `primeng/toast` to the component imports array (for error toasts).

### 3b — New signals

```ts
readonly bulletEdits = signal<Map<string, string>>(new Map());
readonly bulletUpgradeResultId = signal<string | null>(null);
readonly activeBulletEditKey = signal<string | null>(null);
readonly editedBulletText = signal<string>('');
```

### 3c — Private persist subject (debounce for selection-toggle calls)

```ts
private readonly persistSubject = new Subject<void>();
```

Wire it in `ngOnInit` (or constructor):
```ts
this.persistSubject
  .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
  .subscribe(() => this.persistBulletState());
```

### 3d — `mergedCv` computed — add sixth argument

```ts
readonly mergedCv = computed<CvStructuredData | null>(() => {
  const cv = this.cvStructuredData();
  if (!cv) return null;
  return applySelectionsToCV(
    cv,
    this.selections(),
    this.summaryRewriteResult(),
    this.bulletUpgradeResult(),
    this.keywordGapResult(),
    this.bulletEdits(),
  );
});
```

### 3e — Load stored state

In `loadStoredOptimization()`, after building `resultMap`, capture the BULLET_UPGRADE record id and parse `userEditedOutput`:

```
for each result in results:
  if result.promptType === PromptType.BULLET_UPGRADE:
    this.bulletUpgradeResultId.set(result.id)
    if result.userEditedOutput is not null:
      try parse result.userEditedOutput as BulletUserState
        set this.bulletEdits() from state.edits
        set selections.selectedBullets from state.selectedBullets
      catch:
        console.warn('Could not parse bullet user state')
```

The `bulletEdits` signal is a `Map<string, string>` — construct it from `state.edits` using key `${e.company}|${e.title}|${e.originalText}`.

### 3f — `persistBulletState()` private method

Build a `BulletUserState` from current `bulletEdits()` and `selections().selectedBullets`, call `cvOptimizationApiService.saveUserOutput(id, JSON.stringify(state))`.

On error: call `MessageService.add({ severity: 'error', summary: 'Could not save changes', detail: 'Your edits are still applied locally.' })`.

Only call if `bulletUpgradeResultId()` is not null.

### 3g — `onBulletToggled` — add persist trigger

After updating `selections`, call `this.persistSubject.next()`.

### 3h — New handlers for editor events

```ts
onBulletEditStarted(key: string): void
  // Cancel any existing open editor (discard in-flight text)
  this.activeBulletEditKey.set(key)
  const existing = this.bulletEdits().get(key) ?? null
  this.editedBulletText.set(existing ?? /* resolved from bulletUpgradeResult */ '')

onBulletEditTextChanged(text: string): void
  this.editedBulletText.set(text)

onBulletEditCancelled(): void
  this.activeBulletEditKey.set(null)
  this.editedBulletText.set('')

onBulletEditSaved(event: { key: string; text: string }): void
  const trimmed = event.text.trim()
  this.bulletEdits.update(map => {
    const next = new Map(map)
    if (trimmed === '') next.delete(event.key)
    else next.set(event.key, trimmed)
    return next
  })
  this.activeBulletEditKey.set(null)
  this.editedBulletText.set('')
  this.persistBulletState()   // immediate — not debounced
```

For `onBulletEditStarted`: to resolve the pre-fill text, look up the bullet in `bulletUpgradeResult()` using the key parts. Extract the matching `rewrittenText` as the fallback.

### 3i — Reset on new optimization run

In `runOptimization()`, reset new signals alongside existing ones:
```ts
this.bulletEdits.set(new Map())
this.bulletUpgradeResultId.set(null)
this.activeBulletEditKey.set(null)
this.editedBulletText.set('')
```

### 3j — Export guard

In `exportCvAsPdf()` and `exportCvAsDocx()`, before proceeding, call `onBulletEditCancelled()` to close any open editor.

### 3k — Add `MessageService` to providers

`MessageService` must be provided in the component (or its parent feature module route). Add it to `providers: [MessageService]` in the `@Component` decorator and add `<p-toast />` to the template.

---

## Step 4 — Update `BulletRewriter` component

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts`

### New imports
- `FormsModule` from `@angular/forms` (for `[(ngModel)]` on textarea — or use two-way binding via input/output instead; follow the conventions which prefer reactive forms — use the output event approach, no ngModel)

### New inputs
```ts
readonly bulletEdits = input<Map<string, string>>(new Map());
readonly activeBulletEditKey = input<string | null>(null);
readonly editedBulletText = input<string>('');
```

### New outputs
```ts
readonly editStarted = output<string>();
readonly editSaved = output<{ key: string; text: string }>();
readonly editCancelled = output<void>();
readonly editTextChanged = output<string>();
```

### New helper method
```ts
bulletKey(company: string, title: string, originalText: string): string
  return `${company}|${title}|${originalText}`

getDisplayText(company: string, title: string, originalText: string, aiText: string): string
  return this.bulletEdits().get(this.bulletKey(company, title, originalText)) ?? aiText

isEditing(company: string, title: string, originalText: string): boolean
  return this.activeBulletEditKey() === this.bulletKey(company, title, originalText)

isEdited(company: string, title: string, originalText: string): boolean
  return this.bulletEdits().has(this.bulletKey(company, title, originalText))
```

---

## Step 5 — Update `BulletRewriter` template

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html`

Changes are confined to the `@case ('rewrite')` block where `bullet.rewrittenText` exists.

### Replace the static rewritten-text display

Current:
```html
<p class="text-sm text-surface-800">
  <span class="font-semibold">Rewritten version:</span><br />
  {{ bullet.rewrittenText }}
</p>
```

Replace with a conditional block:

1. **Pencil button** — always visible (not editing): a small icon-only `p-button` with `severity="secondary"` and `text` appearance, `icon="pi pi-pencil"`, `aria-label="Edit rewritten bullet"`. On click emit `editStarted` with the bullet key.

2. **"Edited" badge** — visible only when `isEdited(...)` is true: a small inline badge using `bg-blue-100 text-blue-700` styling similar to existing badges, text "Edited". Placed next to the pencil icon or the label.

3. **Display mode** (not editing): show `getDisplayText(company, title, originalText, bullet.rewrittenText)` in place of the raw `bullet.rewrittenText`.

4. **Edit mode** (`@if (isEditing(...))`): replace the paragraph with:
   - A `<textarea>` (using `pTextarea` directive, `autoResize`) bound one-way to `editedBulletText()` as `[value]` and emitting `editTextChanged` on `(input)`.
   - A row of two `p-button` elements below: **Save** (primary) emitting `editSaved` with `{ key, text: editedBulletText() }`, and **Cancel** (secondary, text) emitting `editCancelled`.
   - `aria-label="Edit rewritten bullet text"` on the textarea.

The pencil button must be hidden while in edit mode for this specific bullet (use `@if (!isEditing(...))`).

---

## Step 6 — Update parent template bindings

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Find the `<app-bullet-rewriter>` usage (line ~255–259) and add the new bindings:

```html
<app-bullet-rewriter
  [result]="result"
  [selectedBullets]="selections().selectedBullets"
  [bulletEdits]="bulletEdits()"
  [activeBulletEditKey]="activeBulletEditKey()"
  [editedBulletText]="editedBulletText()"
  (bulletToggled)="onBulletToggled($event)"
  (editStarted)="onBulletEditStarted($event)"
  (editSaved)="onBulletEditSaved($event)"
  (editCancelled)="onBulletEditCancelled()"
  (editTextChanged)="onBulletEditTextChanged($event)"
/>
```

Add `<p-toast />` anywhere inside the root `<div>` (top of template is fine).

---

## Step 7 — Update tests

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.spec.ts`

All existing tests continue to pass without change (new inputs have defaults).

Add a new `describe('inline editing')` block with these cases:

1. **Edit button is rendered** for a `rewrite` bullet that has `rewrittenText`.
2. **Edit button is NOT rendered** when `rewrittenText` is absent.
3. **Clicking the edit button emits `editStarted`** with the correct bullet key string.
4. **When `activeBulletEditKey` matches the bullet, textarea is shown** and the display paragraph is hidden.
5. **Textarea value reflects `editedBulletText` input**.
6. **Save button emits `editSaved`** with `{ key, text }`.
7. **Cancel button emits `editCancelled`**.
8. **`editTextChanged` is emitted on textarea input event**.
9. **"Edited" badge is shown** when `bulletEdits` map contains an entry for the bullet.
10. **"Edited" badge is NOT shown** when the map has no entry.
11. **`getDisplayText` returns edited text** when key is in `bulletEdits`, otherwise returns `rewrittenText`.

---

## Implementation order

Execute steps in this order to keep the build green at each point:

1. Step 1 (shared types — no consumers yet)
2. Step 2 (update `applySelectionsToCV` signature + implementation)
3. Step 3 (update `CvOptimization` — fixes the call site; add signals/handlers)
4. Step 4 (update `BulletRewriter` TS — new inputs/outputs/helpers)
5. Step 5 (update `BulletRewriter` template)
6. Step 6 (update parent template bindings)
7. Step 7 (update tests)

Run `npm exec nx run-many -t typecheck` after step 3 and after step 6 to catch any type drift early.
