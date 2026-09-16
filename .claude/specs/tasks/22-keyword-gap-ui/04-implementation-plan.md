# Implementation Plan: Task 22 — Display keyword gap analysis results

## Review status

Spec review: **PASS WITH ISSUES** (no critical issues). The plan resolves open issues as follows:
- **Semantic match icon**: use `pi-minus-circle` with teal colour class (`text-teal-500`) — concrete and available in PrimeNG.
- **`evidenceFromResume`**: render as a small indented italic line below the recommendation text, only when the string is non-empty. Remove the contradictory Edge Case note during implementation.
- **Acronym Issues count badge**: add a count badge to match the pattern of all other sections.

---

## Files to create

| File | Description |
|------|-------------|
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` | New Angular component |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` | Component template |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts` | Unit tests |

## Files to modify

| File | Change |
|------|--------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add 7 new types + 1 type guard function |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add `keywordGapResult` computed signal; import `KeywordGap` component |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Replace raw JSON placeholder in accordion panel value="2" |

---

## Step 1 — Add shared types to `datatypes.ts`

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Append the following exported types after the existing `ResumeAutopsy*` types, following the same `export type Name = { ... }` pattern used throughout the file:

**Types to add (in this order):**

1. `KeywordGapMatchScoreBreakdown`
   - `requiredMatched: number`
   - `requiredTotal: number`
   - `preferredMatched: number`
   - `preferredTotal: number`

2. `KeywordGapMatchedKeyword`
   - `keyword: string`
   - `matchType: 'exact' | 'semantic' | 'partial'`
   - `occurrencesInResume: number`
   - `isRequired: boolean`

3. `KeywordGapMissingKeyword`
   - `keyword: string`
   - `category: string`
   - `importance: 'critical' | 'high' | 'medium' | 'low'`
   - `isRequired: boolean`
   - `candidateLikelyHas: boolean`
   - `evidenceFromResume: string`
   - `recommendation: string`
   - `suggestedPlacement: 'summary' | 'skills' | 'experience_bullet' | 'title' | 'multiple'`

4. `KeywordGapUnderweightedKeyword`
   - `keyword: string`
   - `currentOccurrences: number`
   - `recommendedOccurrences: number`
   - `suggestedAdditions: string[]`

5. `KeywordGapFabricationWarning`
   - `keyword: string`
   - `reason: string`

6. `KeywordGapAcronymIssue`
   - `term: string`
   - `issue: string`
   - `fix: string`

7. `KeywordGapResult`
   - `matchScore: number`
   - `matchScoreBreakdown: KeywordGapMatchScoreBreakdown`
   - `matchedKeywords: KeywordGapMatchedKeyword[]`
   - `missingKeywords: KeywordGapMissingKeyword[]`
   - `underweightedKeywords: KeywordGapUnderweightedKeyword[]`
   - `fabricationWarnings: KeywordGapFabricationWarning[]`
   - `acronymIssues: KeywordGapAcronymIssue[]`

**Type guard to add:**

`isKeywordGapResult(value: unknown): value is KeywordGapResult`
- Returns `true` when `value` is a non-null object with `typeof value.matchScore === 'number'` AND `Array.isArray(value.missingKeywords)`.

All 7 types and the guard function must be exported from the file. No changes to existing types.

---

## Step 2 — Create `keyword-gap.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`

**Decorator:**
- `selector: 'app-keyword-gap'`
- `templateUrl: './keyword-gap.html'` (relative path)
- `changeDetection: ChangeDetectionStrategy.OnPush`
- `imports`: only what the template needs — no NgModules

**Input:**
- `readonly result = input.required<KeywordGapResult>()`

**Computed signals (derived from `result()`):**

| Signal | Derivation |
|--------|-----------|
| `missingLikelyHas` | `result().missingKeywords.filter(k => k.candidateLikelyHas)` |
| `missingGenuinelyLacks` | `result().missingKeywords.filter(k => !k.candidateLikelyHas)` |
| `scoreColor` | `'red'` if `matchScore <= 49`, `'amber'` if `<= 74`, `'green'` otherwise |
| `strokeColor` | SVG hex color derived from `scoreColor`: red=`#ef4444`, amber=`#f59e0b`, green=`#22c55e` |
| `strokeDashoffset` | `251.3 - (251.3 * matchScore / 100)` (same circumference formula as `ats-score`) |

**No internal state signals needed** — the keyword-gap component has no collapsible/expandable items (all sections are flat lists per spec).

**Expose `PromptType` enum** to template by assigning it as a class property: `readonly PromptType = PromptType` — only if needed by the template; otherwise omit.

**Imports required in the component:**
- `ChangeDetectionStrategy`, `Component`, `computed`, `input` from `@angular/core`
- `KeywordGapResult`, `KeywordGapMissingKeyword`, `KeywordGapMatchedKeyword`, etc. from `@opticv/datatypes`

---

## Step 3 — Create `keyword-gap.html`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html`

