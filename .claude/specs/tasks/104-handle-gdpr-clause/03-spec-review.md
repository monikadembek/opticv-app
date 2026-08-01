# Specification Review: Task 104 — Handle GDPR Clause

## Summary

- Overall assessment: **PASS WITH ISSUES**
- Short justification: The specification covers all five numbered requirements from the raw task and grounds its technical decisions in real code (file paths, existing patterns for checkboxes, signals, and template rendering). It is implementable without major guesswork. However, it contains a few unstated/implicit assumptions carried over from clarifying-question answers that are not visibly flagged as assumptions in the spec body, and one behavioral detail (re-check restores original vs. default) that governs the entire `mergedCv` logic in Behavior §3/§8 is not derivable from the raw task text alone.

## Findings

### Critical Issues

None.

### Non-Critical Issues

- **Assumptions not consolidated in one place.** The workflow requires "All assumptions must be explicitly enumerated," but the spec has no dedicated "Assumptions" section — decisions like default-text ownership (frontend constant vs. shared package) and the restore-original-on-recheck behavior are stated as settled Behavior facts (§3, §8) rather than being called out as assumptions/decisions made during clarification. A reader of the spec alone (without the clarification transcript) cannot tell these were choices rather than facts stated in the raw task.
- **Checkbox label vs. title text not fully reconciled with raw task wording.** Raw task point 4 says: "add checkbox with label gdpr clause ... The checkbox should display in the title: '...'". The spec (Behavior §4) interprets this as a checkbox labeled "GDPR Clause" with the given sentence as a `title` attribute/tooltip. This is a reasonable reading, but the raw task's phrasing ("should display in the title") is ambiguous between "tooltip" and "visible label/subtitle text under the checkbox," and the spec does not flag this ambiguity — it silently picks one interpretation.
- **No mention of where in export-footer's layout the checkbox is placed.** Behavior §4 says "placement alongside existing footer controls, following the native checkbox convention" — this is vague enough that an implementer has visual-layout latitude the raw task doesn't constrain either, so it isn't a spec defect per se, but it's worth flagging as a soft gap since export-footer already has a dense horizontal layout (template selector, accent color, info button, preview, export buttons) and the spec doesn't say whether the checkbox goes in `template-selector` div or `export-actions` div, or a new group.
- **Acceptance criteria test list is prescriptive beyond the template's minimum.** Not an issue against the raw task, but worth noting: the `Acceptance (DEV)` section lists specific test cases in parentheses, which goes beyond the template's plain "tests added" bullet. This is helpful, not harmful, but slightly blurs the line between "spec" and "implementation plan" (the latter is a separate downstream artifact per repo workflow).

### Unclear or Ambiguous Sections

- **Behavior §4 / checkbox "title" placement** — see Non-Critical Issues above.
- **Behavior §8 "restore original extracted clause if present"** — this rule is central to how `applySelectionsToCV` must be implemented (it requires retaining the original `gdprClause` value separately from the toggle state so it can be restored after being nulled out), yet the raw task text never mentions restore-on-recheck semantics at all; it only says "If user selects this checkbox and doesn't have the clause... a default gdpr clause should be added... Unchecking the checkbox should remove the clause." The spec's extension into recheck-restores-original behavior is sound and was confirmed via clarifying question, but should be visibly marked as a clarification-derived decision, not read as if the raw task specified it.

### Invented or Unsupported Requirements

None. Every in-scope item traces to one of the raw task's five numbered points:

1. → Scope item 1 + 2, Data/API section (gdprClause field + prompt update)
2. → Behavior §3, §5–§7 (include in optimized CV, bottom of last page)
3. → Scope item "all 6 template @switch cases"
4. → Scope item (checkbox in export-footer) + Behavior §4 (title text verbatim from task)
5. → Behavior §3 (default clause when checked without original) + §8 (unchecking removes clause) + exact clause text reproduced verbatim in Behavior §3

## Assumptions Detected

The following assumptions/decisions appear in the spec but are not collected into an explicit "Assumptions" section (workflow requires this). Each is noted with whether it was stated as a decision in the spec text:

1. **Default clause text lives in a frontend constant, not `@opticv/datatypes`.** Stated as fact in Scope ("Add a default GDPR clause text constant on the frontend") — this was a clarifying-question resolution, not something the raw task specifies either way.
2. **Checkbox toggle state (`includeGdprClause`) is centralized in `cv-optimization.ts` rather than owned locally by `export-footer`.** Stated as fact throughout Behavior — also a clarifying-question resolution not addressed by the raw task.
3. **Re-checking after unchecking restores the original extracted clause text (if one existed) rather than always falling back to default text.** Stated as fact in Behavior §3 and §8 — resolved via clarifying question; raw task is silent on this scenario entirely.
4. **`gdprClause` is a new dedicated field, not reusing the existing `other: string | null` catch-all.** This matches the raw task's explicit wording ("we don't specify any property to hold gdpr clause... this needs to be added") — correctly grounded, not an invented assumption.
5. **"Bottom of last page" is achieved simply by rendering the clause as the final content block**, relying on each renderer's existing pagination/flow mechanics (jsPDF `checkPage()`, DOCX natural flow, CSS clip-and-shift pagination) rather than any explicit last-page-targeting logic. This is a reasonable technical inference documented in Context/Behavior, and is explicitly explained (not just asserted), so it is adequately flagged even though it's not literally in the raw task.
6. **No backend/database changes beyond the extraction prompt and shared type** — reasonable given documented codebase context (export is client-side only), and explicitly justified in Data/API section.

## Recommendation

- **Proceed as-is**, optionally folding the "Assumptions Detected" list above into an explicit Assumptions subsection of `02-spec.md` before implementation planning begins, so implementers don't mistake clarification-derived decisions (items 1–3 above) for raw-task requirements. None of the findings block moving to the implementation-plan stage.
