# Specification Review

Task ID: 21-display-ats-autopsy-results

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-structured, clearly grounded in the task, and provides sufficient detail for implementation. It correctly captures the UX intent ("modern nice UX" → rings, expandable cards, colour coding) and establishes the shared wrapper pattern. Two non-critical issues require attention before implementation: one acceptance criterion contradicts the project's `any`-avoidance rule (the integration snippet uses `$any(result)`), and the location of `OptimizationResultPanelComponent` is left unspecified, which could cause a structural inconsistency. No invented requirements were found.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **`$any(result)` in integration snippet contradicts the no-`any` acceptance criterion**
   In the *Integration in `cv-optimization.html`* section, the snippet uses `$any(result)` to pass data to `<app-ats-score>`. The Acceptance section simultaneously states "No `any` usage (use `ResumeAutopsyResult` cast via type guard)". These two instructions are contradictory. The spec should either:
   - Remove `$any(result)` and specify that the template calls a typed accessor/computed that returns `ResumeAutopsyResult`, or
   - Acknowledge `$any()` as an acceptable Angular-template-only cast and remove or qualify the no-`any` acceptance criterion.

2. **File location of `OptimizationResultPanelComponent` not specified**
   The scope lists it as "a shared wrapper" but gives no file path. The `AtsScoreComponent` path (`features/cv-optimization/components/ats-score/`) is explicit. It is unclear whether `OptimizationResultPanelComponent` should live in:
   - `features/cv-optimization/components/optimization-result-panel/` (feature-scoped), or
   - `shared/components/optimization-result-panel/` (app-wide shared).
   This is a structural decision that should be pinned in the spec before implementation.

3. **Severity group headers described as "collapsible" but collapse behavior is not fully specified**
   The Issues list section says "Each group has a collapsible header." It does not state whether groups are collapsed or expanded by default, whether collapse state persists, or whether collapsing a group hides its cards. This is minor but could cause ambiguity during implementation.

4. **`quotedText` may be empty string — no edge case defined**
   The `ResumeAutopsyIssue.quotedText` field is typed as `string` (not optional). If the AI returns an empty string, the `<blockquote>` would render empty. The edge cases section does not address this. A note to conditionally hide the blockquote when empty would close the gap.

#### Unclear or Ambiguous Sections

- **Behavior → `OptimizationResultPanelComponent` → "default slot (data present)"**: The table row says "Renders `ng-content`" but does not specify whether `ng-content` is *always* rendered alongside a state, or only when no state flag is active. Priority order of states (e.g. what if both `loading=true` and `hasData=true`?) is unspecified.

- **Acceptance criterion: "Score rings visually reflect correct colour coding"** — this is a visual check, not automatable. It is fine as a manual acceptance criterion but should be labelled as such to avoid confusion with automated test expectations.

#### Invented or Unsupported Requirements

None. All requirements in the spec are traceable to the original task ("display ATS autopsy results", "add ats-score component", "modern nice UX") or to answers given during the clarification phase (circular gauges, expandable cards, shared pattern, `@opticv/datatypes` types).

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | The RESUME_AUTOPSY `result` field already contains the full `ResumeAutopsyResult` JSON shape at runtime (produced by the backend). | Yes — "No DB or API changes needed — the backend already produces this shape." |
| 2 | No new PrimeNG components are needed; SVG rings are implemented manually with `stroke-dasharray`/`stroke-dashoffset`. | Yes — described in the Score header section. |
| 3 | `OptimizationResultPanelComponent` is reusable for future panels but those panels are out of scope for this task. | Yes — stated in Out of scope. |
| 4 | The `SseJobCompleteEvent.error` field is a `string` (not `Error` object or `null`). | Implicit only — the spec uses `?.error ?? null` without confirming the runtime type. Not stated explicitly. |
| 5 | Issues grouped by severity means the AI may return issues from any severity in any order, and the component is responsible for grouping/sorting. | Implicit only — the spec says "grouped by severity" but does not state whether the backend guarantees ordering. |
| 6 | `OptimizationResultPanelComponent` uses Angular `ng-content` (content projection) for the data slot. | Yes — "Renders `ng-content`" is stated in the behavior table. |
| 7 | The `@opticv/datatypes` package must be rebuilt when types are added before the frontend can use them (`^build` dependency in Nx). | Implicit — captured in CLAUDE.md architecture notes but not re-stated in the spec. Acceptance criterion `npm exec nx build datatypes` covers this. |

---

### Recommendation

**Revise specification** — address Non-Critical Issues 1 and 2 (the `$any` contradiction and the missing file path for `OptimizationResultPanelComponent`) before handing off to implementation. Issues 3 and 4 are minor and can be resolved with a one-line addition each. The rest of the spec is implementation-ready.
