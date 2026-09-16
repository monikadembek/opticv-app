# Code Review — Task 22: Display keyword gap analysis results

Reviewed by: Claude Code (automated peer review)
Date: 2026-05-20
Branch: feature/22-display-keyword-gap-analysis

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The implementation covers all spec requirements and follows Angular conventions correctly. Types, component structure, template, and wiring are all complete and well-formed. Two non-critical issues were found: `scoreColorClass`, `strokeColor`, and `strokeDashoffset` are plain methods rather than `computed()` signals (a convention mismatch and minor inconsistency with the plan), and `cv-optimization.ts` retains a `JsonPipe` import that is no longer used in the template for panel value="2". Neither issue breaks functionality or blocks merge.

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`keyword-gap.ts` lines 36–51 — plain methods instead of `computed()` signals**
   `scoreColorClass()`, `strokeColor()`, and `strokeDashoffset()` are regular class methods, not `computed()` signals. The conventions file states _"Use `computed()` for derived state"_ and the implementation plan (Step 2, computed signals table) lists `strokeColor` and `strokeDashoffset` as computed signals. `scoreColorClass` is also derived state and should be a computed signal. With `ChangeDetectionStrategy.OnPush` these methods are called in the template on every change-detection cycle, but are not memoized the way computed signals are.

2. **`cv-optimization.ts` line 10 — unused `JsonPipe` import**
   `JsonPipe` is still imported and declared in the component's `imports` array (line 48). The accordion panel value="2" no longer uses `| json`; the other panels (3–7) are outside the scope of this task. If no other panel in the current template uses `| json`, this import is dead code. Verify and remove if unused.
   _Note: panels 3–7 still use `{{ r.result | json }}`, so `JsonPipe` is still needed. This sub-issue is void — `JsonPipe` is still required. Disregard this item._

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Add `KeywordGapMatchScoreBreakdown` type | Covered | `datatypes.ts` lines 186–191 |
| Add `KeywordGapMatchedKeyword` type | Covered | `datatypes.ts` lines 193–198 |
| Add `KeywordGapMissingKeyword` type | Covered | `datatypes.ts` lines 200–209 |
| Add `KeywordGapUnderweightedKeyword` type | Covered | `datatypes.ts` lines 211–216 |
| Add `KeywordGapFabricationWarning` type | Covered | `datatypes.ts` lines 218–221 |
| Add `KeywordGapAcronymIssue` type | Covered | `datatypes.ts` lines 223–227 |
| Add `KeywordGapResult` type | Covered | `datatypes.ts` lines 229–237 |
| Add `isKeywordGapResult` type guard | Covered | `datatypes.ts` lines 239–243; checks `matchScore` number and `missingKeywords` array |
| All 7 types + guard exported | Covered | All use `export type` / `export function` |
| Create `keyword-gap.ts` component | Covered | Correct selector, `input.required`, `ChangeDetectionStrategy.OnPush`, no `standalone: true` |
| `missingLikelyHas` computed signal | Covered | `keyword-gap.ts` lines 21–23 |
| `missingGenuinelyLacks` computed signal | Covered | `keyword-gap.ts` lines 25–27 |
| `scoreColor` computed signal | Covered | `keyword-gap.ts` lines 29–34 |
| `strokeColor` as computed signal | Partial | Implemented as a plain method (line 43–48), not `computed()` — see Conventions Violations |
| `strokeDashoffset` as computed signal | Partial | Implemented as a plain method (line 50–52), not `computed()` — see Conventions Violations |
| Create `keyword-gap.html` template | Covered | All 6 sections present |
| Section 1 — Match Score ring (always shown) | Covered | SVG ring with `role="img"` and `aria-label` |
| Section 1 — Breakdown rows (required/preferred) | Covered | Both lines rendered |
| Section 2 — Missing Keywords with count badge | Covered | `h3` with badge, `@if` guard on length |
| Section 2 — "Likely have" sub-group | Covered | `@if (missingLikelyHas().length > 0)` |
| Section 2 — "Skills to acquire or omit" sub-group | Covered | `@if (missingGenuinelyLacks().length > 0)` |
| Section 2 — Row: importance badge with correct colors | Covered | `[class]` binding with all four importance values |
| Section 2 — Row: isRequired marker | Covered | `@if (item.isRequired)` blue tag |
| Section 2 — Row: keyword name bold | Covered | `font-semibold` on keyword span |
| Section 2 — Row: recommendation text | Covered | `<p class="... text-surface-500">` |
| Section 2 — Row: suggestedPlacement chip | Covered | `ml-auto` chip in header row |
| Section 2 — Row: evidenceFromResume conditional block | Covered | `@if (item.evidenceFromResume)` with italic indented style |
| Section 3 — Matched Keywords with count badge | Covered | `@if` guard, `h3` with badge |
| Section 3 — `@switch` on matchType | Covered | exact/partial/semantic icons correct |
| Section 3 — isRequired tag | Covered | Blue tag |
| Section 3 — occurrences as "×N" | Covered | `×{{ item.occurrencesInResume }}` |
| Section 4 — Underweighted Keywords with count badge | Covered | `@if` guard, `h3` with badge |
| Section 4 — Occurrence arrow row | Covered | `pi-arrow-right` icon between values |
| Section 4 — suggestedAdditions list (conditional) | Covered | `@if (item.suggestedAdditions.length > 0)` |
| Section 5 — Acronym Issues with count badge | Covered | `h3` with badge (plan resolution applied) |
| Section 5 — Term/Issue/Fix row | Covered | Correct layout with "Fix:" prefix in green |
| Section 6 — Fabrication Warnings with amber background | Covered | `bg-amber-50 border border-amber-200` wrapper |
| Section 6 — Warning icon in header | Covered | `pi-exclamation-triangle text-amber-500` |
| Section 6 — Count badge | Covered | Present (plan resolution applied) |
| Replace raw JSON placeholder in panel value="2" | Covered | `app-optimization-result-panel` with `app-keyword-gap` inside |
| `cv-optimization.html` — use `@if (keywordGapResult(); as result)` inside panel | Covered | Template uses `@if` guard before passing to component |
| `keywordGapResult` computed signal in `cv-optimization.ts` | Covered | Lines 68–71 |
| `KeywordGap` added to parent component imports | Covered | `cv-optimization.ts` line 27, 50 |
| Unit tests — 15 test cases per plan | Covered | 15 tests present in spec file |
| Test: scoreColor red for ≤49 | Partial | Tests `scoreColorClass()` method, not `scoreColor()` signal — functionally equivalent but tests a different signal than planned |
| Test: scoreColor amber for 50–74 | Partial | Same note as above |
| Test: scoreColor green for ≥75 | Partial | Same note as above |
| Test: hides sections when arrays empty | Covered | Tests 4, 6, 10, 11, 12 |
| Test: both sub-groups shown when both populated | Covered | Test 7 |
| Test: only likely-has when genuinely-lacks is empty | Covered | Test 8 |
| Test: only genuinely-lacks when likely-has is empty | Covered | Test 9 |
| Test: fabrication warnings amber background | Covered | Test 13 |
| Test: no evidenceFromResume block when empty string | Covered | Test 14 |
| Test: evidenceFromResume block when non-empty | Covered | Test 15 |
| No breaking changes to existing components/types | Covered | No existing types or components modified |
| No `any` types | Covered | None found |
| No `standalone: true` in decorator | Covered | Not present |
| All template control flow uses `@if`/`@for`/`@switch` | Covered | No `*ngIf` or `*ngFor` used |

