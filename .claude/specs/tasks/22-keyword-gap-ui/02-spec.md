# Task Specification

## Source

Task 22: Display keyword gap analysis results

## Goal

Create a `KeywordGapResult` shared type, add a `keyword-gap` Angular component that displays the structured output of the `KEYWORD_GAP` prompt, and wire it into the existing `cv-optimization` page in place of the current raw JSON placeholder.

## Context

The `cv-optimization` feature page runs several AI prompt analyses in parallel via SSE. One of those prompts (`PromptType.KEYWORD_GAP`) already completes and stores its result, but the panel currently displays raw JSON. The ATS Autopsy result panel (`ats-score` component) is the established UX pattern to follow.

Relevant files:
- Shared types: `packages/shared/datatypes/src/lib/datatypes.ts`
- ATS score pattern: `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/`
- Optimization result panel wrapper: `apps/opticv-web/src/app/features/cv-optimization/components/optimization-result-panel/`
- Main page: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` & `.html`

## Scope

### In scope

- Add `KeywordGapResult` and related sub-types to `@opticv/datatypes`
- Add `isKeywordGapResult(value: unknown)` type guard to `@opticv/datatypes`
- Create `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/` component
- Add `keywordGapResult` computed signal in `cv-optimization.ts`
- Replace the raw JSON placeholder in `cv-optimization.html` accordion panel `value="2"` with the new component
- Unit tests for the new component

### Out of scope

- Backend changes (prompt, outputSchema, API endpoints)
- Changes to any other result panel or component
- Persisting or loading existing results from the DB on page load

## Behavior

### 1. Shared type definition

Add to `datatypes.ts`:

```
KeywordGapMatchedKeyword {
  keyword: string
  matchType: 'exact' | 'semantic' | 'partial'
  occurrencesInResume: number
  isRequired: boolean
}

KeywordGapMissingKeyword {
  keyword: string
  category: string   // enum values from the prompt outputSchema
  importance: 'critical' | 'high' | 'medium' | 'low'
  isRequired: boolean
  candidateLikelyHas: boolean
  evidenceFromResume: string
  recommendation: string
  suggestedPlacement: 'summary' | 'skills' | 'experience_bullet' | 'title' | 'multiple'
}

KeywordGapUnderweightedKeyword {
  keyword: string
  currentOccurrences: number
  recommendedOccurrences: number
  suggestedAdditions: string[]
}

KeywordGapFabricationWarning {
  keyword: string
  reason: string
}

KeywordGapAcronymIssue {
  term: string
  issue: string
  fix: string
}

KeywordGapMatchScoreBreakdown {
  requiredMatched: number
  requiredTotal: number
  preferredMatched: number
  preferredTotal: number
}

KeywordGapResult {
  matchScore: number
  matchScoreBreakdown: KeywordGapMatchScoreBreakdown
  matchedKeywords: KeywordGapMatchedKeyword[]
  missingKeywords: KeywordGapMissingKeyword[]
  underweightedKeywords: KeywordGapUnderweightedKeyword[]
  fabricationWarnings: KeywordGapFabricationWarning[]
  acronymIssues: KeywordGapAcronymIssue[]
}
```

`isKeywordGapResult` guard checks that `matchScore` is a number and `missingKeywords` is an array.

### 2. `cv-optimization.ts` changes

Add a `keywordGapResult` computed signal analogous to `autopsyResult`:

```
readonly keywordGapResult = computed<KeywordGapResult | null>(() => {
  const r = this.results().get(PromptType.KEYWORD_GAP)?.result;
  return isKeywordGapResult(r) ? r : null;
});
```

### 3. `cv-optimization.html` change

In the accordion panel currently at `value="2"` (KEYWORD_GAP), replace:

```html
{{ r.result | json }}
```

with:

```html
<app-optimization-result-panel
  [loading]="isProcessing().get(promptType.KEYWORD_GAP) ?? false"
  [error]="results().get(promptType.KEYWORD_GAP)?.error ?? null"
  [hasData]="keywordGapResult() !== null"
>
  <app-keyword-gap [result]="keywordGapResult()!" />
