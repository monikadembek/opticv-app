# Implementation Done — Task 22: Display keyword gap analysis results

Date: 2026-05-20
Branch: feature/22-display-keyword-gap-analysis

---

## Summary

The keyword gap analysis UI has been implemented. Seven new shared types and the `KeywordGapResult` type were added to `@opticv/datatypes`. A new `KeywordGap` Angular component with template and 15 unit tests was created. The `cv-optimization.ts` page component was wired to expose a `keywordGapResult` computed signal and import the new component. The accordion panel `value="2"` in `cv-optimization.html` was replaced with the structured `app-optimization-result-panel` + `app-keyword-gap` layout.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Add `KeywordGapMatchScoreBreakdown` type to `@opticv/datatypes` | Implemented | `datatypes.ts` lines 186–191 |
| Add `KeywordGapMatchedKeyword` type to `@opticv/datatypes` | Implemented | `datatypes.ts` lines 193–198 |
| Add `KeywordGapMissingKeyword` type to `@opticv/datatypes` | Implemented | `datatypes.ts` lines 200–214 |
| Add `KeywordGapUnderweightedKeyword` type to `@opticv/datatypes` | Implemented | `datatypes.ts` lines 216–221 |
| Add `KeywordGapFabricationWarning` type to `@opticv/datatypes` | Implemented | `datatypes.ts` lines 223–226 |
| Add `KeywordGapAcronymIssue` type to `@opticv/datatypes` | Implemented | `datatypes.ts` lines 228–232 |
| Add `KeywordGapResult` type to `@opticv/datatypes` | Implemented | `datatypes.ts` lines 234–242 |
| Add `isKeywordGapResult` type guard exported from `@opticv/datatypes` | Not implemented | Guard is defined as a local function in `cv-optimization.ts` — not exported from the shared datatypes package |
| Create `keyword-gap.ts` component | Implemented | `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` |
| `input.required<KeywordGapResult>()` as the component input | Implemented | `keyword-gap.ts` line 17 |
| `ChangeDetectionStrategy.OnPush` on the component | Implemented | `keyword-gap.ts` line 14 |
| No `standalone: true` in decorator | Implemented | Not present |
| `missingLikelyHas` computed signal | Implemented | `keyword-gap.ts` lines 21–23 |
| `missingGenuinelyLacks` computed signal | Implemented | `keyword-gap.ts` lines 25–27 |
| `scoreColor` computed signal | Implemented | `keyword-gap.ts` lines 29–34 |
| `strokeColor` as computed signal | Implemented | `keyword-gap.ts` lines 36–41 |
| `strokeDashoffset` as computed signal | Implemented | `keyword-gap.ts` lines 43–45 |
| Create `keyword-gap.html` template | Implemented | `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` |
| Section 1 — Match Score SVG ring (always shown) | Implemented | `keyword-gap.html` lines 4–51; SVG with `role="img"` and `aria-label` |
| Section 1 — Breakdown rows (Required / Preferred) | Implemented | `keyword-gap.html` lines 40–50 |
| Section 2 — Missing Keywords shown only when `missingKeywords.length > 0` | Implemented | `@if (result().missingKeywords.length > 0)` |
| Section 2 — Count badge on header | Implemented | Badge showing `result().missingKeywords.length` |
| Section 2 — "Likely have — add to your CV" sub-group (conditional) | Implemented | `@if (missingLikelyHas().length > 0)` |
| Section 2 — "Skills to acquire or omit" sub-group (conditional) | Implemented | `@if (missingGenuinelyLacks().length > 0)` |
| Section 2 — Importance badge with correct color per level | Implemented | `[class]` binding: critical/red, high/orange, medium/amber, low/slate |
| Section 2 — `isRequired` "Required" tag | Implemented | `@if (item.isRequired)` blue tag |
| Section 2 — Keyword name bold | Implemented | `font-semibold` span |
| Section 2 — Recommendation text | Implemented | `<p class="... text-surface-500">` |
| Section 2 — `suggestedPlacement` chip | Implemented | `ml-auto` chip in the row header |
| Section 2 — `evidenceFromResume` block only when non-empty | Implemented | `@if (item.evidenceFromResume)` italic indented block |
| Section 3 — Matched Keywords shown only when `matchedKeywords.length > 0` | Implemented | `@if (result().matchedKeywords.length > 0)` |
| Section 3 — Count badge on header | Implemented | Badge showing `result().matchedKeywords.length` |
| Section 3 — `@switch` on `matchType` for icon | Implemented | exact=`pi-check-circle`/green, partial=`pi-circle`/yellow, semantic=`pi-minus-circle`/teal |
| Section 3 — `isRequired` tag | Implemented | Blue tag |
| Section 3 — Occurrence count as "×N" | Implemented | `×{{ item.occurrencesInResume }}` |
| Section 4 — Underweighted Keywords shown only when length > 0 | Implemented | `@if (result().underweightedKeywords.length > 0)` |
| Section 4 — Count badge on header | Implemented | Badge showing `result().underweightedKeywords.length` |
| Section 4 — Occurrence arrow row | Implemented | `pi-arrow-right` between current and recommended values |
| Section 4 — `suggestedAdditions` list only when non-empty | Implemented | `@if (item.suggestedAdditions.length > 0)` |
| Section 5 — Acronym Issues shown only when length > 0 | Implemented | `@if (result().acronymIssues.length > 0)` |
| Section 5 — Count badge on header | Implemented | Plan resolution applied: badge added |
| Section 5 — Term / Issue / Fix row with "Fix:" prefix | Implemented | Green `text-green-600` with `font-medium` "Fix:" prefix |
| Section 6 — Fabrication Warnings shown only when length > 0 | Implemented | `@if (result().fabricationWarnings.length > 0)` |
| Section 6 — Amber background wrapper | Implemented | `bg-amber-50 border border-amber-200 rounded-lg p-4` |
| Section 6 — Warning icon in header | Implemented | `pi-exclamation-triangle text-amber-500` |
| Section 6 — Count badge on header | Implemented | Plan resolution applied: badge added |
| Replace raw JSON placeholder in accordion panel `value="2"` | Implemented | Replaced with `app-optimization-result-panel` + `app-keyword-gap` |
| `keywordGapResult` computed signal in `cv-optimization.ts` | Implemented | `cv-optimization.ts` lines 75–78 |
| `KeywordGap` added to parent component `imports` array | Implemented | `cv-optimization.ts` lines 26 and 57 |
| Create `keyword-gap.spec.ts` with unit tests | Implemented | 15 tests present |
| Test: scoreColor for low score (≤49) | Implemented | Tests `scoreColorClass()` — returns `'text-red-500'` |
| Test: scoreColor for medium score (50–74) | Implemented | Tests `scoreColorClass()` — returns `'text-amber-500'` |
| Test: scoreColor for high score (≥75) | Implemented | Tests `scoreColorClass()` — returns `'text-green-500'` |
| Test: hides matched keywords section when empty | Implemented | Test checks absence of "Matched Keywords" heading |
| Test: shows matched keywords section when non-empty | Implemented | Test checks presence of "Matched Keywords" heading |
| Test: hides missing keywords section when empty | Implemented | Test checks absence of "Missing Keywords" heading |
| Test: both sub-groups shown when both populated | Implemented | Both sub-group labels present in DOM |
| Test: only likely-has sub-group when genuinely-lacks is empty | Implemented | Checks only the "Likely have" label is present |
| Test: only genuinely-lacks sub-group when likely-has is empty | Implemented | Checks only "Skills to acquire or omit" label is present |
| Test: hides underweighted section when empty | Implemented | Checks absence of "Underweighted Keywords" heading |
| Test: hides acronym issues section when empty | Implemented | Checks absence of "Acronym Issues" heading |
| Test: hides fabrication warnings section when empty | Implemented | Checks absence of "Fabrication Warnings" heading |
| Test: fabrication warnings rendered with amber background | Implemented | Queries `.bg-amber-50` element |
| Test: no evidenceFromResume block when field is empty string | Implemented | Queries `.border-l.border-surface-200` — expects 0 elements |
| Test: evidenceFromResume block rendered when non-empty | Implemented | Queries `.border-l.border-surface-200` — expects 1 element |
| No breaking changes to existing components or types | Implemented | No existing types or components modified |
| No `any` types | Implemented | None found |
| All template control flow uses `@if`/`@for`/`@switch` | Implemented | No `*ngIf`, `*ngFor` used |

