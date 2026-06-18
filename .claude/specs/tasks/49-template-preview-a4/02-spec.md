# Task Specification

## Source

Azure DevOps Task: 49 — Template preview A4 format

## Goal

Change the CV preview dialog (opened from `ExportFooter`) so the optimized CV is displayed on one or more A4-sized "paper" cards rather than a fluid, dialog-width layout. Content that overflows a single A4 page must automatically flow onto additional A4 pages, all stacked and scrollable within a fixed-height dialog.

## Context

- The preview is triggered by the "Preview" button in `ExportFooter` (`export-footer.html`), which opens a `p-dialog` containing `<app-cv-template-preview>`.
- `CvTemplatePreview` renders the full CV as a single continuous HTML block using inline styles. The container uses `max-width: 794px` (A4 width at 96 dpi) but does not enforce A4 page height or pagination.
- The dialog is currently `900px` wide with no explicit height or scroll constraints on the content area.
- No multi-page logic exists anywhere in the preview pipeline.

## Scope

### In scope

- Add a new `CvA4Preview` component responsible for:
  - Rendering the full CV content off-screen into a hidden measurement container
  - Slicing that content into A4-page-height segments
  - Displaying each segment as a separate A4 "sheet" card, stacked vertically
- Update `ExportFooter`'s preview dialog to use `CvA4Preview` instead of `CvTemplatePreview` directly
- Dialog: fixed height (`90vh`) with `overflow-y: auto` on the content area so the user scrolls through pages inside the dialog
- Visual styling: each A4 sheet has a white background, drop shadow, and a small gap between sheets (grey background behind them)

### Out of scope

- The `cv-template-selector` preview dialog (thumbnail use case — not required to change)
- PDF export page breaking (separate concern handled by puppeteer/server-side)
- DOCX export
- Any changes to the CV template HTML/styles inside `cv-template-preview.html`

## Behavior

### Step-by-step

1. User clicks "Preview" in `ExportFooter` → `previewVisible` signal set to `true` → dialog opens.
2. Dialog renders `<app-cv-a4-preview>` with `[cv]`, `[templateId]`, `[accentColor]` inputs (same as current `CvTemplatePreview` inputs).
3. On `AfterViewInit` (and again whenever `cv`, `templateId`, or `accentColor` inputs change), `CvA4Preview`:
   a. Renders `<app-cv-template-preview>` into a **hidden off-screen container** (`position: absolute; left: -9999px; visibility: hidden`) with a fixed width of `794px` and unlimited height.
   b. Reads `scrollHeight` of that container to get the total content height.
   c. Calculates the number of pages: `Math.ceil(totalHeight / A4_PAGE_HEIGHT_PX)` where `A4_PAGE_HEIGHT_PX = 1123` (794 × 1.414, A4 at 96 dpi).
   d. For each page index `i`, creates a clipping wrapper that:
      - Has `width: 794px; height: 1123px; overflow: hidden`
      - Contains the full rendered template shifted up by `i * 1123px` using `transform: translateY(-${i * 1123}px)`
   e. Displays the page clips as a vertical stack of white A4 cards inside the component's visible area.
4. The dialog content area scrolls vertically (`overflow-y: auto`) with a fixed `height: 90vh`, so the user scrolls through all pages within the dialog without the dialog itself growing.
5. Between each pair of A4 cards a visible gap (≥ 16px) renders with the grey page-area background, giving a "multiple sheets of paper" visual effect.

### A4 constants

| Constant             | Value  | Source                         |
|----------------------|--------|-------------------------------|
| `A4_WIDTH_PX`        | 794    | 210 mm × 96 dpi / 25.4        |
| `A4_HEIGHT_PX`       | 1123   | 297 mm × 96 dpi / 25.4        |

### Change detection

- Use an `effect()` or `afterNextRender()` to trigger re-measurement when `cv()`, `templateId()`, or `accentColor()` change, since the hidden container must be re-rendered before measuring.
- Signal `pages = signal<number>(0)` drives the `@for` loop that renders page clips.

## Edge Cases

- **CV data is null**: Delegate to `CvTemplatePreview`'s existing null guard (`<p>No CV data available.</p>`); no pagination needed.
- **Content fits on one page** (`totalHeight ≤ 1123px`): Render a single A4 card; no gap or second card shown.
- **Very long CVs**: No maximum page count; all pages are rendered and scrollable.
- **Dialog opens before measurement completes**: Show a loading spinner centered in the dialog content area until `pages()` is set; replace it with the page stack once ready.
- **Viewport too narrow** (mobile, `< 900px`): Dialog already applies `maxWidth: 95vw`; the A4 cards scale down using `transform: scale(containerWidth / 794)` with `transform-origin: top center` so the card always fits within the visible dialog width.

## Data / API

No new API calls or data model changes. The component receives the same inputs already wired in `ExportFooter`:

| Input          | Type                      | Source                     |
|----------------|---------------------------|----------------------------|
| `cv`           | `CvStructuredData \| null` | `ExportFooter.mergedCv()`  |
| `templateId`   | `CvTemplateId \| null`    | `ExportFooter.selectedTemplate()` |
| `accentColor`  | `string`                  | `ExportFooter.accentColor()` |

## Files to create / modify

| File | Action |
|------|--------|
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.ts` | **Create** — new component |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.html` | **Create** — template |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.css` | **Create** — styles |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html` | **Modify** — replace `<app-cv-template-preview>` with `<app-cv-a4-preview>` inside preview dialog; add `contentStyle` and `[style]` for fixed height + scroll |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts` | **Modify** — import and declare `CvA4Preview` |

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- Type check passes (`npm exec nx typecheck opticv-web`)
- Lint passes (`npm exec nx lint opticv-web`)
- Opening the preview dialog shows one or more A4-sized white cards
- A CV whose content exceeds 1123px renders on multiple separate cards with a visible gap between them
- A short CV renders as a single A4 card
- The dialog has a fixed height; the user scrolls inside it to view additional pages
- On narrow viewports the A4 cards scale down and do not overflow the dialog horizontally
- `CvTemplatePreview` is unchanged (no regressions in the template selector dialog)
- No `any` types introduced; strict TypeScript throughout
