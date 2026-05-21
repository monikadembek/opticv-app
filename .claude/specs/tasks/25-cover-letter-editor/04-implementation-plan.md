# Implementation Plan

## Task: 25-cover-letter-editor

Based on: `02-spec.md` + `03-spec-review.md` (PASS WITH ISSUES — issues addressed in steps below)

---

## Pre-conditions

- Spec review raised two non-critical issues; both are resolved in this plan:
  1. Type guard will include `v['variants'].length > 0` check (consistent with edge case note).
  2. `recommendedVariant` out-of-bounds fallback is applied in the component's signal initialisation via `Math.min(result.recommendedVariant, result.variants.length - 1)`.
- `primeng/editor` is not yet imported anywhere in `opticv-web` — it must be added as a component import in `cover-letter-editor.ts`. No npm install is needed; PrimeNG is already a workspace dependency.

---

## Files to Create

| File | Description |
|------|-------------|
| `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.ts` | New component (TS) |
| `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.html` | New component (template) |
| `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.spec.ts` | Unit tests |

## Files to Modify

| File | Change |
|------|--------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `CoverLetterVariant` and `CoverLetterResult` types |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add import, type guard, computed signal |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Replace placeholder panel value="5" content |

---

## Step 1 — Add shared types

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Append after `BulletUpgradeResult` (end of file):

- Add `CoverLetterVariant` type with fields: `hookType: string`, `fullLetter: string`, `wordCount: number`, `strategicAngle: string`, `openingHook: string`, `closingCTA: string`, `keywordsIncorporated: string[]`, `bestFor: string`
- Add `CoverLetterResult` type with fields: `salutation: string`, `signoff: string`, `variants: CoverLetterVariant[]`, `recommendedVariant: number`, `recommendationReason: string`, `warnings: string[]`
- Both types must be exported.

---

## Step 2 — Update `cv-optimization.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

### 2a. Import

Add `CoverLetterResult` to the existing `@opticv/datatypes` import statement (alongside `BulletUpgradeResult`, etc.). Also import `CoverLetterEditor` from the new component path.

### 2b. Type guard

Add function `isCoverLetterResult(value: unknown): value is CoverLetterResult` after the existing `isBulletUpgradeResult` guard. Checks:
- `value` is a non-null object
- `v['variants']` is an array with `length > 0`  ← resolves spec review issue #1
- `typeof v['recommendedVariant'] === 'number'`
- `typeof v['salutation'] === 'string'`

### 2c. Computed signal

Add after the `bulletUpgradeResult` computed signal:

```
readonly coverLetterResult = computed<CoverLetterResult | null>(() => {
  const r = this.results().get(PromptType.COVER_LETTER)?.result;
  return isCoverLetterResult(r) ? r : null;
});
```

### 2d. Component imports array

Add `CoverLetterEditor` to the `imports` array of `@Component`.

---

## Step 3 — Create `cover-letter-editor.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.ts`

### Component decorator
- `selector: 'app-cover-letter-editor'`
- `templateUrl: './cover-letter-editor.html'`
- `changeDetection: ChangeDetectionStrategy.OnPush`
- `imports`: `EditorModule` from `primeng/editor`, `FormsModule` from `@angular/forms`, `TooltipModule` from `primeng/tooltip`, `ButtonModule` from `primeng/button`, `MessageModule` from `primeng/message`

### Class members

- `readonly result = input.required<CoverLetterResult>()`
- `readonly safeIndex = computed<number>(() => Math.min(this.result().recommendedVariant, this.result().variants.length - 1))`  ← resolves spec review issue #2
- `readonly selectedVariantIndex = signal<number>(0)` — initialised to 0; set to `safeIndex()` via `effect()` in constructor when result first becomes available, or simply initialised from `safeIndex()` using `linkedSignal` if available, or handled as described below
- `readonly editorContent = signal<string>('')`

### Initialisation pattern

Because `input` signals are not readable at field-initialisation time in Angular 21, use `effect()` in the constructor to set the initial selected index and editor content once on first non-null result:

```
constructor() {
  effect(() => {
    const idx = this.safeIndex();
    this.selectedVariantIndex.set(idx);
    this.editorContent.set(this.result().variants[idx].fullLetter);
  }, { allowSignalWrites: true });
}
```

Note: this effect runs every time `result` changes (i.e. when a new job is submitted), which is correct — it resets the editor to the recommended variant for each new result.

### Method

- `selectVariant(index: number): void` — calls `selectedVariantIndex.set(index)` and `editorContent.set(this.result().variants[index].fullLetter)`

---

## Step 4 — Create `cover-letter-editor.html`

Layout (top to bottom), using Tailwind utility classes consistent with the rest of the feature:

### 4a. Warnings banner

```
@if (result().warnings.length > 0) {
  <p-message severity="warn"> ... list warnings ... </p-message>
}
```

### 4b. Recommendation note

A `<div>` with muted styling (`text-sm text-surface-500 italic`) showing `result().recommendationReason`. Shown always (it is always present per the type).

### 4c. Variant cards grid

