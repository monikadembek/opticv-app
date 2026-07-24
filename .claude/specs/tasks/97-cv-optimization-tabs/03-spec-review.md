# Specification Review

Task ID: 97-cv-optimization-tabs

## Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification correctly implements the task's core requirement (split into two tabs by content type, tabs-on-one-route, export footer scoped to Tab A) and grounds its grouping and export-footer-independence claims directly in the cited source lines. However, several behavioral details (collapse-scope per tab, sidebar filtering to only the active group, edit-state cancellation on tab switch, tab bar exact position) were resolved through clarifying questions rather than being present in the raw task, and are not clearly flagged as user-clarified decisions vs. task-derived requirements. One edge-case item (inline-edit cancellation on tab switch) goes beyond what the task discusses and reads as a spec-authored addition rather than a strict elaboration.

## Findings

### Critical Issues

None.

### Non-Critical Issues

- **"Collapse/Expand All" per-tab scoping** (Behavior §4, In Scope) is a reasonable and clearly specified design, but the raw task's discussion of `handleSectionClick`/scrollspy scoping never mentions the Collapse/Expand All button at all. This is a sensible elaboration filling a genuine gap (the raw task doesn't address it), but per the review criteria it should be labeled as an assumption/added-detail rather than presented at the same confidence level as requirements the task states explicitly (e.g. the tab split itself, or export footer scoping which the task does explicitly derive from code).
- **Sidebar/mobile-tabs filtering to only Job Posting + active group** (Scope, Behavior §3) is a stronger constraint than the raw task proposes. The raw task's own text says: *"if the clicked item's group differs from the active tab... [needs] a short delay/afterNextRender for the new tab's DOM to exist"* — i.e., the raw task's authors assumed the sidebar would keep showing **all** groups' items and clicking one would trigger a cross-tab switch. The spec's approach (hide inactive-group items entirely) is a materially different design resolved via user clarification, not derived from the raw task. It is technically simpler and was explicitly chosen by the user in the Q&A, so it's a valid resolution — but the spec should note this supersedes/contradicts the raw task's original assumption about `handleSectionClick`, rather than silently presenting it as elaboration of the existing scrollspy/click logic in Edge Cases and Scope.
- **Inline-edit cancellation on tab switch** (Edge Cases, bullet 2) is speculative and hedged ("if analogous open-edit signals exist"), and is not mentioned anywhere in the raw task. This reads as a new requirement invented by the spec author to close a gap, rather than a task-derived requirement or an explicitly-confirmed assumption. It should either be moved to "Assumptions" with a clear rationale, or removed pending a decision, since the acceptance criteria don't test it and its own wording is uncertain about whether the relevant signals even exist for cover letter/summary.
- **Unit test list** (Acceptance (DEV)) is reasonably thorough but doesn't include a test for the inline-edit-cancellation-on-tab-switch behavior described in Edge Cases, creating an internal inconsistency: a behavior is specified but not required to be tested.

### Unclear or Ambiguous Sections

- **Behavior §5 ("Initial default disclosure")**: "applied independently per group the first time its data becomes available/relevant" is somewhat ambiguous about the trigger condition — is it "first time this tab is switched to" or "first time this group's data finishes loading, regardless of which tab is active"? Given data loads for both tabs concurrently regardless of active tab (per Out of Scope), a user could switch to "Additional Materials" after its data has been ready for a while; the spec should clarify whether the default-expand-first-section logic fires once per group ever, or is somehow tied to tab-activation timing.
- **"below Job Posting: only the section cards belonging to the currently active tab's group render"** (Scope) vs. the user's literal answer in the Q&A ("tab bar is below the CV Optimization header and buttons... below the tabs put the job posting section, and below that the sections specific to active tab") — these are consistent, but the spec's Context section still says "Job Posting section stays outside both tabs and is always visible," which could be read as implying Job Posting is unaffected by tab component structure, when structurally it now sits between the tab bar and the active tab's panel. Minor wording risk, not a functional ambiguity, but worth tightening so implementers don't wonder if Job Posting belongs inside the `tabpanel` markup (relevant for the ARIA `role="tabpanel"` requirement in Acceptance).
- **ARIA structure requirement** (Acceptance (DEV)) mandates `role="tablist"`/`tab`/`tabpanel"`, but per the above ambiguity it's unclear whether Job Posting (rendered outside the two group-specific panels) should be inside a `tabpanel` at all, since ARIA tabpanel semantics normally imply "this content belongs only to this tab." The spec doesn't resolve where Job Posting sits relative to the ARIA tabpanel boundary.

### Invented or Unsupported Requirements

- The **inline-edit cancellation on tab switch** requirement (Edge Cases, bullet 2) is not grounded in the raw task and is presented with hedged, uncertain language ("if analogous open-edit signals exist"). This should be flagged as either an assumption needing confirmation or removed, per the workflow rule that spec content must originate from the task (or from explicit clarification, which this was not — it was authored during spec writing, not asked about in the Q&A phase).
- Everything else in the spec traces either to the raw task text/cited line numbers, or to the clarifying-question answers recorded in this conversation (tab position, default tab, sidebar filtering approach, per-tab collapse scoping). These are legitimate since the workflow's clarification step explicitly permits resolving ambiguity via user Q&A before writing the spec.

### Assumptions Detected

All four assumptions in the spec's own "Assumptions" section were explicitly confirmed via the clarification Q&A, so they are correctly captured:

- "CV Analysis" is always the default tab — explicitly confirmed by user ("Always default to CV Analysis tab").
- Tab bar is a new component distinct from `app-mobile-tabs` — reasonable inference from the user's answer that a "separate tab bar above content" should exist; not contradicted by any answer.
- "Additional Materials" defaults to Cover Letter expanded — not explicitly asked/confirmed by the user; this is the spec author's extrapolation from the existing "first item in group expands by default" pattern. It's a sound analogy but was not itself put to the user and should ideally have been confirmed rather than assumed.
- `hasPartialStoredResults` and Job Posting stay un-scoped by tab — not explicitly asked/confirmed; inferred from the user's literal layout answer ("below the tabs put the job posting section"), which addresses placement but not filtering/scoping of the partial-results warning specifically.

Additional assumption **not** listed in the spec's own Assumptions section but present in the body:

- The claim in Behavior §5 that default-disclosure "is computed per tab/group, independently for each group" — this is the spec author's design resolution to the "Collapse scope" clarifying question (user picked "Per-tab (Recommended)"), which covered collapse/expand-all scope but did not explicitly re-confirm that the *initial default expand-first-section* logic (a separate mechanism in the current code, `initializedDefaults` signal) should also become per-group. This is a reasonable and likely-intended extension of the same answer, but it is a step beyond the literal question asked and isn't called out as an assumption in the spec's Assumptions list.

## Recommendation

- **Revise specification**: move the inline-edit-cancellation edge case to an explicit assumption (or remove it pending a decision), add the two additional undisclosed assumptions (Cover Letter as default-expanded item; per-group `initializedDefaults` extension) to the Assumptions section, clarify the initial-disclosure trigger timing in Behavior §5, and clarify/resolve where the Job Posting section sits relative to ARIA `tabpanel` boundaries before implementation begins.
