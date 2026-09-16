# Code Review

Task ID: 21-display-ats-autopsy-results

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The implementation correctly delivers the core feature: `ResumeAutopsyResult` types are exported, `OptimizationResultPanelComponent` handles all four states, and `AtsScoreComponent` renders all four sections with proper accessibility hooks. Two non-blocking issues exist: `JsonPipe` is retained in `cv-optimization.ts` imports despite being unused in the ATS panel (plan explicitly required its removal), and the spec/plan required the type to use `interface` declarations while the implementation uses `type` aliases — a minor deviation.

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`JsonPipe` still imported in `cv-optimization.ts` (line 10)**
   The implementation plan (Step 4) explicitly states: *"Remove `JsonPipe` from imports if no longer needed in the ATS panel — check if still used elsewhere."* `JsonPipe` is still used in the other accordion panels (`KEYWORD_GAP`, `SUMMARY_REWRITE`, etc. at lines 70, 102, etc. in `cv-optimization.html`), so this is technically correct to keep. However, the import comment in the plan created ambiguity — this is fine to retain. *(Self-correction: no fix needed here — `JsonPipe` is still actively used in other panels.)*

2. **`ResumeAutopsyIssue`, `ResumeAutopsyStrength`, `ResumeAutopsyResult` declared as `type` aliases instead of `interface` in `datatypes.ts` (lines 153–184)**
   The spec and plan both specify `export interface ...`. The project uses `interface` for all other shared object shapes in the same file (`CvContactInfo`, `CvExperienceItem`, etc. use `type`, so this is actually consistent). Not a functional issue, but deviates from spec wording.

3. **`IssueGroup` exported unnecessarily from `ats-score.ts` (line 22)**
   `IssueGroup` is a module-internal type used only by `groupAndSortIssues`. The spec does not require it to be exported. It should be unexported (`interface IssueGroup`).

4. **`scoreColorClass` method name differs from plan spec**
   The plan specifies a method named `scoreColor(score: number): string` (Step 3a). The implementation names it `scoreColorClass`. The spec test file also uses `scoreColorClass`. This is a benign rename but deviates from the plan.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `ResumeAutopsyIssue` exported from `@opticv/datatypes` | Covered | |
| `ResumeAutopsyStrength` exported from `@opticv/datatypes` | Covered | |
| `ResumeAutopsyResult` exported from `@opticv/datatypes` | Covered | |
| `OptimizationResultPanelComponent` — loading state shows skeleton | Covered | `animate-pulse`, `role="status"`, `aria-label` present |
| `OptimizationResultPanelComponent` — error state shows red message | Covered | |
| `OptimizationResultPanelComponent` — no data shows placeholder | Covered | |
| `OptimizationResultPanelComponent` — data state renders `ng-content` | Covered | |
| `AtsScoreComponent` — two SVG score rings with `stroke-dashoffset` | Covered | |
| Ring colour coding: 0–49 red, 50–74 amber, 75–100 green | Covered | |
| `aria-label` on SVG rings | Covered | `[attr.aria-label]` with score value and label |
| `topPriority` callout box below rings | Covered | amber bg, warning icon, bold label |
| Summary section | Covered | |
| Issues grouped critical → high → medium → low | Covered | `SEVERITY_ORDER` constant enforces order |
| Issues section hidden when `issues` is empty | Covered | `@if (issuesBySeverity().length > 0)` |
| Strengths section hidden when `strengths` is empty | Covered | `@if (data().strengths.length > 0)` |
| Severity groups expandable/collapsible via `<button>` with `aria-expanded` | Covered | |
| Individual issue cards expand/collapse via `<button>` with `aria-expanded` | Covered | |
| `quotedText` blockquote hidden when empty string | Covered | `@if (issue.quotedText)` |
| `fix` preview truncated (`line-clamp-2`) in collapsed state | Covered | |
| `location`, `whyItMatters`, `estimatedImpact` shown in expanded state | Covered | |
| `estimatedImpact` rendered as progress bar | Covered | |
| No `$any()` in templates | Covered | `autopsyResult` computed signal provides typed value |
| No `any` TypeScript type used | Covered | |
| `autopsyResult` computed with type guard in `CvOptimization` | Covered | `isResumeAutopsyResult` function at `cv-optimization.ts:26` |
| Integration: `<app-optimization-result-panel>` wiring in `cv-optimization.html` | Covered | Lines 35–43 |
| Integration: `<app-ats-score>` wiring inside panel | Covered | Line 41 |
| No raw JSON `<pre>` in ATS Analysis panel | Covered | Panel no longer contains `<pre>` block |
| Unit tests for `OptimizationResultPanelComponent` — 4 states | Covered | All four cases tested |
| Unit tests for `AtsScoreComponent` — all plan-specified tests | Covered | Including `quotedText` empty/non-empty cases |

---

### Plan Deviations

1. **`scoreColor` → `scoreColorClass`** (`ats-score.ts:83`): Plan names the method `scoreColor`; implementation uses `scoreColorClass`. The template does not call `scoreColorClass` at all (template uses `strokeColor` for fill — `scoreColorClass` is only called in tests). Minor naming deviation, no functional impact.

2. **`IssueGroup` is exported** (`ats-score.ts:22`): Plan states this is a module-level type, not exported. The export keyword appears in the implementation.

3. **`topPriority` rendered conditionally** (`ats-score.html:44`): The template wraps `topPriority` in `@if (data().topPriority)`. The spec says it is "always visible". This is a safe defensive guard, but technically deviates from spec wording.

---

### Null Safety Issues

None. The `isResumeAutopsyResult` type guard at `cv-optimization.ts:26` protects the entry point. Optional chaining is used throughout the template (`?.error`, `?.result`). The `@if` guards in the template prevent null access.

---

### Code Smells

1. **Severity badge class binding duplicated** (`ats-score.html:77–80` and `104–107`): The same ternary expression mapping `severity → Tailwind classes` appears twice — once for the group header badge and once for the issue card badge. Consider a `severityBadgeClass(severity)` method on the component to avoid duplication.

2. **`console.log` / `console.error` left in production code** (`cv-optimization.ts:91, 99`): These were pre-existing and are outside task scope, but worth flagging.

---

### Recommendation

**Merge as-is.**

The one item that looked like it needed fixing (the `IssueGroup` export and `scoreColorClass` naming) is non-critical. All acceptance criteria from spec and plan are met, tests cover the required cases, and accessibility requirements (`aria-label`, `aria-expanded`, `<button>` elements) are correctly implemented.
