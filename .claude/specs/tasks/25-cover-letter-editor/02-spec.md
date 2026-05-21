# Task Specification

## Source

Azure DevOps Task: 25-cover-letter-editor

## Goal

Add a `cover-letter-editor` component to the CV Optimization page that displays the AI-generated cover letter results for `PromptType.COVER_LETTER`. The user can select one of three generated variants, which loads the full cover letter text into a PrimeNG rich-text editor (Quill-based) for local tweaking. Export buttons (PDF, DOCX) are rendered but non-functional in this task.

## Context

The CV Optimization page (`apps/opticv-web/src/app/features/cv-optimization/`) displays results for each `PromptType` inside a PrimeNG Accordion. Each result type has a dedicated component. The Cover Letter accordion panel (value="5") currently shows raw JSON with a "Coming soon" fallback. This task replaces that placeholder with a real component.

The backend already outputs a structured cover letter result through the existing SSE streaming pipeline. The shared `datatypes.ts` package needs the `CoverLetterResult` type added, followed by a type guard and computed signal in the parent `CvOptimization` component, and finally the new `CoverLetterEditor` child component.

## Scope

### In scope

- Add `CoverLetterResult` and related sub-types to `packages/shared/datatypes/src/lib/datatypes.ts`
- Add `isCoverLetterResult()` type guard to `cv-optimization.ts`
- Add `coverLetterResult` computed signal to `CvOptimization`
- Create `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/` with:
  - `cover-letter-editor.ts`
  - `cover-letter-editor.html`
  - `cover-letter-editor.spec.ts`
- Integrate the new component into `cv-optimization.ts` imports and `cv-optimization.html` accordion panel
- Replace the raw JSON / "coming soon" placeholder in panel value="5"
- Add non-functional Export to PDF and Export to DOCX buttons

### Out of scope

- Actual export functionality (PDF/DOCX generation)
- Persisting edited content to the backend
- Any changes to the backend, Prisma schema, or API endpoints
- Modifications to the SSE streaming infrastructure

## Data / API

### New types — `packages/shared/datatypes/src/lib/datatypes.ts`

```ts
export type CoverLetterVariant = {
  hookType: string;
  fullLetter: string;
  wordCount: number;
  strategicAngle: string;
  openingHook: string;
  closingCTA: string;
  keywordsIncorporated: string[];
  bestFor: string;
};

export type CoverLetterResult = {
  salutation: string;
  signoff: string;
  variants: CoverLetterVariant[];
  recommendedVariant: number; // 0-based index into variants array
  recommendationReason: string;
  warnings: string[];
};
```

### Type guard — `cv-optimization.ts`

```ts
function isCoverLetterResult(value: unknown): value is CoverLetterResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v['variants']) &&
    typeof v['recommendedVariant'] === 'number' &&
    typeof v['salutation'] === 'string'
  );
}
```

### Computed signal — `cv-optimization.ts`

```ts
readonly coverLetterResult = computed<CoverLetterResult | null>(() => {
  const r = this.results().get(PromptType.COVER_LETTER)?.result;
  return isCoverLetterResult(r) ? r : null;
});
```

## Behavior

### Layout (top to bottom)

1. **Warnings banner** — if `warnings.length > 0`, show a PrimeNG `<p-message severity="warn">` listing the warnings. Hidden otherwise.

2. **Recommendation note** — a small muted text block showing `recommendationReason`.

3. **Variant cards row** — three cards side-by-side (responsive: stack on mobile). Each card shows:
   - Hook type label (bold)
   - Strategic angle (muted subtitle)
   - "Best for" text
   - Word count badge
   - "Use this version" button (primary outlined)
   - A "Recommended" chip/badge on the card that matches `recommendedVariant` index

4. **Editor section** — below the cards, a PrimeNG `<p-editor>` displaying the `fullLetter` of the currently selected variant. The editor is fully editable (local scratchpad — no persistence).
   - On initial load, the recommended variant (`recommendedVariant` index) is pre-selected and its `fullLetter` pre-loaded into the editor.
   - Clicking "Use this version" on a card updates the editor content and marks that card as active (highlighted border/ring).

5. **Export buttons row** — below the editor, two buttons:
   - "Export to PDF" (secondary / outlined)
   - "Export to DOCX" (secondary / outlined)
   - Both are disabled and show a tooltip: "Coming soon"

### States

- **Loading** — handled by the existing `OptimizationResultPanel` wrapper (pass `[loading]`, `[error]`, `[hasData]` inputs as done for other result panels).
- **Empty / no result** — `OptimizationResultPanel` renders its empty state; `CoverLetterEditor` is not mounted.
- **Result present** — `CoverLetterEditor` renders with the full UI described above.

### Component internal state

- `selectedVariantIndex = signal<number>(result.recommendedVariant)` — tracks the active card
- `editorContent = signal<string>(result.variants[result.recommendedVariant].fullLetter)` — bound to `<p-editor>`
- Selecting a different card calls `selectedVariantIndex.set(i)` and `editorContent.set(variants[i].fullLetter)`

## Component API

```ts
// cover-letter-editor.ts
export class CoverLetterEditor {
  readonly result = input.required<CoverLetterResult>();
}
```

No outputs — all interactions are internal.

## Integration in `cv-optimization.html`

Replace the existing placeholder block for the Cover Letter accordion panel (value="5") with:

```html
<app-optimization-result-panel
  [loading]="isProcessing().get(PromptType.COVER_LETTER) ?? false"
  [hasData]="coverLetterResult() !== null">
  <app-cover-letter-editor [result]="coverLetterResult()!" />
</app-optimization-result-panel>
```

Import `CoverLetterEditor` in `cv-optimization.ts` alongside the other child components.

## Edge Cases

- `variants` array is empty: `OptimizationResultPanel`'s `hasData` will be false (guard `isCoverLetterResult` should also check `v['variants'].length > 0`) — show empty state.
- `recommendedVariant` index out of bounds: fall back to index 0.
- Very long `fullLetter` text: editor scrolls internally (fixed height with overflow scroll), does not expand the page unboundedly.
- `warnings` is an empty array: warnings banner is not rendered at all.

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes with no type errors
- `npm exec nx test opticv-web` passes (spec file covers: variant card rendering, "Use this version" updates editor content, recommended variant pre-selected, warnings banner hidden when empty)
- `npm exec nx typecheck opticv-web` passes
- `CoverLetterResult` exported from `@opticv/datatypes`
- No breaking changes to existing result components
- Export buttons visible but disabled with "Coming soon" tooltip
