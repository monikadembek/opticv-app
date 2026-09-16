# Implementation Plan — Task 24: Display bullet upgrade results in frontend app

## Pre-implementation notes

- Review result: PASS WITH ISSUES (no critical issues — safe to implement)
- Resolved ambiguities carried into this plan:
  - `SseJobCompleteEvent.error` field confirmed (`error?: string` in `cv-optimization-api.service.ts:26`)
  - Section render order (top → bottom): Positions/Bullets → Overall Notes → Missing Bullet Suggestions → Verb Diversity
  - `rewrittenText` missing on a `rewrite` bullet: show original text + weakness, skip the rewritten card only
  - "Mock data" acceptance criterion = manual verification in the running app (no new unit test file required)
  - All new sub-types must be exported from `datatypes.ts`

---

## Step 1 — Add shared types to `datatypes.ts`

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Append the following exported types at the end of the file, after `SummaryRewriteResult`:

1. `BulletAction` — union type `'rewrite' | 'recommend_cut' | 'keep_as_is'`
2. `BulletItem` — object type with fields:
   - `originalText: string`
   - `action: BulletAction`
   - `weakness: string`
   - `rewrittenText?: string`
   - `rewriteRationale?: string`
   - `needsUserInput: boolean`
   - `placeholdersToFill: string[]`
   - `actionVerb: string`
   - `keywordsIncorporated: string[]`
   - `cutReason?: string`
3. `BulletUpgradePosition` — object type with fields:
   - `company: string`
   - `title: string`
   - `dates?: string`
   - `bullets: BulletItem[]`
4. `BulletMissingSuggestion` — object type with fields:
   - `forPosition: string`
   - `suggestedBullet: string`
   - `rationale: string`
   - `questionToAskUser: string`
5. `BulletVerbDiversityCheck` — object type with fields:
   - `uniqueVerbsUsed: number`
   - `totalBullets: number`
   - `diverseEnough: boolean`
6. `BulletUpgradeResult` — object type with fields:
   - `positions: BulletUpgradePosition[]`
   - `missingBulletSuggestions: BulletMissingSuggestion[]`
   - `overallNotes: string`
   - `verbDiversityCheck: BulletVerbDiversityCheck`

---

## Step 2 — Add type guard and computed signal to `cv-optimization.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

### 2a — Import new type

Add `BulletUpgradeResult` to the existing `@opticv/datatypes` import statement.

### 2b — Add type guard function

Add `isBulletUpgradeResult` alongside the three existing guard functions (`isResumeAutopsyResult`, `isKeywordGapResult`, `isSummaryRewriteResult`). It must check:
- value is a non-null object
- `positions` is an array (`Array.isArray(v['positions'])`)
- `verbDiversityCheck` is a non-null object (`typeof v['verbDiversityCheck'] === 'object' && v['verbDiversityCheck'] !== null`)

### 2c — Add computed signal

Add `bulletUpgradeResult` computed signal in the `CvOptimization` class body, after `summaryRewriteResult`:

```ts
readonly bulletUpgradeResult = computed<BulletUpgradeResult | null>(() => {
  const r = this.results().get(PromptType.BULLET_UPGRADE)?.result;
  return isBulletUpgradeResult(r) ? r : null;
});
```

### 2d — Add component import

Add `BulletRewriter` to the `imports` array of `@Component`. Import it from `'./components/bullet-rewriter/bullet-rewriter'`.

### 2e — Remove `JsonPipe` if unused

After wiring is complete in Step 4, check whether `JsonPipe` is still referenced in the template. If no other panel uses it, remove it from the imports array and the import statement.

---

## Step 3 — Create `BulletRewriter` component

### 3a — Create component file

**File (new):** `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts`

- Selector: `app-bullet-rewriter`
- `changeDetection: ChangeDetectionStrategy.OnPush`
- `input.required<BulletUpgradeResult>()` named `result`
- `templateUrl` pointing to `./bullet-rewriter.html`
- Import `BulletUpgradeResult`, `BulletItem` from `@opticv/datatypes`
- No computed signals required — template can read `result()` directly

### 3b — Create template file

**File (new):** `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html`

Template structure (top to bottom):

#### Block A — Positions & Bullets

```
@if (result().positions.length === 0) {
  <p class="...">No bullet data available</p>
} @else {
  @for (position of result().positions; track position.company + position.title) {
    <!-- Position header -->
    <div class="...">
      <span>{{ position.title }} at {{ position.company }}</span>
      @if (position.dates) { <span class="...">{{ position.dates }}</span> }
    </div>

    <!-- Bullet list -->
    <ul class="...">
      @for (bullet of position.bullets; track bullet.originalText) {
        <li class="...">
          @switch (bullet.action) {
            @case ('rewrite') { ... }
            @case ('recommend_cut') { ... }
            @case ('keep_as_is') { ... }
          }
        </li>
      }
    </ul>
  }
}
```

