# Implementation Plan — Task 53: Reset selected summary rewrite

## Overview

Add a Reset button to the `SummaryRewrite` component that deselects the active variant, clears the editable textarea, and returns the component to its unselected state. All changes are frontend-only and confined to two files plus their test files.

---

## Files to Modify

| File | Change type |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.ts` | Modify |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.html` | Modify |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Modify |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Modify |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.spec.ts` | Modify |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Modify |

---

## Step 1 — `summary-rewrite.ts`: Add `angleReset` output and fix `editableText` reset

### 1a. Add the output

Add `angleReset = output<void>()` alongside the existing outputs.

### 1b. Add a `resetVariant()` method

Add a method that emits `angleReset`:

```ts
resetVariant(): void {
  this.angleReset.emit();
}
```

### 1c. Extend the existing `effect()` to handle the `null` case

The current effect in the constructor sets `editableText` only when `selectedVariantText()` is non-null. Extend it to also reset to `''` when `selectedVariantText()` is `null`:

```ts
effect(() => {
  const text = this.selectedVariantText();
  this.editableText.set(text ?? '');
});
```

This resolves spec review issue #1 (the undecided fork) by extending the existing effect rather than adding a second one.

---

## Step 2 — `summary-rewrite.html`: Add Reset button to the editor section

Inside the `@if (selectedAngle())` block, locate the confirmation message row (`<div class="flex items-center gap-2 text-sm text-green-700 font-semibold">`).

Add `justify-between` to that div's class list so the message and button sit at opposite ends of the row.

Add a PrimeNG `p-button` after the confirmation `<span>`, using:
- `label="Reset"`
- `severity="secondary"`
- `size="small"`
- `icon="pi pi-times"`
- `(onClick)="resetVariant()"`
- `ariaLabel="Reset summary selection"`

The button renders to the right of the confirmation text via `justify-between`.

---

## Step 3 — `cv-optimization.ts`: Add `onAngleReset()` handler

Add the handler adjacent to `onAngleSelected()`:

```ts
onAngleReset(): void {
  this.selections.update((s) => ({
    ...s,
    selectedSummaryAngle: null,
    customSummaryText: null,
  }));
}
```

---

## Step 4 — `cv-optimization.html`: Wire up the new output

In the `<app-summary-rewrite>` binding (around line 169–174), add:

```html
(angleReset)="onAngleReset()"
```

alongside the existing `(angleSelected)` and `(summaryTextEdited)` bindings.

---

## Step 5 — `summary-rewrite.spec.ts`: Add unit tests

Add the following test cases to the existing `describe('SummaryRewrite')` block:

1. **Editor section is hidden when no angle is selected (baseline)**
   - No `selectedAngle` input set → the editor `div` should not be present in the DOM.

2. **Editor section is shown when an angle is selected**
   - Set `selectedAngle` to `'achievement_led'` → confirm the confirmation message appears.

3. **Reset button is present when a variant is selected**
   - Set `selectedAngle` to `'achievement_led'` → query for a button with `aria-label="Reset summary selection"` → expect it to exist.

4. **Reset button is absent when no variant is selected**
   - No `selectedAngle` set → query for the reset button → expect it to be null.

5. **Clicking Reset emits `angleReset`**
   - Set `selectedAngle` to `'achievement_led'`, subscribe to `component.angleReset`, click the reset button → expect the output to have emitted once.

---

## Step 6 — `cv-optimization.spec.ts`: Add unit test for `onAngleReset()`

Add a new `describe` block (or add to existing selection-related group) with:

1. **`onAngleReset()` clears `selectedSummaryAngle` and `customSummaryText`**
   - Call `component.onAngleSelected('achievement_led')` to set state.
   - Then call `component.onAngleReset()`.
   - Assert `component.selections().selectedSummaryAngle` is `null`.
   - Assert `component.selections().customSummaryText` is `null`.

2. **`onAngleReset()` preserves other selections (bullets, keywords)**
   - Set up selections with `selectedBullets` and `selectedKeywords` populated.
   - Call `component.onAngleReset()`.
   - Assert `selectedBullets` and `selectedKeywords` are unchanged.

---

## Execution Order

1. Step 1 (`summary-rewrite.ts`)
2. Step 2 (`summary-rewrite.html`)
3. Step 3 (`cv-optimization.ts`)
4. Step 4 (`cv-optimization.html`)
5. Step 5 (`summary-rewrite.spec.ts`)
6. Step 6 (`cv-optimization.spec.ts`)
7. Run `npm exec nx test opticv-web` — all tests must pass
8. Run `npm exec nx build opticv-web` — build must pass
