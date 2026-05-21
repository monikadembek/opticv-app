# Task Specification

## Source

Task 23: Display rewritten summary results

## Goal

Create a `SummaryRewrite` Angular component that displays the three AI-generated CV summary variants returned by the `SUMMARY_REWRITE` prompt. Wire the prompt into the optimization pipeline so it runs on form submit alongside `KEYWORD_GAP`. Add the `SummaryRewriteResult` shared type to `@opticv/datatypes`.

## Context

The feature lives inside the existing `cv-optimization` feature at:
`apps/opticv-web/src/app/features/cv-optimization/`

The accordion panel for "Rewritten Summary" already exists in `cv-optimization.html` (panel `value="3"`) but currently shows a raw JSON dump (`<pre>{{ r.result | json }}</pre>`). This task replaces that placeholder with a proper UI component.

The backend already seeds and processes the `SUMMARY_REWRITE` prompt. Its structured output matches the schema described in **Data / API** below.

## Scope

### In scope

- Add `SummaryRewriteResult` and sub-types to `packages/shared/datatypes/src/lib/datatypes.ts`
- Create `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.ts` (and `.html` if needed)
- Add a type guard `isSummaryRewriteResult` in `cv-optimization.ts`
- Add a `summaryRewriteResult` computed signal in `cv-optimization.ts`
- Update the `runOptimization` filter in `cv-optimization.ts` to also trigger `SUMMARY_REWRITE`
- Replace the raw JSON placeholder in `cv-optimization.html` panel `value="3"` with `<app-optimization-result-panel>` wrapping `<app-summary-rewrite>`

### Out of scope

- Backend changes
- Any other prompt types (BULLET_UPGRADE, COVER_LETTER, etc.)
- Copy-to-clipboard functionality (optional enhancement, not required)
- Saving a preferred variant to the database

## Behavior

1. When the user submits the job upload form, `SUMMARY_REWRITE` is triggered alongside `KEYWORD_GAP` (both filtered in `runOptimization`).
2. While processing, the accordion header shows the amber spinner ("Processing") — this already works via the existing header template.
3. On completion, the accordion content renders `<app-optimization-result-panel>` which handles loading / error / empty states via `ng-content` projection (matching the pattern used for `keyword-gap` and `ats-score`).
4. When data is available, `<app-summary-rewrite [result]="result">` renders:
   - **Original summary block** — displays `originalSummary` (the text extracted from the user's CV, or "No summary present" if the field equals that string).
   - **Three variant cards** — one card per variant (`achievement_led`, `identity_led`, `mission_led`). Each card shows:
     - Angle label as a badge/tag (human-readable: "Achievement-led", "Identity-led", "Mission-led")
     - The rewritten summary text (`text`)
     - Word count (`wordCount`)
     - Strategic note (`strategicNote`) — shown in a subtle italic style
     - Keywords used (`keywordsUsed`) — displayed as small pill tags
   - The **recommended variant** card is visually highlighted (e.g., a coloured border or "Recommended" badge)
   - **Recommendation reason** — a sentence below the variants explaining why that angle was chosen (`recommendationReason`)
   - **All keywords incorporated** — a collapsed list of all JD keywords woven across all three variants (`keywordsIncorporated`); shown as pill tags

### Empty / edge cases

- If `originalSummary === 'No summary present'`, display it as a muted placeholder message ("Your CV had no summary — here are three options to add one.")
- If the SSE event `status === 'failed'`, the `OptimizationResultPanel` error state handles display.
- If `keywordsUsed` or `keywordsIncorporated` is an empty array, omit that section entirely (no empty tag list).

## Data / API

### New shared type (add to `packages/shared/datatypes/src/lib/datatypes.ts`)

```ts
export type SummaryRewriteVariantAngle =
  | 'achievement_led'
  | 'identity_led'
  | 'mission_led';

export type SummaryRewriteVariant = {
  angle: SummaryRewriteVariantAngle;
  text: string;
  wordCount: number;
  strategicNote: string;
  keywordsUsed: string[];
};

export type SummaryRewriteResult = {
  originalSummary: string;
  variants: SummaryRewriteVariant[];          // always 3
  recommendedVariant: SummaryRewriteVariantAngle;
  recommendationReason: string;
  keywordsIncorporated: string[];
};
```

### Type guard (add to `cv-optimization.ts`)

```ts
function isSummaryRewriteResult(value: unknown): value is SummaryRewriteResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['originalSummary'] === 'string' &&
    Array.isArray(v['variants']) &&
    typeof v['recommendedVariant'] === 'string'
  );
}
```

### API

No new endpoints — uses the existing SSE flow. The `SUMMARY_REWRITE` run is started with:
```
POST /api/cv-optimization/applications/{id}/run/{SUMMARY_REWRITE}
```
and its result arrives via the existing SSE stream as a `SseJobCompleteEvent` with `promptType: PromptType.SUMMARY_REWRITE`.

## Component API

```ts
// summary-rewrite.ts
@Component({
  selector: 'app-summary-rewrite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class SummaryRewrite {
  readonly result = input.required<SummaryRewriteResult>();
  // computed helpers for display (angle labels, recommended flag per variant, etc.)
}
```

## Acceptance (DEV)

- `npm exec nx typecheck opticv-web` passes with no new errors
- `npm exec nx lint opticv-web` passes
- `npm exec nx build datatypes` passes after the new types are added
- `SUMMARY_REWRITE` is included in the `runOptimization` filter (alongside `KEYWORD_GAP`) in `cv-optimization.ts`
- The accordion panel `value="3"` no longer renders a raw JSON `<pre>` dump
- `OptimizationResultPanel` loading/error/empty states work correctly for the summary panel
- All three variant cards render; the recommended card is visually distinguished
- The original summary and recommendation reason are displayed
- When `originalSummary === 'No summary present'`, the muted placeholder message is shown instead of the raw string
- Empty `keywordsUsed` / `keywordsIncorporated` arrays do not render empty pill containers
- No `any` types introduced; no `TODO` comments left
