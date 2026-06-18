# Specification Review

## Task: 49 — Template preview A4 format

Reviewed file: `.claude/specs/tasks/49-template-preview-a4/02-spec.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec correctly captures the task's core intent (A4 paper cards, multi-page, auto page breaks, fixed-height scrollable dialog) and the answers to all four clarifying questions are accurately reflected. The technical approach is sound and the scope boundaries are well drawn. However, two implementation details are underspecified or potentially ambiguous enough to cause divergent implementations: the exact re-measurement timing mechanism (the `effect()` vs `afterNextRender()` choice has real timing implications) and the narrow-viewport scaling strategy (which requires container-width knowledge that is not straightforward in Angular SSR). Neither is a blocker, but both should be tightened before implementation begins.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Re-measurement trigger is underspecified (Behavior → Change detection)**
   The spec says "Use an `effect()` or `afterNextRender()`" but these have different semantics. `effect()` fires synchronously after signal change but before the DOM is updated; `afterNextRender()` fires after the next render cycle. Because the hidden container must finish rendering before `scrollHeight` can be read, only `afterNextRender()` (or an equivalent post-render hook) is correct. The spec should specify one approach, not offer both as alternatives.

2. **Narrow-viewport scaling implementation detail is vague (Edge Cases)**
   The spec states the A4 cards should `transform: scale(containerWidth / 794)` but does not specify how `containerWidth` is obtained. In an Angular SSR context, `window` is unavailable during server render, and `ResizeObserver` / `ElementRef` access requires care with `isPlatformBrowser`. The spec should at minimum note that this scaling is client-side only and reference the mechanism (e.g. `ResizeObserver` on the dialog content wrapper).

3. **Loading state trigger is not fully defined (Edge Cases → "Dialog opens before measurement completes")**
   The spec says show a spinner "until `pages()` is set" but `pages = signal<number>(0)` means `pages()` is always set (to `0` initially). A separate `measuring = signal<boolean>(true)` flag (or `pages() === 0 && cv() !== null`) would be needed to distinguish "measuring" from "no pages". The spec should clarify the condition that controls the spinner.

4. **Gap colour value is not specified (Scope → Visual styling)**
   The spec mentions "grey background behind them" but does not specify the exact grey value or Tailwind token. This is cosmetic but leaves visual output open to interpretation during implementation.

5. **`pages` signal type is `number` but drives a `@for` loop (Behavior → Change detection)**
   A `signal<number>` representing a page count cannot directly drive `@for (page of pages())`. The spec should clarify whether `pages` stores a count (then an `Array.from({length: pages()})` helper is needed in the template) or an array (e.g. `signal<number[]>([])`). This is a minor but implementation-relevant inconsistency.

#### Unclear or Ambiguous Sections

- **Behavior → Step 3c**: "794 × 1.414" is an approximation; the stated value of 1123 is actually `Math.round(297 * 96 / 25.4) = 1123`. The formula in parentheses is slightly misleading but the constant value is correct.
- **Behavior → Step 3d**: The clipping approach (duplicating the full template DOM once per page) is described but the performance implication for long CVs (e.g. 5+ pages = 5 full DOM copies) is not acknowledged. This is not a blocker but the implementer should be aware.
- **Edge Cases → "Dialog opens before measurement completes"**: It is unclear whether the `<app-cv-template-preview>` in the hidden container is always present in the DOM or conditionally rendered. If it is conditionally rendered (e.g. `@if (previewVisible())`), there is a first-render timing issue when the dialog opens. The spec does not address this.

#### Invented or Unsupported Requirements

None. All requirements are either directly stated in the task, derived from the clarifying-question answers, or are standard conventions of the existing codebase.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|------------|---------------------------|
| 1 | A4 dimensions at 96 dpi: 794 × 1123 px | Yes — constants table |
| 2 | Only the export-footer preview dialog is in scope; template-selector dialog is excluded | Yes — Out of scope |
| 3 | Page break positions are calculated purely from rendered pixel height, not from semantic section boundaries | Yes — Behavior step 3c |
| 4 | The hidden measurement container renders `CvTemplatePreview` at exactly 794px wide with no padding/margin offset | Implicit — not explicitly stated; if the container has any padding the measured height will be wrong |
| 5 | `CvTemplatePreview` renders synchronously (no async content, no images that might load after render) | Implicit — not stated; if fonts or images load late, `scrollHeight` may be measured too early |
| 6 | The dialog `contentStyle` can be set to enforce `overflow-y: auto` and `height: 90vh` via the existing PrimeNG `p-dialog` API | Implicit — not verified in spec; PrimeNG dialog content area may need a specific `contentStyle` key |
| 7 | Narrow-viewport scaling is client-side only | Implicit — not stated; SSR implications not addressed |
| 8 | No new unit tests are required (Acceptance does not mention tests) | Implicit — the raw task does not mention tests, but acceptance criteria from rules.md say "tests added" |

**Notable unverified assumption:** Assumption 8 — the project rules (`rules.md`) require tests to be added for every task, but the Acceptance section of the spec omits this criterion entirely. This should be added.

---

### Recommendation

**Revise specification** — address Non-Critical Issues 1, 3, and 5 (re-measurement timing, spinner condition, and `pages` signal type) and add a "tests added" acceptance criterion before implementation begins. The remaining issues (gap colour, viewport-scaling mechanism note, SSR caveat) can be resolved during implementation if the developer is briefed on them.
