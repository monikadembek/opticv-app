# Task Specification

## Source

Azure DevOps Task: 32 — Create CV Templates

## Goal

Allow the user to choose one of three visual CV templates (ATS-Optimized, Modern, Executive) before exporting their optimized CV. Both PDF and DOCX exports must reflect the selected template's visual style. A per-template preview renders the user's own merged CV data in the chosen style inside a dialog.

## Context

This feature lives entirely in the Angular frontend (`opticv-web`). Export is client-side via `jspdf` (PDF) and `docx` (DOCX). The entry point is the **Export CV** panel at the bottom of `cv-optimization.html` (lines 338–368). The merged CV data is already available as a `mergedCv()` signal on the `CvOptimization` orchestrator.

## Scope

### In scope

- Three HTML/Angular template definitions (ATS-Optimized, Modern, Executive)
- Template selector UI: card-per-template with radio-style selection, rendered above the export buttons in the existing Export CV section
- "Preview" button on each template card: opens a PrimeNG dialog rendering the user's own `mergedCv()` data in that template's style
- PDF export respects selected template (typography, colors, layout)
- DOCX export respects selected template (fonts, heading styles, colors via the `docx` library)
- Default selection: Template 1 (ATS-Optimized)
- Session-only state (no DB persistence)

### Out of scope

- Backend changes
- Persisting template selection across sessions
- Custom/user-created templates
- Template editing

## Behavior

### 1. Template selector renders in Export CV panel

When `canExportCv()` is true, the Export CV section shows:
1. A heading "Choose Template"
2. A row of 3 template cards (horizontal flex, wraps on small screens)
3. The existing export buttons below

Each card contains:
- Template name (e.g. "ATS-Optimized")
- Short one-line description (e.g. "Single column, maximum ATS compatibility")
- A small thumbnail/representative visual (static inline SVG or a styled div)
- A "Preview" button
- Selected state indicator (border highlight + checkmark icon when selected)

Clicking anywhere on a card (except the Preview button) selects that template.

### 2. Template selection state

- Managed as a local signal `selectedTemplate = signal<CvTemplateId>('ats')` in `CvOptimization`
- `CvTemplateId` is a union type: `'ats' | 'modern' | 'executive'`
- Default is `'ats'`

### 3. Preview dialog

Clicking "Preview" on a card:
- Opens a PrimeNG `<p-dialog>` (maximizable, scrollable)
- Renders a `<cv-template-preview>` component inside, receiving `[cv]="mergedCv()"` and `[templateId]="cardTemplateId"`
- The preview is a pure HTML component using inline styles (not Tailwind), scoped to produce a print-accurate render
- The dialog is scrollable if the CV content is long
- A "Close" button dismisses the dialog

### 4. Export with template

`CvExportService.exportToPdf(cv, templateId)` and `exportToDocx(cv, templateId)` receive the selected template ID and apply the corresponding style profile.

## Template Visual Specs

### Template 1 — ATS-Optimized (`'ats'`)

Based on `template1.jpg`:
- **Layout:** Single column, left-aligned
- **Name:** Large bold sans-serif (Helvetica/Arial), ~28pt in PDF
- **Job title:** Teal/cyan color (`#2a9d8f` or similar), ~14pt, no bold
- **Contact:** Small plain text, separator `|`
- **Section headings:** Teal/cyan, bold, ~14pt, with a thin horizontal rule underneath
- **Skills:** Rendered as pill/badge chips (rounded border, small padding)
- **Body text:** 10–11pt, black
- **Bullets:** Standard bullet `•`
- **Page margins:** 56pt left/right (existing)
- **Colors:** Teal accent (`#2a9d8f`), black text, white background

### Template 2 — Modern (`'modern'`)

