# Specification Review: Task 69 — Collapse/Expand Section Cards

## Summary

- Overall assessment: **PASS WITH ISSUES**
- Short justification: The specification correctly captures the core task requirement (collapse/expand for section cards) and is well-grounded in the existing `SectionCard`/`cv-optimization.ts` code. Most elaborations beyond the one-line raw task (auto-expand-on-navigation, no-persistence, no-auto-collapse, custom-toggle-not-p-panel) are traceable to clarifying questions that were asked and answered before the spec was written, which is legitimate per the spec workflow. One section contains a genuine internal ambiguity (whole-header click as toggle trigger) that should be resolved before implementation.

## Findings

### Critical Issues

None.

### Non-Critical Issues

1. **Behavior §2 — ambiguous secondary trigger.** "Clicking it (or, per existing convention, the header itself)" implies there is an established codebase convention of the whole header being clickable to toggle. No such convention was found elsewhere in the reviewed codebase (`interview-prep.html` / `linkedin-updates.html` use `p-panel`'s own toggle affordance, not a bespoke "click anywhere on header" pattern). This should be stated as a proposal, not "existing convention," or removed and left as chevron-only until confirmed.
2. **Acceptance criteria mix functional and non-functional concerns without prioritization** — e.g., AXE/WCAG AA passing is listed alongside build/lint/test passing as flat bullet items. Not incorrect, but a reviewer implementing against this list could deprioritize the accessibility bullet since it reads as one item among six rather than a hard gate. Consider marking accessibility as a blocking criterion explicitly (it already is one per `.claude/context/conventions.md` §1, so the spec is consistent with repo rules — just worth emphasizing).
3. **Data/API §60 — implementation detail is prescriptive.** The spec recommends a specific mechanism (`input<boolean>(false)` + `output<boolean>()`, `[(collapsed)]` banana-in-a-box, plus a `Map<string, boolean>` in the parent). This is more solution detail than a spec typically fixes ("what," not "how"). Not wrong, but flag it as a suggested approach rather than a mandated one, so the implementation phase retains flexibility if a signal-based `model()` input turns out cleaner.

### Unclear or Ambiguous Sections

- **Behavior, item 2** (see Non-Critical Issue 1 above) — whether the entire header is clickable or only the chevron button is the toggle target is not fully settled; the parenthetical hedge ("or, per existing convention") reads as fact but isn't verified.
- **Edge Cases — "Retry action"** states the retry button is hidden when collapsed "consistent with treating the whole body as one collapsible region." This is a reasonable inference but was not explicitly asked about in clarifying questions — worth confirming, since hiding an actionable retry CTA behind a collapse could be seen as a usability regression (a user might collapse a card specifically to declutter, not realizing it hides a pending retry action). Low risk, but flag for implementer awareness.

### Invented or Unsupported Requirements

None outright invented. The following spec content extends beyond the literal one-line raw task but is traceable to answered clarifying questions from the spec-authoring conversation (scope = all 8 cards, default = expanded, no persistence, custom-toggle approach, auto-expand-on-nav):

- Scope covering all 8 section cards including Job Posting.
- Default-expanded state with no auto-collapse based on status.
- No persistence across reloads.
- Custom in-component toggle rather than a `p-panel` refactor.
- Auto-expand behavior when navigating via sidebar/mobile tabs.

These are legitimate since they came from the developer/PO clarification step, not fabricated by the spec author — but they are not derivable from the raw task text alone, so they're listed here for traceability per the review criteria.

## Assumptions Detected

- **Explicitly stated in spec:** All "Out of scope" bullets function as explicit assumption statements (no persistence, no auto-collapse, no p-panel refactor, no collapse-all control). Good practice.
- **Explicitly stated in spec:** Scrollspy continues to function against the card/header element when body is hidden (Behavior §5) — a reasonable technical assumption, stated directly.
- **Not explicitly flagged as an assumption (implicit):** That "existing convention" of header-click-to-toggle exists (Behavior §2) — this reads as a factual claim rather than a flagged assumption; per review criteria it should have been enumerated as an assumption or removed.
- **Not explicitly flagged as an assumption (implicit):** That hiding the retry button while collapsed is acceptable UX (Edge Cases, "Retry action") — reasonable but not confirmed with the user; should be called out as an assumption.
- **Not explicitly flagged as an assumption (implicit):** That a full page reload is the only reset trigger, and that starting a "new optimization run" (per Behavior §1's parenthetical) also resets state to expanded — this conflates two distinct triggers (hard reload vs. in-app "New Optimization" navigation) without confirming both actually re-mount `SectionCard` instances such that the local signal resets. Worth a quick technical verification during implementation.

## Recommendation

- **Proceed as-is**, with the implementer resolving the two flagged ambiguities (header-click-as-toggle-trigger, and the retry-button-hidden-when-collapsed assumption) at implementation time or via a quick follow-up confirmation — neither blocks starting work, and both are low-risk, easily-reversible UI decisions.
