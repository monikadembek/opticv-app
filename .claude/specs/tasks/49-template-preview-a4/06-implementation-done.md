# Implementation Done

## Task: 49 — Template preview A4 format

---

## Summary

A new `CvA4Preview` component was created that renders the CV as one or more A4-sized "paper" cards inside a fixed-height, scrollable dialog. The hidden off-screen measurement approach is used: a `ResizeObserver` watches a hidden container, reads `scrollHeight` after fonts are ready, and derives a page array that drives an `@for` loop of clipped A4 cards. The `ExportFooter` preview dialog was updated to use `CvA4Preview` instead of `CvTemplatePreview`. Unit tests were added for the new component.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| New `CvA4Preview` component created | Implemented | `cv-a4-preview/cv-a4-preview.ts` |
| `cv`, `templateId`, `accentColor` inputs | Implemented | `input.required` / `input` with `DEFAULT_ACCENT_COLOR` |
| Render full CV into hidden off-screen container (position: absolute; left: -9999px; visibility: hidden) | Implemented | `.a4-hidden-container` CSS class |
| Hidden container fixed width 794px | Implemented | `.a4-hidden-container { width: 794px }` |
| Read `scrollHeight` to calculate page count | Implemented | `doMeasure()` reads `el.scrollHeight` |
| Page count formula: `Math.ceil(totalHeight / A4_HEIGHT_PX)`, minimum 1 | Implemented (with deviation) | Divisor is `CONTENT_HEIGHT_PX = 939`, not `A4_HEIGHT_PX = 1123` — see Deviations |
| Each page displayed as clipping wrapper: `width: 794px; height: 1123px; overflow: hidden` | Implemented | `.a4-page` (794×1123px with padding), `.a4-page-window` (939px, overflow hidden), `.a4-page-clip` (translateY offset) |
| `transform: translateY(-${i * A4_HEIGHT_PX}px)` per page clip | Implemented (with deviation) | Offset uses `CONTENT_HEIGHT_PX = 939` per page, not `1123` — see Deviations |
| A4 cards displayed as vertical stack | Implemented | `.a4-pages-wrapper { display: flex; flex-direction: column }` |
| White background on each A4 card | Implemented | `.a4-page { background: #ffffff }` |
| Drop shadow on each A4 card | Implemented | `.a4-page { box-shadow: 0 4px 16px rgba(0,0,0,0.12) }` |
| Gap ≥ 16px between cards | Implemented | `.a4-pages-wrapper { gap: 24px }` |
| Grey background behind cards | Implemented | `.a4-preview-root { background: #e5e7eb }` |
| Loading spinner while measurement pending | Implemented | `p-progressSpinner` shown when `measuring()` is `true` |
| CV null → no pages rendered | Implemented | `doMeasure()` calls `pages.set([])` when `cv === null` |
| Re-measurement on `cv`, `templateId`, `accentColor` input change | Implemented | `effect()` in constructor sets `measuring.set(true)` and `pendingMeasure = true` on any input change |
| Update `ExportFooter` dialog to use `CvA4Preview` | Implemented | `export-footer.html` and `export-footer.ts` updated |
| Dialog `contentStyle`: `height: 90vh`, `overflow-y: auto` | Implemented | `[contentStyle]="{ padding: '0', overflow: 'auto', height: '90vh' }"` (uses `overflow` not `overflowY`) |
| Dialog width `900px`, `maxWidth: 95vw` | Implemented | Unchanged from prior implementation |
| `CvTemplatePreview` removed from `ExportFooter` imports | Implemented | `CvTemplatePreview` no longer in `ExportFooter.imports` array |
| `CvTemplatePreview` unchanged | Implemented | File not modified |
| Narrow-viewport A4 card scaling (`transform: scale(containerWidth / 794)`) | Not implemented | Pages remain 794px wide; `.a4-pages-wrapper` has `min-width: 794px` allowing horizontal scroll |
| `isPlatformBrowser` guard on all DOM work | Implemented | `ngAfterViewInit` returns early with `measuring.set(false)` if not in browser |
| Unit tests added | Implemented | `cv-a4-preview.spec.ts` |

---

## Files

### Created

| File | Description |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.ts` | New `CvA4Preview` component class |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.html` | New component template |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.css` | New component styles |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.spec.ts` | Unit tests |

### Modified

| File | Change |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html` | Replaced `<app-cv-template-preview>` with `<app-cv-a4-preview>` in preview dialog; added `[contentStyle]` |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts` | Replaced `CvTemplatePreview` import with `CvA4Preview` in `imports` array |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html` | No source change — appears in git diff due to branch context; content unchanged |

---

## Components

| Component | Status |
|---|---|
| `CvA4Preview` (`app-cv-a4-preview`) | Exist |

---

## Stores

No stores were planned or added for this task.

| Store | Status |
|---|---|
| _(none planned)_ | N/A |

---

## Deviations

1. **Page count divisor changed from `A4_HEIGHT_PX = 1123` to `CONTENT_HEIGHT_PX = 939`.**
   Plan specifies `Math.ceil(scrollHeight / A4_HEIGHT_PX)`. Implementation introduces derived constants `PAGE_MARGIN_PX = 32` and `CONTENT_MARGIN_PX = 60`, computing `CONTENT_HEIGHT_PX = 1123 - 32*2 - 60*2 = 939`. The page count formula and `translateY` offset both use `939` as the stride.

2. **Measurement mechanism changed from `afterNextRender()` inside `effect()` to `ResizeObserver` inside `ngAfterViewInit()`.**
   Plan specified calling `afterNextRender()` inside an `effect()`. Implementation uses a `ResizeObserver` on the hidden container, firing when `contentRect.height > 0`, combined with `document.fonts.ready` and `requestAnimationFrame` before reading `scrollHeight`.

3. **`measuring` signal initialised to `true` instead of `false`.**
   Plan specifies `measuring = signal<boolean>(false)`. Implementation initialises to `true` so the spinner displays immediately when the component mounts.

4. **Narrow-viewport scaling not implemented.**
   Spec and plan both require `transform: scale(containerWidth / 794)` on A4 cards for viewports narrower than 900px. Implementation sets `min-width: 794px` on the page wrapper instead, resulting in horizontal scroll on narrow viewports.

5. **`.a4-pages-wrapper` uses `align-items: flex-start` instead of `align-items: center`.**
   Plan specifies `align-items: center`. Implementation uses `align-items: flex-start`.

6. **Multi-layer clip structure added (not in plan).**
   Plan specified a single `.a4-page` div with `overflow: hidden` and a single `.a4-page-clip` child. Implementation uses three nested divs: `.a4-page` (outer shell with padding), `.a4-page-content` (inner area with content margins), `.a4-page-window` (the actual clip boundary with `overflow: hidden`), and `.a4-page-clip` (the translateY element).

---

## Additional Implementation

- **`document.fonts.ready` wait before `scrollHeight` read.** The `doMeasure()` method waits for `document.fonts.ready` before executing `requestAnimationFrame`, ensuring fonts are loaded before measurement. Not in plan or spec.
- **`pendingMeasure` boolean flag.** An instance field `pendingMeasure` gates the `ResizeObserver` callback so re-measurement only fires when an input change has been signalled via the `effect()`. Not in plan or spec.
- **`CONTENT_HEIGHT_PX` exposed as public class property.** The derived constant is re-exposed as `readonly CONTENT_HEIGHT_PX = CONTENT_HEIGHT_PX` on the class to allow template binding in `[style.transform]`. Not in plan or spec.
- **`docs/a4-cv-template-preview.md` created.** A documentation file describing the feature was added under `docs/`. Not in plan or spec.