**`rewrite` bullet layout:**
1. Original text row: muted grey label "Original" + strikethrough text
2. `weakness` in small italic text below original
3. `@if (bullet.rewrittenText)` — green-tinted card with label "Rewritten" + `rewrittenText`
4. `@if (bullet.rewriteRationale)` — rationale text in small style below rewritten card
5. `@if (bullet.keywordsIncorporated.length > 0)` — pills row with keyword tags
6. `@if (bullet.needsUserInput && bullet.placeholdersToFill.length > 0)` — amber info row "Placeholders to fill:" + inline tags for each placeholder

**`recommend_cut` bullet layout:**
1. Original text with amber/orange badge "Consider removing" beside it
2. `@if (bullet.cutReason)` — cutReason in small text below

**`keep_as_is` bullet layout:**
1. Original text in muted/grey style + small "Kept" badge

#### Block B — Overall Notes

```
@if (result().overallNotes) {
  <div class="...">{{ result().overallNotes }}</div>
}
```

Render after the positions block, before missing suggestions.

#### Block C — Missing Bullet Suggestions

```
@if (result().missingBulletSuggestions.length > 0) {
  <h3 class="...">Missing Bullet Suggestions</h3>
  @for (suggestion of result().missingBulletSuggestions; track suggestion.forPosition) {
    <div class="...">
      <p class="...">{{ suggestion.forPosition }}</p>
      <div class="...">{{ suggestion.suggestedBullet }}</div>
      <p class="... italic">{{ suggestion.rationale }}</p>
      <div class="... bg-blue-50 border border-blue-200">{{ suggestion.questionToAskUser }}</div>
    </div>
  }
}
```

#### Block D — Verb Diversity Check

Always rendered at the bottom:

```
<div class="...">
  @if (result().verbDiversityCheck.diverseEnough) {
    <i class="pi pi-check-circle text-green-600"></i>
    <span>Good verb variety</span>
  } @else {
    <i class="pi pi-exclamation-triangle text-amber-500"></i>
    <span>Consider diversifying your action verbs</span>
  }
  <span class="... text-surface-500">
    {{ result().verbDiversityCheck.uniqueVerbsUsed }} unique verbs across {{ result().verbDiversityCheck.totalBullets }} bullets
  </span>
</div>
```

**Tailwind styling notes (follow existing component conventions):**
- Position header: `flex justify-between items-center mb-2 font-semibold text-surface-800`
- Bullet list: `space-y-4 mb-6`
- Original text (rewrite): `text-surface-400 line-through text-sm`
- Rewritten card: `rounded-lg bg-green-50 border border-green-200 p-3 mt-2`
- Weakness: `text-xs italic text-surface-400 mt-1`
- Keyword pills: `inline-flex items-center rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600`
- Placeholder note: `rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700`
- Recommend-cut badge: `inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 font-medium`
- Keep badge: `inline-flex items-center rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-400`
- Overall notes block: `rounded-lg bg-surface-50 border border-surface-200 p-4 text-sm text-surface-700 my-4`
- Missing suggestions section heading: `text-lg font-semibold text-surface-800 mb-3 mt-6`
- Suggested bullet card: `rounded-lg bg-surface-50 border border-surface-200 p-3 text-sm`
- Question callout: `rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 mt-2`
- Verb diversity row: `flex items-center gap-2 mt-6 pt-4 border-t border-surface-200 text-sm`

---

## Step 4 — Wire into `cv-optimization.html`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Replace the entire content of `<p-accordion-content>` inside `<p-accordion-panel value="4">` (lines 136–145 in current file) with:

```html
<app-optimization-result-panel
  [loading]="isProcessing().get(PromptType.BULLET_UPGRADE) ?? false"
  [error]="results().get(PromptType.BULLET_UPGRADE)?.error ?? null"
  [hasData]="bulletUpgradeResult() !== null"
>
  @if (bulletUpgradeResult(); as result) {
    <app-bullet-rewriter [result]="result" />
  }
</app-optimization-result-panel>
```

The accordion header block for `value="4"` (lines 114–134) is **unchanged**.

---

## Step 5 — Verify

Run these commands in order; all must pass before the task is complete:

```
npm exec nx typecheck opticv-web
npm exec nx build opticv-web -- --configuration=development
```

Then start the app and manually verify:
- Accordion panel "Bullet Upgrades" no longer shows raw JSON
- Loading/error/empty states render via `OptimizationResultPanel`
- `keep_as_is` bullets appear muted/grey with "Kept" badge
- `recommend_cut` bullets show amber badge + cut reason
- `rewrite` bullets show original (strikethrough) and rewritten (green card)
- `missingBulletSuggestions` section hidden when empty
- Verb diversity row always visible at bottom

---

## Files changed / created

| Action | File |
|--------|------|
| **Modified** | `packages/shared/datatypes/src/lib/datatypes.ts` |
| **Modified** | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` |
| **Modified** | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` |
| **Created** | `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts` |
| **Created** | `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html` |