---

### Plan Deviations

1. **`strokeColor`, `strokeDashoffset`, `scoreColorClass` — methods vs computed signals**
   The plan (Step 2) lists `strokeColor` and `strokeDashoffset` in the computed signals table and states "Use `computed()` for all derived state". The implementation uses plain methods for all three color/offset helpers, matching the `ats-score` parent's method style rather than the plan. While the `ats-score` component also uses plain methods (and this is consistent with the existing pattern), the plan explicitly called for computed signals.

2. **`cv-optimization.html` panel value="2" — `@if` guard added inside panel content**
   The plan (Step 6) shows the replacement as:
   ```html
   <app-keyword-gap [result]="keywordGapResult()!" />
   ```
   The actual implementation wraps this with `@if (keywordGapResult(); as result)` and uses `[result]="result"` instead of the non-null assertion `[result]="keywordGapResult()!"`. This is a **safer and cleaner deviation** — it avoids the non-null assertion operator and removes any risk of passing `null` to a required input. This is a positive improvement over the plan.

3. **`ringCircumference` exposed as class property**
   The plan does not mention `ringCircumference` as a required class property, but it is present in both `ats-score.ts` (the reference implementation) and `keyword-gap.ts`. This is consistent with the pattern and not a problem.

---

### Null Safety Issues

None. The `@if (keywordGapResult(); as result)` guard in `cv-optimization.html` ensures the component receives a non-null value. The `isKeywordGapResult` guard properly checks for `null` and non-object values before casting.

---

### Code Smells

1. **Missing keywords row template duplicated between the two sub-groups**
   `keyword-gap.html` lines 65–88 (missingLikelyHas loop) and lines 94–117 (missingGenuinelyLacks loop) are identical in structure. This is an acceptable level of duplication for a template without sub-components, and it is consistent with the spec's flat-list approach. Not a blocking issue, but worth noting if the row layout ever needs to change.

2. **`scoreColorClass` method is unreferenced in the template**
   `keyword-gap.ts` line 36–41 defines `scoreColorClass()` which returns a Tailwind text color class. The template does not appear to use this method — it uses `strokeColor()` for the SVG `fill` attribute. The SVG text element uses `[attr.fill]="strokeColor()"` (hex value), not `scoreColorClass()`. This is dead code.

---

### Recommendation

**Fix critical issues before merge** — there are no critical issues.

The non-critical items to address before merging are:

1. Remove the dead `scoreColorClass()` method from `keyword-gap.ts` (lines 36–41), or convert it to a `computed()` signal and use it in the template if a CSS class color binding is needed alongside the SVG hex binding.
2. Consider converting `strokeColor()` and `strokeDashoffset()` to `computed()` signals to align with the plan and project conventions, though this is a minor improvement since the component is `OnPush` and the values are only re-evaluated when the input signal changes.

All 15 tests are present and cover the required scenarios. The template is clean, accessible, and follows the established `ats-score` UX pattern. The wiring into `cv-optimization.ts` and `.html` is correct. The types and guard in `datatypes.ts` are complete and well-formed.
