# Task Specification

## Source

Azure DevOps Task: 53 — Reset selected summary rewrite

## Goal

Add a "Reset" button inside the selected-variant editor section of the `SummaryRewrite` component that lets the user deselect the chosen variant, clear the editable textarea, and return to the original (unselected) state.

## Context

Located in:
- Component: `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.ts`
- Template: `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.html`
- Parent: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

When a user selects one of the three rewritten summary variants, `selectedAngle` (input signal) is set in the parent's `selections` signal and passed back into `SummaryRewrite`. The variant editor section (`@if (selectedAngle())`) then becomes visible. Currently there is no way to undo this selection.

## Scope

### In scope

- Add a `angleReset` output event to `SummaryRewrite`
- Add a Reset button inside the selected-variant editor section (the `@if (selectedAngle())` block)
- Handle the reset in the parent `CvOptimization` by clearing `selectedSummaryAngle` and `customSummaryText` back to `null`
- Ensure `editableText` local signal in `SummaryRewrite` is reset to `''` when the selection is cleared

### Out of scope

- Any visual "Original selected" indicator or highlighted Original card
- Persisting reset state to the backend
- Resetting bullet or keyword selections

## Behavior

1. The Reset button is rendered inside the selected-variant editor section, which is already gated by `@if (selectedAngle())`, so the button is only visible when a variant is selected.
2. The button is placed in the same row as the confirmation message (`angleLabels[selectedAngle()!] variant selected — edit below if needed`), aligned to the right of that row (`ml-auto`).
3. When clicked, the button emits the new `angleReset` output (no payload).
4. The parent `CvOptimization.onAngleReset()` handler updates the `selections` signal, setting both `selectedSummaryAngle` and `customSummaryText` to `null`.
5. Because `selectedAngle` input becomes `null`, the `@if (selectedAngle())` block collapses — hiding the textarea and the Reset button.
6. The variant cards return to their unselected visual state (no green border, radio buttons unchecked).
7. The `editableText` signal resets to `''`. The existing `effect()` only fires when `selectedVariantText()` is non-null, so an explicit reset is needed: extend the effect (or add a second one) to set `editableText` to `''` when `selectedVariantText()` is `null`.

## Edge Cases

- If the user has edited the textarea before resetting, both the edited text (`customSummaryText`) and the selected angle are cleared — the CV reverts to the original summary.
- Double-clicking Reset is harmless: the state is already `null` after the first click and the button is hidden.

## Data / API

No backend changes. State changes are local to the `selections` signal in `CvOptimization`:

```
selections.selectedSummaryAngle: SummaryRewriteVariantAngle | null  →  null
selections.customSummaryText: string | null                         →  null
```

New output on `SummaryRewrite`:

```typescript
readonly angleReset = output<void>();
```

New handler on `CvOptimization`:

```typescript
onAngleReset(): void {
  this.selections.update((s) => ({
    ...s,
    selectedSummaryAngle: null,
    customSummaryText: null,
  }));
}
```

Parent template wires it up:

```html
(angleReset)="onAngleReset()"
```

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- Selecting a variant then clicking Reset returns all three cards to the unselected state (no green border, radio unchecked)
- The textarea section is hidden after reset
- The CV preview reverts to the original summary after reset
- If the user had edited the textarea before resetting, the edited text is discarded
- Unit tests updated or added for `SummaryRewrite` (reset output emitted on click) and `CvOptimization` (`onAngleReset` clears both fields)
- No regressions in variant selection or textarea editing flow