Use Angular native control flow (`@if`, `@for`) throughout. No `*ngIf` or `*ngFor`. Tailwind CSS classes only. PrimeNG icons via `<i class="pi pi-*">`.

### Section 1 — Match Score (always rendered)

Structure mirrors `ats-score.html` score ring:
- Outer `<div>` with `role="img"` and `aria-label="Keyword match score: {{ result().matchScore }}%"`
- SVG circle ring: `r="40"`, `cx="50"`, `cy="50"`, `viewBox="0 0 100 100"`, `stroke-width="10"`
  - Background circle: `stroke="#e5e7eb"` (grey), `fill="none"`, `stroke-dasharray="251.3"`, `stroke-dashoffset="0"`
  - Foreground circle: `stroke` bound to `strokeColor()`, `stroke-dasharray="251.3"`, `stroke-dashoffset` bound to `strokeDashoffset()`, `transform="rotate(-90 50 50)"`, `stroke-linecap="round"`
- Score text inside SVG: `{{ result().matchScore }}%`
- Below ring: two lines for breakdown
  - `Required: {{ result().matchScoreBreakdown.requiredMatched }} / {{ result().matchScoreBreakdown.requiredTotal }} matched`
  - `Preferred: {{ result().matchScoreBreakdown.preferredMatched }} / {{ result().matchScoreBreakdown.preferredTotal }} matched`

### Section 2 — Missing Keywords (rendered when `result().missingKeywords.length > 0`)

Section header: `<h3>` "Missing Keywords" + count badge showing `result().missingKeywords.length`.

Sub-group "Likely have — add to your CV" rendered only when `missingLikelyHas().length > 0`:
- Small label/divider text above the list
- `@for (item of missingLikelyHas(); track item.keyword)` — see row layout below

Sub-group "Skills to acquire or omit" rendered only when `missingGenuinelyLacks().length > 0`:
- Small label/divider text above the list
- `@for (item of missingGenuinelyLacks(); track item.keyword)` — see row layout below

**Missing keyword row layout (used in both sub-groups):**
- Importance badge pill: `critical`=red, `high`=orange, `medium`=amber, `low`=slate — using Tailwind `bg-*-100 text-*-700 rounded-full px-2 py-0.5 text-xs`
- `@if (item.isRequired)` → small "Required" tag: `bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-xs`
- Keyword name: `<span class="font-semibold">`
- Recommended placement chip: `bg-surface-100 text-surface-600 rounded px-1.5 text-xs`
- Recommendation text: `<p class="text-sm text-surface-500 mt-0.5">`
- `@if (item.evidenceFromResume)` → `<p class="text-xs italic text-surface-400 mt-0.5 pl-2 border-l border-surface-200">{{ item.evidenceFromResume }}</p>`

### Section 3 — Matched Keywords (rendered when `result().matchedKeywords.length > 0`)

Section header: `<h3>` "Matched Keywords" + count badge showing `result().matchedKeywords.length`.

`@for (item of result().matchedKeywords; track item.keyword)` flat list row:
- Match type icon:
  - `exact`: `<i class="pi pi-check-circle text-green-500">`
  - `partial`: `<i class="pi pi-circle text-yellow-500">`
  - `semantic`: `<i class="pi pi-minus-circle text-teal-500">`
  - Use `@switch (item.matchType)` block
- `@if (item.isRequired)` → small "Required" tag: `bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-xs`
- Keyword name: `<span>`
- Occurrence count: `<span class="text-xs text-surface-500 ml-auto">×{{ item.occurrencesInResume }}</span>`

### Section 4 — Underweighted Keywords (rendered when `result().underweightedKeywords.length > 0`)

Section header: `<h3>` "Underweighted Keywords" + count badge showing `result().underweightedKeywords.length`.

`@for (item of result().underweightedKeywords; track item.keyword)` flat list row:
- Keyword name: `<span class="font-semibold">`
- Occurrence arrow: `<span class="text-sm text-surface-500">{{ item.currentOccurrences }} <i class="pi pi-arrow-right text-xs"></i> {{ item.recommendedOccurrences }}</span>`
- `@if (item.suggestedAdditions.length > 0)` → `<ul class="pl-4 mt-1">` with `@for (s of item.suggestedAdditions; track s)` → `<li class="text-xs text-surface-500">`

### Section 5 — Acronym Issues (rendered when `result().acronymIssues.length > 0`)

Section header: `<h3>` "Acronym Issues" + count badge showing `result().acronymIssues.length`.

`@for (item of result().acronymIssues; track item.term)` flat list row:
- Term: `<span class="font-semibold">`
- Issue: `<span class="text-sm text-surface-500">`
- Fix: `<span class="text-sm text-green-600"><span class="font-medium">Fix:</span> {{ item.fix }}</span>`

### Section 6 — Fabrication Warnings (rendered when `result().fabricationWarnings.length > 0`)

