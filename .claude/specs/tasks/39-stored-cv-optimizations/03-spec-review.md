# Specification Review

Task: 39 — CV Optimizations: show list, delete optimization, open stored optimization

---

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec covers all three explicit task requirements (list, delete, open) and correctly grounds the tab layout, delete scope, and open behavior in clarifying-question answers. However, two issues need attention before implementation: (1) the "Open / Load stored optimization" section references a `jobSubmittedData` signal whose shape and source are never defined, leaving a concrete implementation gap; and (2) the route collision risk between `/cv-optimization` and `/cv-optimization/:jobApplicationId` in an Angular SSR context is not addressed and could break the existing flow.

---

## Findings

### Critical Issues

1. **`jobSubmittedData` signal is undefined in the spec.**
   In "Behavior → Open / Load stored optimization", step 3e states: "Populate `jobSubmittedData` signal so the UI renders as if the user just completed optimization." The spec never defines what `jobSubmittedData` contains, which signal it maps to in the existing component, or how hiding the `JobUpload` panel is controlled (step 4 says "should be hidden" without specifying the mechanism). Without this, the implementer cannot know which existing internal state to populate or how to conditionally render the upload form. This is a gap that must be resolved before implementation.

2. **Route ordering / collision not addressed.**
   The spec adds `/cv-optimization/:jobApplicationId` alongside the existing `/cv-optimization` route. Angular's router matches routes in declaration order, and these two paths can conflict depending on insertion order. The spec does not specify where the new route must be inserted relative to the existing one, nor whether the existing parameterless route needs a `pathMatch` guard. In an SSR context this can cause silent routing failures.

---

### Non-Critical Issues

1. **`OptimizationResultSummary` field completeness not confirmed.**
   Step 3c–3d in "Open / Load stored optimization" assumes `GET /api/optimizations/job-applications/:jobApplicationId/results` already returns `structuredOutput` as part of the result summaries. The spec lists `promptType`, `status`, `structuredOutput` as the fields it returns, but does not explicitly confirm whether the existing endpoint actually includes `structuredOutput` in its response payload. If it only returns summary metadata (e.g. status + promptType without the full JSON), a backend change would be needed — which is currently listed as out of scope.

2. **Cascade delete — Prisma schema change may be required.**
   The spec notes "Cascade deletes should be confirmed in the Prisma schema (`onDelete: Cascade`)". This is written as an observation, not as an action item, so it may be skipped. If the cascade is not already present, the DELETE endpoint will fail or leave orphaned `OptimizationResult` rows. This should be explicitly listed as a required verification step in Acceptance criteria.

3. **"Retry" option for the error state is not specified.**
   "Behavior → Optimizations tab" step 5 says "show an error message with a retry option" but does not specify what retry means — reload the full tab, re-call the API, or navigate away. Minor, but leaves the implementer to guess.

4. **Tab persistence / URL-based tab state not addressed.**
   If a user navigates to the dashboard while on the "My Optimizations" tab and refreshes, it is unspecified whether the tab should restore to "My Optimizations" or always reset to "My CVs". This is out of scope but could be a UX surprise worth noting as a known limitation.

---

### Unclear or Ambiguous Sections

- **"Behavior → Open / Load stored optimization", step 4** — "The `JobUpload` panel should be hidden when viewing a stored optimization." Does not specify the mechanism: a computed signal, a conditional route-level flag, a query param, or a structural change to the component. Ambiguous enough to produce inconsistent implementations.

- **"Behavior → Open / Load stored optimization", step 3d** — "For each completed `OptimizationResult`, parse `structuredOutput` into the appropriate typed result." Does not specify what "parse" means — `JSON.parse()`, a type guard, a factory function — nor where this parsing logic should live (component, service, or util).

- **"Edge Cases → Optimization in progress"** — "show a notice that some results are unavailable" — the location and content of this notice are not described. It is unclear whether this is a banner, a per-panel message, or a toast.

---

### Invented or Unsupported Requirements

- **`OptimizationListItem` type name** — The spec introduces the name `OptimizationListItem` as a component/card concept, but this type is never added to the shared types section. It appears to be an implied component-local type. Not harmful, but the naming is introduced without definition.

- **"link to `/cv-optimization`" in empty state** — The raw task does not mention a CTA in the empty state. This was inferred by the spec author as a reasonable UX addition but is not grounded in the task. Minor and harmless, but technically unsupported.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | The `GET /api/optimizations/.../results` endpoint already returns `structuredOutput` in its payload. | Implicitly assumed; stated as a fact but not verified. |
| 2 | Prisma schema already has `onDelete: Cascade` on `OptimizationResult → JobApplication`. | Listed as "should be confirmed" — not guaranteed. |
| 3 | The existing `CvOptimization` component has a single `jobSubmittedData` signal that controls post-submission rendering. | Implicit; signal name used without referencing the actual component source. |
| 4 | Hiding `JobUpload` when viewing a stored optimization is achievable without a full component refactor. | Implicit — marked in scope without assessing existing component structure. |
| 5 | Angular's router will correctly differentiate `/cv-optimization` from `/cv-optimization/:jobApplicationId` without explicit ordering constraints. | Implicit — no routing conflict analysis provided. |
| 6 | Tab defaults to "My CVs" on first load (not persisted per-session). | Explicitly stated in spec. |
| 7 | Delete removes the `JobApplication` and cascades to `OptimizationResult` rows (not only the results). | Explicitly stated — grounded in clarifying-question answer. |
| 8 | ATS score is excluded from the list card. | Explicitly stated as out of scope — grounded in clarifying-question answer. |

---

## Recommendation

**Revise specification** — address the two critical issues before implementation:

1. Define `jobSubmittedData` (or the equivalent signal) precisely: its type, its source in the existing component, and the mechanism for hiding `JobUpload`.
2. Specify the required route declaration order in `app.routes.ts` to avoid the `/cv-optimization` vs `/cv-optimization/:jobApplicationId` conflict.

Non-critical issues can be resolved during implementation, but the cascade-delete verification (non-critical issue #2) should be promoted to an Acceptance criterion.
