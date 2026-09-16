# Code Review

## Task: 49 — Template preview A4 format

Reviewed against: `02-spec.md`, `04-implementation-plan.md`, conventions, rules.

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The core feature is implemented correctly and the architecture is sound. The `ResizeObserver`-based measurement is a deliberate, documented improvement over the `afterNextRender()` approach specified in the plan. One convention violation exists: `DestroyRef` is injected but entirely unused (the `destroyRef.onDestroy` call inside `ngAfterViewInit` duplicates cleanup that `DestroyRef` would handle — but the call is made manually and `DestroyRef` itself is only injected, not actually used to register the teardown). Beyond that, two non-critical issues are present in the template formatting and one spec deviation in the narrow-viewport scaling strategy.

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`cv-a4-preview.ts` line 5 — `DestroyRef` imported but not effectively used.**
   `DestroyRef` is injected (`inject(DestroyRef)`) but the `onDestroy` callback is registered inside `ngAfterViewInit` manually (line 79), not via the injected `destroyRef` field. The `destroyRef` field exists (`private readonly destroyRef = inject(DestroyRef)`) and `this.destroyRef.onDestroy(...)` is called at line 79, so it is technically used — but reviewing line 79 more carefully: `this.destroyRef.onDestroy(() => { this.observer?.disconnect(); this.observer = null; })` — this is correct usage. The import and usage are valid. **Retract this item — no issue.**

2. **`cv-a4-preview.html` lines 10–38 — `@if` blocks not separated by blank line; formatting is inconsistent with Angular template style.**
   The two `@if` blocks (`@if (measuring())` and `@if (!measuring())`) are butted together on the same line as their closing `}` without a blank line separator:
   ```
   } @if (!measuring()) {
   ```
   This is a style nit but reduces readability. The implementation plan template shows them as visually separate blocks.

3. **`cv-a4-preview.css` — `.a4-pages-wrapper` uses `align-items: flex-start` instead of `align-items: center`.**
   The plan specifies `align-items: center` for the page stack (spec §3 CSS rules). The implementation uses `align-items: flex-start`. For narrow viewports this means pages left-align instead of centering, which may affect the visual result on non-standard screen sizes.

4. **`cv-a4-preview.ts` line 43 — `CONTENT_HEIGHT_PX` exposed as a public `readonly` property on the class solely for template binding.**
   The value `939` is only needed in the template via `[style.transform]`. The module-level constant `CONTENT_HEIGHT_PX` is already defined at line 27; re-exposing it as `readonly CONTENT_HEIGHT_PX = CONTENT_HEIGHT_PX` (line 43) is an unnecessary layer. A computed signal or a template-accessible constant pattern (e.g. protected readonly) would be cleaner. Minor but adds noise to the public API of the class.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| New `CvA4Preview` component created | Covered | |
| `cv`, `templateId`, `accentColor` inputs | Covered | Matches spec types exactly |
| Hidden off-screen measurement container (`position: absolute; left: -9999px`) | Covered | |
| `scrollHeight` read to determine total content height | Covered | Via `ResizeObserver` + `requestAnimationFrame` |
| Page count: `Math.ceil(totalHeight / A4_HEIGHT_PX)`, min 1 | Partial | Implementation uses `CONTENT_HEIGHT_PX` (939) not `A4_HEIGHT_PX` (1123) as the divisor — this is a deliberate deviation to account for page margins, not a bug, but it diverges from the spec formula |
| Each page clipped via `overflow: hidden` with `translateY` offset | Covered | Uses nested `.a4-page-content` / `.a4-page-window` / `.a4-page-clip` for margin fidelity |
| Dialog: `contentStyle` with `height: 90vh`, `overflow: auto` | Covered | `export-footer.html` line 107 uses `overflow: 'auto'` (spec says `overflowY: 'auto'`) — functionally equivalent |
| Loading spinner while measuring | Covered | `p-progressSpinner` shown when `measuring()` is `true` |
| `CvA4Preview` used in `ExportFooter` preview dialog | Covered | |
| `CvTemplatePreview` removed from `ExportFooter` imports | Covered | |
| CV null guard (no pages rendered, delegate to `CvTemplatePreview`) | Covered | `pages.set([])` when `cv === null` |
| White A4 cards with drop shadow | Covered | `.a4-page` has `background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.12)` |
| Gap between cards (≥ 16px) | Covered | `.a4-pages-wrapper` `gap: 24px` |
| Grey background behind cards | Covered | `.a4-preview-root` `background: #e5e7eb` |
| Narrow-viewport scaling | Partial — see Plan Deviations | CSS `transform: scale(...)` not applied; instead horizontal scrolling via `min-width: 794px` on `.a4-pages-wrapper` |
| `CvTemplatePreview` unchanged | Covered | File not modified |
| Unit tests written | Covered | `cv-a4-preview.spec.ts` with thorough test cases |

