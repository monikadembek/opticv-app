# Implementation Plan: 23-summary-rewrite-ui

## Review status

Spec reviewed as **PASS WITH ISSUES**. The following review issues are resolved in this plan:

- `recommendationReason` typed as `string | undefined` (optional, matching backend schema)
- "Recommended" variant uses a visible text badge ("Recommended") in addition to a coloured border — not colour-only (WCAG AA)
- `keywordsIncorporated` expand/collapse: collapsed by default showing the first 8 tags + a "Show all (N)" button; local `signal<boolean>` controls it
- Build order: `datatypes` is built before `opticv-web` (Nx task graph handles this; no manual step needed)

---

## Files to create

| # | File |
|---|------|
| 1 | `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.ts` |
| 2 | `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.html` |

## Files to modify

| # | File | Change summary |
|---|------|----------------|
| 3 | `packages/shared/datatypes/src/lib/datatypes.ts` | Add `SummaryRewriteVariantAngle`, `SummaryRewriteVariant`, `SummaryRewriteResult` |
| 4 | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add type guard, computed signal, import `SummaryRewrite`, extend prompt filter |
| 5 | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Replace raw JSON placeholder in panel `value="3"` |

---

## Step 1 — Add shared types to `datatypes.ts`

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Append after the last `KeywordGap*` type (after line 242):

```
SummaryRewriteVariantAngle  — union of three string literals
SummaryRewriteVariant       — angle, text, wordCount, strategicNote, keywordsUsed
SummaryRewriteResult        — originalSummary, variants (array), recommendedVariant,
                              recommendationReason (optional string | undefined), keywordsIncorporated
```

`recommendationReason` must be `string | undefined` (not `string`) to match the backend JSON schema where it is not in the `required` array.

No other changes to `datatypes.ts`.

---

## Step 2 — Create `SummaryRewrite` component

### 2a. `summary-rewrite.ts`

- Selector: `app-summary-rewrite`
- `changeDetection: ChangeDetectionStrategy.OnPush`
- `templateUrl: './summary-rewrite.html'` (external template — file is large enough)
- Single required input: `result = input.required<SummaryRewriteResult>()`

**Computed properties to add:**

| Signal/Computed | Purpose |
|-----------------|---------|
| `showAllKeywords = signal(false)` | Local toggle for `keywordsIncorporated` expand/collapse |
| `angleLabel = computed(...)` | Returns a `Map<SummaryRewriteVariantAngle, string>` mapping each angle to its human-readable label: `{ achievement_led: 'Achievement-led', identity_led: 'Identity-led', mission_led: 'Mission-led' }` |
| `visibleKeywords = computed(...)` | Returns `result().keywordsIncorporated.slice(0, 8)` when `showAllKeywords()` is false, otherwise full array |
| `hasMoreKeywords = computed(...)` | True when `result().keywordsIncorporated.length > 8` |
| `hiddenKeywordsCount = computed(...)` | `result().keywordsIncorporated.length - 8` (used in "Show all (N)" button label) |
| `isNoSummary = computed(...)` | True when `result().originalSummary === 'No summary present'` |

**No output signals** — component is display-only.

### 2b. `summary-rewrite.html` — layout structure

The template is divided into four sections rendered top-to-bottom inside a `<div class="space-y-6 py-2">` wrapper:

#### Section 1 — Original Summary

```
<div>
  <h3>Your Original Summary</h3>
  @if (isNoSummary()) {
    <p class="...muted italic">Your CV had no summary — here are three options to add one.</p>
  } @else {
    <p class="...">{{ result().originalSummary }}</p>
  }
</div>
```

#### Section 2 — Three Variant Cards

Rendered with `@for (variant of result().variants; track variant.angle)`.

Each card is a `<div>` with:
- **Border:** `border border-surface-200 rounded-xl p-5`
- **Recommended highlight:** when `variant.angle === result().recommendedVariant`, add `border-primary-500 bg-primary-50/40` to the border class
- **Card header row:** angle badge + "Recommended" text badge (only when recommended) + word-count chip on the right
  - Angle badge: `bg-surface-100 text-surface-600 text-xs font-semibold rounded-full px-2 py-0.5`
  - "Recommended" badge: `bg-primary-100 text-primary-700 text-xs font-semibold rounded-full px-2 py-0.5` (visible text label, not colour-only)
  - Word count chip: `text-xs text-surface-400` aligned to the right via `ml-auto`
- **Summary text:** `<p>{{ variant.text }}</p>` in `text-sm text-surface-800`
- **Strategic note:** `<p class="text-xs italic text-surface-500">{{ variant.strategicNote }}</p>`
- **Keywords used:** only rendered when `variant.keywordsUsed.length > 0`
  - Label: `<p class="text-xs font-semibold uppercase text-surface-400">Keywords used</p>`
  - Pills: `@for` over `variant.keywordsUsed`, each a `<span class="text-xs bg-primary-50 text-primary-700 rounded px-1.5 py-0.5">`

Accessibility: each card has `role="article"` and `aria-label` derived from the angle label.

#### Section 3 — Recommendation Reason

