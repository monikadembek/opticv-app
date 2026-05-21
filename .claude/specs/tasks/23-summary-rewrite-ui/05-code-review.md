# Code Review: 23-summary-rewrite-ui

## Summary

- **Overall result: PASS WITH ISSUES**
- The implementation satisfies all core specification requirements: shared types are added, the `SummaryRewrite` component renders all required sections, type guard and computed signal are in place, and the accordion panel is updated correctly. Two non-critical convention violations exist (missing `signal` import and missing expand/collapse feature), and one critical deviation from the plan requires attention: the `filter` operator was removed rather than updated, causing all prompt types (not just `KEYWORD_GAP` and `SUMMARY_REWRITE`) to fire on form submit, which contradicts both spec and plan.

---

## Conventions Violations

### Critical (must fix before merge)

1. **`cv-optimization.ts` — `filter` operator removed instead of updated**
   The git diff shows `filter` was removed from the RxJS import and the `filter((prompt) => prompt === PromptType.KEYWORD_GAP)` call was deleted entirely. The spec (§Behavior, item 1) and plan (Step 3c) explicitly require filtering to `KEYWORD_GAP` **and** `SUMMARY_REWRITE`. The current code runs all seven `PromptType` values (`RESUME_AUTOPSY`, `KEYWORD_GAP`, `SUMMARY_REWRITE`, `BULLET_UPGRADE`, `COVER_LETTER`, `INTERVIEW_PREP`, `LINKEDIN_REWRITE`) on every form submit. This violates the spec scope and will trigger backend requests for prompts that have no UI yet.

### Non-Critical (should fix)

1. **`summary-rewrite.ts` line 1 — `signal` not imported but plan requires it**
   The plan specifies `showAllKeywords = signal(false)` for the expand/collapse feature. Neither the signal import nor the computed properties (`visibleKeywords`, `hasMoreKeywords`, `hiddenKeywordsCount`) are present in the component. The expand/collapse feature is missing entirely from both the `.ts` and `.html` files (see Plan Deviations below).

2. **`summary-rewrite.html` line 41 — colour inconsistency on "Recommended" badge**
   The "Recommended" badge uses `text-green-700` but `bg-primary-100`. The plan specifies `text-primary-700` for this badge. Using a semantic green on a primary-coloured background creates a visual mismatch and may cause contrast issues depending on the theme's primary colour.

3. **`summary-rewrite.html` lines 32–33 — non-standard border utility**
   `border-b-solid` is not a standard Tailwind CSS 4 utility. The correct utility is `border-solid` (applied once, not per-side). This may silently no-op at build time.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Add `SummaryRewriteVariantAngle`, `SummaryRewriteVariant`, `SummaryRewriteResult` to `datatypes.ts` | Covered | `recommendationReason` correctly typed as `string \| undefined` (optional), matching plan correction |
| Create `SummaryRewrite` component with `app-summary-rewrite` selector and `OnPush` | Covered | |
| `result = input.required<SummaryRewriteResult>()` | Covered | |
| Original summary section with "No summary present" placeholder | Covered | |
| Three variant cards with angle badge, "Recommended" badge, word count | Covered | "Recommended" badge colour differs from plan (see Non-Critical #2) |
| Recommended card visually highlighted with coloured border | Covered | |
| Strategic note in italic | Covered | |
| `keywordsUsed` pills hidden when empty | Covered | Verified by spec test at line 117 |
| `recommendationReason` section rendered when truthy, hidden otherwise | Covered | Label changed to "Why the recommended variant?" vs plan's "Why this variant?" — minor but consistent |
| `keywordsIncorporated` rendered when non-empty | Covered | |
| `keywordsIncorporated` expand/collapse (max 8 + "Show all (N)") | **Missing** | No `showAllKeywords` signal, `visibleKeywords`, `hasMoreKeywords` computed, or toggle button exist |
| `isSummaryRewriteResult` type guard in `cv-optimization.ts` | Covered | |
| `summaryRewriteResult` computed signal | Covered | |
| `SUMMARY_REWRITE` added to prompt filter in `runOptimization` | **Missing** | Filter removed entirely; all seven prompt types now run |
| Panel `value="3"` uses `<app-optimization-result-panel>` wrapping `<app-summary-rewrite>` | Covered | |
| Each variant card has `role="article"` and `aria-label` | Covered | |
| No `any` types | Covered | |
| No `TODO` comments | Covered | |
| `standalone: true` not set in decorator | Covered | |
| No `ngClass`/`ngStyle` — uses `[class]` binding | Covered | |
| Native control flow (`@if`, `@for`) | Covered | |
| `input()` / `computed()` functions (no decorators) | Covered | |

---

## Plan Deviations

1. **Expand/collapse for `keywordsIncorporated` not implemented.**
   Plan Step 2a specifies: `showAllKeywords = signal(false)`, `visibleKeywords = computed(...)`, `hasMoreKeywords = computed(...)`, `hiddenKeywordsCount = computed(...)`. Plan Step 2b (Section 4) specifies a toggle button. None of these exist. The section instead renders all keywords unconditionally.

2. **`filter` operator removed rather than extended.**
   Plan Step 3c states: change the filter to pass `KEYWORD_GAP` **and** `SUMMARY_REWRITE`. The implementation deleted the filter entirely, running all prompt types.

3. **`angleLabels` exposed as a class property (`readonly angleLabels = ANGLE_LABELS`) rather than via `computed()`.**
   Plan Step 2a specifies `angleLabel = computed(...)` returning a `Map`. The implementation uses a module-level `const` object and exposes it as a direct property. This is functionally equivalent and arguably cleaner (a static lookup needs no `computed`), so this is an acceptable deviation — it does not violate any convention.

4. **`recommendationReason` label text changed.**
   Plan uses "Why this variant?"; implementation uses "Why the recommended variant?". Minor deviation, no functional impact.

---

## Null Safety Issues

None. `result().recommendationReason` is guarded by `@if (result().recommendationReason; as reason)` which correctly handles `undefined`. `keywordsUsed` and `keywordsIncorporated` are guarded by `.length > 0` checks before rendering.

---

## Code Smells

1. **`console.log` at `cv-optimization.ts` line 126** — `console.log('SSE - job complete event:', event)` is a debug statement left in production code. This pre-existed this task and is out of scope, but worth flagging.

---

## Recommendation

**Fix critical issues before merge.**

Two items must be addressed:

1. Restore the `filter` operator in `runOptimization` to include exactly `PromptType.KEYWORD_GAP` and `PromptType.SUMMARY_REWRITE` (re-add `filter` to the RxJS import and apply it before `mergeMap`).
2. Implement the `keywordsIncorporated` expand/collapse feature as specified in the plan (`showAllKeywords` signal, `visibleKeywords` and `hasMoreKeywords` computed properties, and the "Show all (N)" / "Show less" toggle button in the template).

The "Recommended" badge colour mismatch (`text-green-700` → `text-primary-700`) and the `border-b-solid` non-standard utility should also be corrected before merge.