`<div class="grid grid-cols-1 md:grid-cols-3 gap-4">`

Use `@for (variant of result().variants; track $index)` to render each card. Each card (`<div role="article">`):
- Active state class binding: when `selectedVariantIndex() === $index` apply `border-primary-500 bg-primary-50/40`, otherwise `border-surface-200` — matching the pattern used in `summary-rewrite.html`
- Header row: `hookType` (bold), `strategicAngle` (muted subtitle), word count badge (`text-xs`)
- "Recommended" badge: shown only when `$index === safeIndex()`, styled as `bg-primary-100 text-green-700 rounded-full px-2 py-0.5`
- `bestFor` text in muted small text
- "Use this version" button: `<p-button label="Use this version" variant="outlined" size="small" (onClick)="selectVariant($index)" />`

### 4d. Editor section

```
<div class="mt-6">
  <h3 class="text-base font-semibold text-surface-800 mb-3">Edit Cover Letter</h3>
  <p-editor [(ngModel)]="editorContent" [style]="{ height: '400px' }" />
</div>
```

Note: `p-editor` uses Quill under the hood. Two-way binding via `[(ngModel)]` with `FormsModule` imported. The `editorContent` signal is written via `set()` on variant selection; reading back is handled by ngModel's two-way binding. Since `editorContent` is a `WritableSignal<string>`, it works with `[(ngModel)]` in Angular 21 signal forms. If strict signal-ngModel compatibility requires adaptation, use `[ngModel]="editorContent()" (ngModelChange)="editorContent.set($event)"` instead.

### 4e. Export buttons row

```
<div class="flex gap-3 mt-4">
  <p-button label="Export to PDF" variant="outlined" severity="secondary"
    [disabled]="true" pTooltip="Coming soon" tooltipPosition="top" />
  <p-button label="Export to DOCX" variant="outlined" severity="secondary"
    [disabled]="true" pTooltip="Coming soon" tooltipPosition="top" />
</div>
```

---

## Step 5 — Update `cv-optimization.html`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Replace the content inside `<p-accordion-content>` of `<p-accordion-panel value="5">` (lines 170–178) with:

```html
<app-optimization-result-panel
  [loading]="isProcessing().get(PromptType.COVER_LETTER) ?? false"
  [error]="results().get(PromptType.COVER_LETTER)?.error ?? null"
  [hasData]="coverLetterResult() !== null"
>
  @if (coverLetterResult(); as result) {
    <app-cover-letter-editor [result]="result" />
  }
</app-optimization-result-panel>
```

This matches the pattern used for all other result panels (includes `[error]` input — fixing the omission noted in the spec review).

---

## Step 6 — Create `cover-letter-editor.spec.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.spec.ts`

### Mock data

Define `MOCK_RESULT: CoverLetterResult` with:
- `salutation: 'Dear Hiring Manager,'`
- `signoff: 'Yours sincerely,'`
- `variants`: 3 items, each with all required fields. `variants[0].fullLetter` and `variants[1].fullLetter` should be distinct strings for test assertions.
- `recommendedVariant: 1` (not 0, so auto-selection can be verified)
- `recommendationReason: 'This angle matches the company culture.'`
- `warnings: []` for the default mock; a separate constant with `warnings: ['Check word count']` for warning tests

### Test setup

Standard `TestBed.configureTestingModule({ imports: [CoverLetterEditor] })`. `fixture.componentRef.setInput('result', MOCK_RESULT)` then `fixture.detectChanges()`.

Note: `p-editor` (Quill) may require a stub or `NO_ERRORS_SCHEMA` in the test environment if Quill is not available in the test runner. Use `NO_ERRORS_SCHEMA` as a pragmatic approach to avoid DOM dependency on Quill in unit tests, focusing tests on component logic.

### Test cases

1. Renders all variant cards (check `[role="article"]` count equals `MOCK_RESULT.variants.length`)
2. Shows "Recommended" badge only on variant at `recommendedVariant` index
3. Active card has primary border class on `recommendedVariant` card at init
4. Clicking "Use this version" on variant 0 updates `selectedVariantIndex` to 0
5. Clicking "Use this version" on variant 0 updates `editorContent` to `variants[0].fullLetter`
6. Warnings banner not rendered when `warnings` is empty
7. Warnings banner rendered when `warnings` is non-empty (use second mock constant)
8. `recommendationReason` text is present in the DOM
9. Export buttons are present and disabled

---

## Step 7 — Verify

Run in order:

```
npm exec nx typecheck opticv-web
npm exec nx test opticv-web
npm exec nx build opticv-web
```

All must pass with no errors before the task is considered complete.

---

## Implementation Order

1. Step 1 (shared types) — must come before all other steps
2. Step 2 (cv-optimization.ts) — depends on Step 1
3. Step 3 (cover-letter-editor.ts) — depends on Step 1
4. Step 4 (cover-letter-editor.html) — depends on Step 3
5. Step 5 (cv-optimization.html) — depends on Steps 2–4
6. Step 6 (spec file) — can be written in parallel with Steps 3–4
7. Step 7 (verify) — last