Only rendered when `result().recommendationReason` is truthy (`@if (result().recommendationReason; as reason)`):

```
<div class="rounded-lg bg-surface-50 border border-surface-200 p-4">
  <p class="text-xs font-semibold uppercase text-surface-400 mb-1">Why this variant?</p>
  <p class="m-0 text-sm text-surface-700">{{ reason }}</p>
</div>
```

This is placed **below all three variant cards as a group**, not attached to a specific card.

#### Section 4 — All Keywords Incorporated

Only rendered when `result().keywordsIncorporated.length > 0`:

```
<div>
  <h3>All Keywords Incorporated</h3>
  <div class="flex flex-wrap gap-2">
    @for (kw of visibleKeywords(); track kw) {
      <span class="tag pill">{{ kw }}</span>
    }
  </div>
  @if (hasMoreKeywords()) {
    <button (click)="showAllKeywords.set(!showAllKeywords())"
            type="button"
            class="text-xs text-primary-600 hover:underline mt-2">
      @if (showAllKeywords()) { Show less } @else { Show all ({{ result().keywordsIncorporated.length }}) }
    </button>
  }
</div>
```

The button toggles `showAllKeywords` signal. No `@HostListener` — all event handling is inline in the template.

---

## Step 3 — Update `cv-optimization.ts`

### 3a. Add type guard

Add `isSummaryRewriteResult` function before the `@Component` decorator:

```
function isSummaryRewriteResult(value: unknown): value is SummaryRewriteResult
  checks: typeof originalSummary === 'string'
          Array.isArray(variants)
          typeof recommendedVariant === 'string'
```

### 3b. Add computed signal

```
readonly summaryRewriteResult = computed<SummaryRewriteResult | null>(() => {
  const r = this.results().get(PromptType.SUMMARY_REWRITE)?.result;
  return isSummaryRewriteResult(r) ? r : null;
});
```

### 3c. Extend prompt filter

In `runOptimization`, the existing `filter` operator currently passes only `PromptType.KEYWORD_GAP`. Change it to pass `KEYWORD_GAP` **and** `SUMMARY_REWRITE`:

```
filter((prompt) =>
  prompt === PromptType.KEYWORD_GAP ||
  prompt === PromptType.SUMMARY_REWRITE
)
```

The `mergeMap` concurrency of `3` is already sufficient for two concurrent requests.

### 3d. Add imports

- Import `SummaryRewriteResult` from `@opticv/datatypes`
- Import `SummaryRewrite` component from `./components/summary-rewrite/summary-rewrite`
- Add `SummaryRewrite` to the `imports` array in `@Component`
- Remove `JsonPipe` import **only if** it is no longer used by any other panel after this change (it is still used by panels 4–7, so keep it)

---

## Step 4 — Update `cv-optimization.html` panel `value="3"`

Replace the entire `<p-accordion-content>` body of panel `value="3"` (currently lines 102–110) with the pattern matching panels 1 and 2:

```html
<p-accordion-content>
  <app-optimization-result-panel
    [loading]="isProcessing().get(PromptType.SUMMARY_REWRITE) ?? false"
    [error]="results().get(PromptType.SUMMARY_REWRITE)?.error ?? null"
    [hasData]="summaryRewriteResult() !== null"
  >
    @if (summaryRewriteResult(); as result) {
      <app-summary-rewrite [result]="result" />
    }
  </app-optimization-result-panel>
</p-accordion-content>
```

No changes to the accordion header for panel 3 — the processing/completed/failed status display already exists and is correct.

---

## Step 5 — Verification checklist

Run these in order after implementation:

1. `npm exec nx build datatypes` — new types compile without errors
2. `npm exec nx typecheck opticv-web` — no new type errors
3. `npm exec nx lint opticv-web` — no lint violations
4. Manual smoke test in browser:
   - Submit job upload form → panel 3 header shows amber spinner while processing
   - On completion → three variant cards render, recommended card has coloured border + "Recommended" text badge
   - Original summary section shows either the CV text or the "no summary" placeholder message
   - "Why this variant?" section appears only when `recommendationReason` is present
   - `keywordsIncorporated` shows max 8 pills with "Show all (N)" button; clicking expands; clicking again collapses
   - Panels with empty `keywordsUsed` arrays show no pill container
   - Error state: panel shows red error box (handled by `OptimizationResultPanel`)
   - Empty state: panel shows "Run optimization to see results" (handled by `OptimizationResultPanel`)

---

## Constraints and conventions enforced

- `standalone: true` NOT set in `@Component` decorator (Angular 20+ default)
- No `@HostBinding` / `@HostListener` — host bindings go in `host: {}` if needed
- No `ngClass` / `ngStyle` — use `[class]` and `[style]` bindings
- Native control flow (`@if`, `@for`, `@switch`) throughout
- `input()` and `output()` functions, not decorators
- `computed()` for all derived state
- No `any` types
- No TODO comments
- File length: `summary-rewrite.html` expected ~90–120 lines; `summary-rewrite.ts` expected ~35–45 lines — both well within 1000-line limit
