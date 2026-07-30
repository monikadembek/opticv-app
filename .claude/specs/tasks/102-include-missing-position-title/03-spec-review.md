# Specification Review: 102-include-missing-position-title

### Summary

- Overall assessment: **PASS**
- Justification: The specification covers both explicit requirements from the raw task (adding a `position` property to the extraction prompt, and displaying it below the candidate's name in the optimized CV) and grounds every additional decision in an explicit, user-confirmed clarifying question. Scope, edge cases, and acceptance criteria are concrete and traceable to either the task or a stated assumption. No invented requirements were found.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

- **Behavior §4 (styling)** — "visually secondary to the name (e.g. smaller size, lighter weight/color)" is a specific visual instruction not present in the raw task, which said nothing about styling beyond "displayed below the candidate's name." It's a reasonable default for implementability, but it is prescriptive beyond what the task specifies and was not one of the three clarifying questions asked. Recommend either flagging it explicitly as an assumption in the Assumptions section (it currently is not listed there) or softening it to "styled consistently with the template's existing secondary-text conventions" without prescribing the mechanism.
- **Edge Cases (multiple job titles)** — the fallback heuristic ("prefer headline near name, else most recent/current experience title") is a reasonable interpretation but is a judgment call the task did not specify. It is appropriately caveated inline ("cannot be deterministically guaranteed") and cross-referenced to Assumptions, but the underlying assumption text in the Assumptions section describes it as being about non-determinism rather than about the fallback-order decision itself being an unconfirmed interpretation. Minor — consider tightening the Assumptions entry to also flag the fallback ordering as an interpretation, not just the non-determinism of LLM extraction.
- **Scope / Out of scope (editing UI)** — this bullet speculates about an editing UI that may or may not exist ("if an existing contact-editing UI exists... extend it consistently"). This is a conditional/hedged requirement rather than a firm scope boundary. It doesn't contradict the task, but it introduces ambiguity about what "done" means if such a UI is discovered during implementation. Recommend resolving this explicitly during implementation planning (confirm whether a contact-editing UI exists) rather than leaving it conditional in the spec.

#### Unclear or Ambiguous Sections

- **Out of scope, bullet 4 (editing UI)** — see above; the conditional phrasing ("if... exists... extend it") means the spec cannot be checked off unambiguously as PASS/FAIL against a fixed scope until that condition is resolved.
- **Edge Cases, bullet 2 (title selection heuristic)** — acceptable as a best-effort prompt instruction, but "no clear current title/headline" leaves the exact extraction priority order somewhat open to LLM interpretation. This is inherent to LLM-based extraction and is appropriately caveated, not a spec defect.

#### Invented or Unsupported Requirements

None. All requirements trace back to either:
1. The raw task text (prompt property for position; display below name in optimized CV; BE+FE scope), or
2. One of the three clarifying questions explicitly answered by the user (field location inside `contact`; full coverage across all 6 templates + PDF/DOCX; pass-through-unchanged during optimization).

### Assumptions Detected

All of the following are explicitly listed in the spec's Assumptions section, and are consistent with the user's answers to the clarifying questions asked during spec generation:

- `position` belongs inside `contact`, placed directly after `name` — explicitly confirmed with user.
- All 6 preview templates and both PDF/DOCX export formats must show the position title — explicitly confirmed with user.
- Optimization passes `position` through unchanged, no AI rewriting — explicitly confirmed with user.
- No manual CV/contact editing UI is being extended beyond parity with existing fields — **not** one of the three original clarifying questions; this is a spec-author judgment call, correctly flagged as an assumption but not user-confirmed.
- LLM extraction heuristic for title selection when multiple candidates exist cannot be made fully deterministic — reasonable technical assumption, correctly flagged.

One additional implicit assumption was found that is **not** listed in the Assumptions section:

- **Styling of the position line as "visually secondary"** (Behavior §4) is an implicit design assumption not explicitly enumerated in the Assumptions list, though it is a low-risk, conventional default.

### Recommendation

- **Proceed as-is.** The two minor gaps (styling assumption not cross-listed; conditional editing-UI scope bullet) are non-blocking and can be resolved naturally during implementation planning without revising the specification document.
