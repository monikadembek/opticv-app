# Specification Review

Task ID: 27-retry-failed-optimization

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-structured, covers all three explicit task requirements (Retry button per panel, single-prompt retry, enabled-only-when-failed condition), and correctly maps to the existing codebase. One critical gap exists: the spec does not address how `isRetryable` determines the computed-signal result in the template, since each panel has a *different* computed signal — this coupling is left unresolved and will force a decision at implementation time. Two non-critical issues also need minor clarification.

---

### Findings

#### Critical Issues

1. **`isRetryable` helper is underspecified for template use.**
   Behavior §4 says the button renders with `@if (isRetryable(promptType))`, and Implementation Notes offer two alternatives: a helper function taking `(promptType, computedResult)` OR a `computed<Set<PromptType>>`. Neither alternative is resolved. The template needs a concrete, consistent approach because each panel has a different computed signal (`autopsyResult`, `keywordGapResult`, etc.). If a helper function is chosen, callers must pass the right computed signal per panel. If a `Set<PromptType>` is chosen, it must be built from all six computed signals. The spec leaves this decision open, which creates implementation ambiguity. One approach must be chosen and specified.

#### Non-Critical Issues

1. **`runSingleOptimizationProcess` error path is ambiguous.**
   Behavior §3 says on `error`, `isProcessing` is set to `false` and `results` is not updated. However, the error could originate from either `runSingleOptimizationProcess` (HTTP error before SSE) or `streamOptimizationEvents` (SSE connection failure). The spec does not differentiate these two failure modes. For the case where the HTTP call itself fails (before a `runId` is returned), there is no existing `results` entry to preserve — the Retry button would need to remain visible, but based on what condition? This path is not covered.

2. **Button position is "or" — two options given, none resolved.**
   Behavior §4 says the button is "Positioned below the `<app-optimization-result-panel>` content, *or* inside an error state slot if the panel exposes one." Two options are offered without specifying which to use. This leaves the implementer to decide, which may produce inconsistent placement across panels.

#### Unclear or Ambiguous Sections

- **Behavior §2, third bullet:** "The panel has a result entry OR has been started but the computed signal is `null`" — the "OR" in this sentence is confusing because "has been started" is not a distinct signal state; `isProcessing` tracks in-flight, and `results` tracks completion. A panel that has been started but not yet finished would have `isProcessing = true`, which already disqualifies it from retryable state per the second condition. The clause "has been started but the computed signal is `null`" should instead read "has a result entry with status `'completed'` but the computed signal is `null`" for precision.

- **Behavior §3, `switchMap` reference in Implementation Notes:** The existing `runOptimization` uses `mergeMap` + `switchMap` (inner `switchMap` for SSE). The retry method should clarify whether it uses `switchMap` to cancel a prior in-flight retry for the same `PromptType`, or `concatMap`/direct subscribe. The note says "follow existing patterns" but the existing pattern is for batch processing, not single-item retry.

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | LinkedIn Updates panel (value "7") is excluded from Retry because it has no typed computed signal. | Yes — Out of scope section. |
| 2 | The `jobApplicationId` is reset to `null` on each new `runOptimization` call, preventing stale retries from a prior session. | Yes — Behavior §1. |
| 3 | `runSingleOptimizationProcess` accepts the same `jobApplicationId` and `promptType` parameters as the full-run flow. | Yes — Data/API section. |
| 4 | The Retry button does not need to appear in the accordion header, only in the panel content. | Implicit — Behavior §4 only mentions content area. Not explicitly justified. |
| 5 | Rapid double-click protection is achieved solely by disabling the button when `isProcessing` is true, without debounce. | Yes — Edge Cases. |
| 6 | A network error during SSE does not write a new `results` entry, so the prior `'failed'` entry remains and keeps the button visible. | Yes — Behavior §3 error path and Edge Cases. |
| 7 | No new tests are required beyond build/typecheck/lint passing. | Implicit — Acceptance criteria list no unit tests. Raw task says nothing about tests either. |

---

### Recommendation

**Revise specification** — resolve the `isRetryable` helper approach (choose one of the two options and fully specify it), clarify the HTTP-error-before-SSE failure path, and pick a definitive button position.