Section header: `<h3>` "Fabrication Warnings" with `<i class="pi pi-exclamation-triangle text-amber-500">` icon. No count badge needed (amber warning icon is sufficient visual indicator); add count badge for consistency with other sections.

Outer wrapper: `<div class="bg-amber-50 border border-amber-200 rounded-lg p-4">`

`@for (item of result().fabricationWarnings; track item.keyword)` flat list row:
- Keyword: `<span class="font-semibold">`
- Reason: `<span class="text-sm text-surface-500">`

---

## Step 4 — Create `keyword-gap.spec.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts`

Follow the exact pattern from `ats-score.spec.ts`:
- Use `TestBed.configureTestingModule({ imports: [KeywordGap] })`
- Set input via `fixture.componentRef.setInput('result', MOCK_RESULT)`
- Define `MOCK_RESULT: KeywordGapResult` constant at top of file with representative data

**Tests to include:**

1. Score ring color — low score (≤49): `scoreColor()` returns `'red'`
2. Score ring color — medium score (50–74): `scoreColor()` returns `'amber'`
3. Score ring color — high score (≥75): `scoreColor()` returns `'green'`
4. Hides matched keywords section when `matchedKeywords` is empty
5. Shows matched keywords section when `matchedKeywords` is non-empty
6. Hides missing keywords section when `missingKeywords` is empty
7. Shows both "likely has" and "genuinely lacks" sub-groups when both are populated
8. Shows only the "likely has" sub-group label when `missingGenuinelyLacks` is empty
9. Shows only the "genuinely lacks" sub-group label when `missingLikelyHas` is empty
10. Hides underweighted section when `underweightedKeywords` is empty
11. Hides acronym issues section when `acronymIssues` is empty
12. Hides fabrication warnings section when `fabricationWarnings` is empty
13. Renders fabrication warnings with amber background when non-empty
14. Does not render `evidenceFromResume` block when field is empty string
15. Renders `evidenceFromResume` block when field is non-empty string

---

## Step 5 — Update `cv-optimization.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

**Changes:**

1. Add import from `@opticv/datatypes`: `KeywordGapResult`, `isKeywordGapResult`
2. Add import of `KeywordGap` component from `./components/keyword-gap/keyword-gap`
3. Add `KeywordGap` to the component's `imports` array (alongside `AtsScore`, `OptimizationResultPanel`, etc.)
4. Add computed signal after `autopsyResult`:
   ```
   readonly keywordGapResult = computed<KeywordGapResult | null>(() => {
     const r = this.results().get(PromptType.KEYWORD_GAP)?.result;
     return isKeywordGapResult(r) ? r : null;
   });
   ```

No other changes to this file.

---

## Step 6 — Update `cv-optimization.html`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Inside accordion panel `value="2"`, inside `<p-accordion-content>`, replace the existing `@if/@else` block:

```html
@if (results().get(PromptType.KEYWORD_GAP); as r) {
  <pre class="whitespace-pre-wrap text-sm">{{ r.result | json }}</pre>
} @else if(results().get(PromptType.KEYWORD_GAP)?.error; as error) {
  <p class="text-red-700 m-0">{{error}}</p>
} @else {
  <p class="m-0">Coming soon</p>
}
```

with:

```html
<app-optimization-result-panel
  [loading]="isProcessing().get(PromptType.KEYWORD_GAP) ?? false"
  [error]="results().get(PromptType.KEYWORD_GAP)?.error ?? null"
  [hasData]="keywordGapResult() !== null"
>
  <app-keyword-gap [result]="keywordGapResult()!" />
</app-optimization-result-panel>
```

The accordion header block (processing/completed/failed status badges) is unchanged.

---

## Implementation order

Execute steps in this sequence:

1. **Step 1** — Add types to `datatypes.ts` (no dependencies)
2. **Step 2 + Step 3** — Create `keyword-gap.ts` and `keyword-gap.html` together (component + template)
3. **Step 4** — Create `keyword-gap.spec.ts`
4. **Step 5** — Update `cv-optimization.ts`
5. **Step 6** — Update `cv-optimization.html`

After each step, no intermediate build is required. Run a single final verification:

```
npm exec nx build datatypes
npm exec nx typecheck opticv-web
npm exec nx test opticv-web
npm exec nx build opticv-web
```

---

## Acceptance checklist

- [ ] `npm exec nx build datatypes` passes
- [ ] `npm exec nx build opticv-web` passes
- [ ] `npm exec nx typecheck opticv-web` passes
- [ ] `npm exec nx test opticv-web` passes — all 15 keyword-gap tests green
- [ ] No changes to existing ATS autopsy, job-upload, or optimization-result-panel components
- [ ] No `any` types introduced
- [ ] No `standalone: true` in component decorator
- [ ] All template control flow uses `@if`/`@for`/`@switch` (no `*ngIf`/`*ngFor`)
- [ ] `ChangeDetectionStrategy.OnPush` set on the component
- [ ] `input.required<>()` used (not `@Input()` decorator)
- [ ] `computed()` used for all derived state (not manual getters)