</app-optimization-result-panel>
```

### 4. `keyword-gap` component layout

The component accepts a single required input: `result: KeywordGapResult`.

**Section order and visibility:**

1. **Match Score** — always shown
2. **Missing Keywords** — shown only when `missingKeywords.length > 0`
3. **Matched Keywords** — shown only when `matchedKeywords.length > 0`
4. **Underweighted Keywords** — shown only when `underweightedKeywords.length > 0`
5. **Acronym Issues** — shown only when `acronymIssues.length > 0`
6. **Fabrication Warnings** — shown only when `fabricationWarnings.length > 0`

#### Section 1 — Match Score

Display a score ring (same SVG ring pattern as `ats-score`) showing `matchScore` (0–100).

Color thresholds (same as ATS score):
- Red: ≤ 49
- Amber: 50–74
- Green: ≥ 75

Below the ring, show the breakdown as two rows:
- Required: `{requiredMatched} / {requiredTotal} matched`
- Preferred: `{preferredMatched} / {preferredTotal} matched`

#### Section 2 — Missing Keywords

Header: "Missing Keywords" with a count badge.

The list is split into two visual sub-groups using a subtle label/divider (not a collapsible):
- **"Likely have — add to your CV"**: items where `candidateLikelyHas === true`
- **"Skills to acquire or omit"**: items where `candidateLikelyHas === false`

Each row is a flat list item (not collapsible) showing:
- Importance badge (pill): critical = red, high = orange, medium = amber, low = slate
- `isRequired` marker: a small "Required" tag in blue if true
- Keyword name (bold)
- Recommendation text (secondary color, smaller)
- Suggested placement chip (e.g. "skills", "summary")

If only one sub-group has items, show only that sub-group (no label for the other).

#### Section 3 — Matched Keywords

Header: "Matched Keywords" with a count badge.

A flat list of items. Each row shows:
- Match type icon/badge: exact = green checkmark, semantic ≈ teal wave, partial = yellow half-circle
- `isRequired` marker: small "Required" tag in blue if true
- Keyword name
- `occurrencesInResume` shown as "×N" (e.g. "×3")

#### Section 4 — Underweighted Keywords

Header: "Underweighted Keywords" with a count badge.

A flat list. Each row shows:
- Keyword name (bold)
- Occurrence comparison: "{currentOccurrences} → {recommendedOccurrences}" with an arrow icon
- Below the row, a list of `suggestedAdditions` as small indented bullet points (or chips)

#### Section 5 — Acronym Issues

Header: "Acronym Issues".

A flat list. Each row shows:
- Term (bold)
- Issue text (secondary)
- Fix text prefixed with "Fix:" in green

#### Section 6 — Fabrication Warnings

Header: "Fabrication Warnings" with an amber warning icon.

A flat list. Each row shows:
- Keyword (bold)
- Reason text

Rendered with a subtle amber background to indicate caution.

### 5. Computed state in the component

Use `computed()` for:
- `missingLikelyHas`: `missingKeywords.filter(k => k.candidateLikelyHas)`
- `missingGenuinelyLacks`: `missingKeywords.filter(k => !k.candidateLikelyHas)`
- `scoreColor`: derived from `matchScore`

## Edge Cases

- All keyword arrays can be empty; when a section's array is empty, the entire section is not rendered.
- `matchScore` of 0 renders the ring red with "0%".
- `missingKeywords` may have items only in one of the two sub-groups — only show the populated sub-group's label.
- If `suggestedAdditions` on an underweighted keyword is empty, skip that bullet-point sub-row.
- If `evidenceFromResume` is an empty string, do not render a blockquote for it (unlike ATS autopsy which always renders it).

## Data / API

No new API endpoints or DB changes required. The backend already returns `KeywordGapResult`-shaped JSON as `SseJobCompleteEvent.result` for `PromptType.KEYWORD_GAP`.

Shared type package: `packages/shared/datatypes/src/lib/datatypes.ts`

New types to export from `@opticv/datatypes`:
- `KeywordGapResult`
- `KeywordGapMatchedKeyword`
- `KeywordGapMissingKeyword`
- `KeywordGapUnderweightedKeyword`
- `KeywordGapFabricationWarning`
- `KeywordGapAcronymIssue`
- `KeywordGapMatchScoreBreakdown`
- `isKeywordGapResult` (type guard function)

## Acceptance (DEV)

- `npm exec nx build datatypes` passes after adding types
- `npm exec nx build opticv-web` passes
- `npm exec nx typecheck opticv-web` passes
- `npm exec nx test opticv-web` passes with new keyword-gap component tests covering:
  - renders score ring with correct color for low / medium / high scores
  - hides a section when its array is empty
  - shows both "likely has" and "genuinely lacks" sub-groups when both are populated
  - shows only the populated sub-group when one is empty
- No breaking changes to existing components or types