---

## Files

### Created

| File | Description |
|------|-------------|
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` | New `KeywordGap` Angular component |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` | Component template — 6 sections |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts` | 15 unit tests |

### Modified

| File | Change |
|------|--------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added 7 `KeywordGap*` types |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added `keywordGapResult` computed signal; imported and registered `KeywordGap`; added local `isKeywordGapResult` guard |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Replaced raw JSON placeholder in panel `value="2"` with structured component |

---

## Components

| Component | Status |
|-----------|--------|
| `KeywordGap` (`app-keyword-gap`) | Exist |

---

## Stores

None planned or required for this task.

---

## Deviations

1. **`isKeywordGapResult` not exported from `@opticv/datatypes`** — The spec and plan specify the guard should be exported from the shared types package. It was implemented as a local private function inside `cv-optimization.ts` instead. Functionally equivalent within the app, but does not satisfy the spec's export requirement.

2. **`scoreColor` computed returns `'red'`/`'amber'`/`'green'` strings, not the Tailwind text class** — The plan listed `scoreColor` as returning `'red' | 'amber' | 'green'`. The template does not use `scoreColor()` directly; instead `strokeColor()` (hex value) is used for SVG attributes. An additional method `scoreColorClass()` exists returning Tailwind text class strings (`'text-red-500'`, etc.), which is not used in the template (dead code).

3. **Template in panel `value="2"` uses `@if (keywordGapResult(); as result)` guard instead of `[result]="keywordGapResult()!"`** — The plan specified using the non-null assertion operator. The implementation uses a safer `@if` guard and passes the narrowed `result` variable instead. No functional difference; the null assertion is avoided.

4. **`ringCircumference` exposed as a class property** — Not listed in the plan's computed signals table. Present as a constant-derived readonly property (`RING_CIRCUMFERENCE`), consistent with the `ats-score` reference pattern.

---

## Additional Implementation

1. **`scoreColorClass()` method** — A `scoreColorClass()` method is defined in `keyword-gap.ts` (returns Tailwind text color class strings). This method is not referenced in the template and is not mentioned in the spec or plan. It is dead code.