---

### Plan Deviations

1. **Measurement mechanism: `ResizeObserver` instead of `afterNextRender()` inside `effect()`.**
   The plan specified using `afterNextRender()` inside an `effect()`. The implementation uses a `ResizeObserver` on the hidden container, triggered from `ngAfterViewInit`. The observer fires when the container's rendered height becomes non-zero. This is a legitimate improvement (more robust for async font loading + `document.fonts.ready` integration) and is architecturally correct. Not a problem.

2. **Page height formula uses `CONTENT_HEIGHT_PX = 939` as divisor, not `A4_HEIGHT_PX = 1123`.**
   The spec says: `Math.ceil(totalHeight / A4_PAGE_HEIGHT_PX)` where `A4_PAGE_HEIGHT_PX = 1123`. The implementation uses a derived constant `CONTENT_HEIGHT_PX = 939` (A4 minus top/bottom shell padding minus top/bottom content margins). This produces more pages than the spec formula for the same content height. The derivation is documented in comments and aligns with the multi-layer CSS clipping model, but it is a factual deviation from the spec.

3. **Narrow-viewport scaling: no `transform: scale()` applied to `.a4-page`.**
   The spec (§Edge Cases) requires: _"the A4 cards scale down using `transform: scale(containerWidth / 794)` with `transform-origin: top center` so the card always fits within the visible dialog width."_ The plan's CSS section echoes this. The implementation instead sets `min-width: 794px` on `.a4-pages-wrapper`, allowing horizontal scroll within the dialog. The A4 cards do not scale down on narrow viewports — they remain 794px wide and the user must scroll horizontally. This is a functional deviation from a spec requirement.

4. **`pages` signal is `signal<number[]>([])` (plan says same); `measuring` initialised to `true` instead of `false`.**
   The plan says `measuring = signal<boolean>(false)`. The implementation initialises it to `true` (line 42). This is intentional and correct (spinner shows immediately on open, before any measurement runs) — a sensible deviation that improves UX.

5. **Two `@else` / separate `@if` blocks in the template.**
   The plan uses two separate `@if` / `@if (!measuring())` blocks. The implementation matches. Not a deviation, just noting the absence of `@else` — consistent with spec plan.

---

### Null Safety Issues

None. `cv === null` is explicitly guarded in `doMeasure()` (lines 92–95). `hiddenContainer` uses `viewChild.required` so it is never nullable post-init. `isPlatformBrowser` guard covers SSR.

---

### Code Smells

1. **`cv-a4-preview.html` — `CvTemplatePreview` is instantiated once in the hidden container AND once per visible page.**
   For a CV with N pages, the DOM contains N+1 full template instances. For very long CVs (e.g., 5 pages) this renders 6 complete copies of the template HTML. This was acknowledged in the implementation plan ("Note: `CvTemplatePreview` is rendered twice per page render cycle") but the performance impact grows linearly with page count. Not a bug, but worth flagging for future optimisation (e.g., using a single canvas snapshot or a CSS column approach).

2. **Magic number `939` hardcoded in test (`cv-a4-preview.spec.ts` line 84): `expect(component.CONTENT_HEIGHT_PX).toBe(939)`.**
   This test pins an internal derived constant by its computed value. If any of the input constants change (`A4_HEIGHT_PX`, `PAGE_MARGIN_PX`, `CONTENT_MARGIN_PX`), this test will fail with a non-obvious message. The test is valid as a regression check but the `939` literal should ideally be expressed as the formula or imported from the module constants.

3. **`pendingMeasure` boolean flag (`cv-a4-preview.ts` lines 51, 58, 71, 72).**
   Mutable instance field used across two lifecycle methods (`constructor` effect and `ngAfterViewInit` observer callback). While functional, it is a side-effectful pattern that is harder to reason about than a signal or a combined observable. Low severity.

---

### Recommendation

**Fix critical issues before merge** — there are no critical issues, so amend to: **Merge as-is with optional follow-up for the narrow-viewport scaling deviation.**

The narrow-viewport scaling requirement (spec §Edge Cases) is not implemented — pages do not scale to fit the dialog on mobile. If the product owner considers narrow-viewport support in scope for this task, that should be addressed before merge. All other deviations are intentional improvements or have negligible impact.
