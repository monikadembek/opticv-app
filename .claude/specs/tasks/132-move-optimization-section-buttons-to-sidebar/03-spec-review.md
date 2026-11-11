# Specification Review — Task 132

### Summary

- Overall assessment: PASS WITH ISSUES
- The specification covers the explicit task requirements: switchers moved to the sidebar, and only the selected group's sections shown on the right. Its extra design decisions come from the clarification answers and are mostly listed as assumptions. A few behaviors are under-specified or unsupported by the task and should be tightened before implementation, but none block starting work.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Active-section behavior on tab switch is a gap with a conflicting mechanism.** The spec assumes the active section becomes the first item of the new group. The existing scrollspy (`setupScrollspy`) also sets `activeSection` on scroll, and the first intersection batch is skipped. The spec does not say whether a tab switch should also scroll to the top or to that first section, or whether the page scroll position is kept. This affects the sidebar highlight and what the user sees.
2. **"Switch-only" header click vs. accordion wording.** Behavior step 2 says clicking the active header does not collapse it, but the scope calls the layout an "accordion". Say explicitly that this is a single-select group switcher, not a true collapsible accordion.
3. **Mobile switcher design is thin.** The current mobile strip shows `label.split(' ')[0]` per item (the first word). "Resume" and "Additional" would be the first words of the new switchers. The spec does not state labels, icons, or placement (before the section items, as a separate row, or inline), and does not say whether they are hidden in the `initial` state (the strip is currently hidden then).
4. **Test scope is generic.** "Update tests in cv-optimization.spec.ts where it relies on the tab bar" does not name the existing tests that exercise `p-tab`/`onResultsTabChanged`. This is acceptable but loose.
5. **Template language.** `template.md` headings are in Polish prompts. The spec uses English headings, which is consistent with the rules. The "Assumptions" section is added beyond the template, which is reasonable but is a deviation.
6. **Panel rendering strategy is left open.** The spec says `p-tabpanel`/`@if` "whichever is simpler". Whether inactive panels stay mounted (state retention for editors such as the cover letter) is not specified. This matters for preserving edited content and current behavior.

#### Unclear or Ambiguous Sections

- **Scope → Sidebar:** "the other is collapsed to its header only". Unclear whether the inactive group's status icons or progress indicators (spinner/failed) remain visible on the header. Users currently see processing and failure status per item, which would then be hidden.
- **Scope → Collapsed mode:** "final icons chosen to be distinct from item icons". The icons cannot be fully verified because the example icons (`pi-chart-bar`, `pi-file-edit`) already belong to the ATS Analysis and Cover Letter items.
- **Behavior step 4:** disabling headers in the initial state is stated as if it were established, but the task does not mention it.
- **Edge Cases → "New Optimization":** says the sidebar "must follow". The mechanism is not described (it follows from the `activeTab` input, so this is likely fine).

#### Invented or Unsupported Requirements

Not in the original task text. Items 1 and 2 follow from user clarification answers (accordion layout, removed tab bar, mobile buttons, collapsed icons), so they are supported by the clarification but not by the task itself:

1. Removal of the `p-tabs` tab bar. It is a consequence of "move", but the task does not say to remove it.
2. Mobile strip changes. The task mentions only "the sidebar".
3. `aria-expanded`/`aria-controls` details. These are derived from the repository rule on accessibility rather than from the task.
4. Disabled state for headers in the initial page state (see Behavior step 4).
5. Setting the active section to the first item of the new group (listed as an assumption).

### Assumptions Detected

| Assumption | Explicitly stated in spec? |
| --- | --- |
| Exactly one group expanded, tied to the active tab | Yes |
| Implementer picks group header icons | Yes |
| `p-tabpanel` may be replaced by `@if` blocks | Yes |
| Active section = first item of new group on switch | Yes (Edge Cases, not under Assumptions) |
| Headers disabled in the `initial` state | No (stated as behavior) |
| Mobile switchers hidden in the `initial` state, like the current strip | No (implicit) |
| Status indicators for the inactive group are not shown on its header | No (implicit) |
| Panel content for the inactive tab need not stay mounted | No (implicit) |
| Scroll position on tab switch is unchanged / not reset | No (implicit) |

### Recommendation

- Proceed as-is **with minor clarifications**: revise the specification to resolve items 1, 3 and 6 of Non-Critical Issues and the status-indicator ambiguity, then proceed.

Overall: **Revise specification** (minor).