Based on `template2.jpg`:
- **Layout:** Single column, left-aligned; contact block is right-aligned (floated top-right)
- **Name:** Large bold serif or sans-serif, left-aligned, ~26pt
- **Job title:** Smaller, plain, left-aligned below name
- **Contact:** Right-aligned block at top (email, phone, location, LinkedIn stacked)
- **Section headings:** Red/coral color (`#e63946`), bold, ~14pt, with a left vertical bar accent (`border-left: 3px solid`)
- **Experience entries:** Job role dot marker (red bullet `•`) on the left
- **Skills:** Pill chips with red border
- **Body text:** 10–11pt
- **Colors:** Red/coral accent (`#e63946`), black text, white background

### Template 3 — Executive (`'executive'`)

Based on `template3.jpg`:
- **Layout:** Single column, centered header
- **Name:** Centered, bold serif, purple (`#7b2d8b` or similar), ~26pt
- **Job title:** Centered, italic, ~13pt
- **Contact:** Centered, small text, separator `|`
- **Section headings:** Purple background band (`background: #f3e8ff` or similar), purple text, left-aligned within band, ~13pt bold
- **Experience entries:** Left-bordered card style (thin left border, subtle background)
- **Education entries:** Similar card style
- **Skills:** Filled purple chips (white text on purple background)
- **Body text:** 10–11pt
- **Colors:** Purple accent (`#7b2d8b`), lavender background bands, black text

## Data / API

### New shared type

In `packages/shared/datatypes/src/lib/datatypes.ts`:

```ts
export type CvTemplateId = 'ats' | 'modern' | 'executive';

export interface CvTemplate {
  id: CvTemplateId;
  name: string;
  description: string;
}

export const CV_TEMPLATES: CvTemplate[] = [
  { id: 'ats',       name: 'ATS-Optimized', description: 'Single column, maximum ATS compatibility' },
  { id: 'modern',    name: 'Modern',        description: 'Subtle accents, still ATS-safe' },
  { id: 'executive', name: 'Executive',     description: 'Elegant layout for senior roles' },
];
```

### Updated export service signatures

```ts
exportToPdf(cv: CvStructuredData, templateId: CvTemplateId): Promise<void>
exportToDocx(cv: CvStructuredData, templateId: CvTemplateId): Promise<void>
```

Each method delegates to a private style-profile map keyed by `CvTemplateId`.

### New frontend files

```
apps/opticv-web/src/app/features/cv-optimization/
  components/
    cv-template-selector/
      cv-template-selector.ts        # Selector card list component
      cv-template-selector.html
    cv-template-preview/
      cv-template-preview.ts         # Preview renderer component (pure HTML, inline styles)
      cv-template-preview.html       # One @switch block per templateId
```

### Modified files

| File | Change |
|------|--------|
| `cv-optimization.ts` | Add `selectedTemplate` signal; wire to selector and export calls |
| `cv-optimization.html` | Add `<cv-template-selector>` and preview dialog above export buttons |
| `services/cv-export.service.ts` | Accept `templateId` param; apply style profiles |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `CvTemplateId`, `CvTemplate`, `CV_TEMPLATES` |

## Edge Cases

- If `mergedCv()` is null/empty when Preview is clicked, the preview dialog shows a "No CV data available" message instead of rendering the template.
- Template selection is reset to `'ats'` on component destroy (session-only by design).
- DOCX does not support all CSS features; colors are applied via the `docx` library's `color` property on `TextRun` and `Paragraph`; unsupported decorations (background bands, pill borders) degrade gracefully to bold headings.
- PDF pill/chip rendering for skills uses a simulated approach (draw a rounded rectangle before each skill text) since jsPDF has no native chip widget.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- Typechecks pass (`npm exec nx typecheck opticv-web`)
- Lint passes (`npm exec nx lint opticv-web`)
- Template 1 (ATS) is selected by default when the Export CV section becomes visible
- Selecting a different template card highlights it (deselects previous)
- "Preview" button on each card opens a dialog showing the user's merged CV rendered in that template's style
- Exporting as PDF produces a file styled according to the selected template
- Exporting as DOCX produces a file styled according to the selected template
- No breaking changes to existing cover letter or interview prep export paths
- No new `any` types introduced
