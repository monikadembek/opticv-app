# Implementation Plan

## Task

32 — Create CV Templates

## Resolved clarifications (from review)

- **Template selector visibility:** Always visible inside the Export CV section, regardless of `canExportCv()` state.
- **Preview template:** Each card's Preview button shows that card's own template, not the currently selected template.
- **Accessibility:** Template selector cards implement `role="radiogroup"` / `role="radio"`, keyboard navigation (Arrow keys, Space/Enter to select).

---

## Step 1 — Add shared types to datatypes package

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Add at the end of the file:

```ts
export type CvTemplateId = 'ats' | 'modern' | 'executive';
```

> The `CV_TEMPLATES` constant and `CvTemplate` interface live in the frontend feature module (not in the shared pure-types library) to keep the library free of runtime values.

---

## Step 2 — Create template constants in the frontend feature

**New file:** `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts`

Define:

```ts
export interface CvTemplate {
  id: CvTemplateId;
  name: string;
  description: string;
  accentColor: string;   // used for thumbnail rendering
}

export const CV_TEMPLATES: CvTemplate[] = [
  { id: 'ats',       name: 'ATS-Optimized', description: 'Single column, maximum ATS compatibility', accentColor: '#2a9d8f' },
  { id: 'modern',    name: 'Modern',        description: 'Subtle accents, still ATS-safe',           accentColor: '#e63946' },
  { id: 'executive', name: 'Executive',     description: 'Elegant layout for senior roles',          accentColor: '#7b2d8b' },
];
```

---

## Step 3 — Create `CvTemplateSelector` component

**New files:**
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.html`

### Component spec

```ts
@Component({
  selector: 'cv-template-selector',
  templateUrl: './cv-template-selector.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'radiogroup', 'aria-label': 'Choose CV template' },
})
export class CvTemplateSelector {
  readonly selected = model<CvTemplateId>('ats');
  readonly templates = CV_TEMPLATES;
  readonly previewTemplateId = signal<CvTemplateId | null>(null);
  readonly previewVisible = signal(false);

  select(id: CvTemplateId): void { ... }
  openPreview(id: CvTemplateId, event: Event): void { event.stopPropagation(); ... }
  closePreview(): void { ... }
  onKeydown(event: KeyboardEvent, id: CvTemplateId): void { /* Arrow/Space/Enter handling */ }
}
```

### Inputs / Outputs

- `selected`: `model<CvTemplateId>` — two-way binding, default `'ats'`
- `previewTemplateId`: internal signal tracking which card's preview is open
- `previewVisible`: internal signal for dialog open/close

### Template card layout (per card)

```
[div role="radio" aria-checked tabindex]
  ├── Thumbnail div (styled with template's accent color)
  ├── Template name (bold)
  ├── Description (small, muted)
  ├── Selected indicator: pi-check-circle icon, visible when selected
  └── "Preview" button (p-button, size="small", severity="secondary")
```

### Card selected styling

- Selected: `border-2 border-primary` + checkmark icon visible (`pi-check-circle`)
- Unselected: `border border-surface-200`

### Thumbnail

Each template card shows a small abstract thumbnail — a `div` with the template's accent color as a top bar (`h-2`, full width) over a white rectangle, simulating a CV header strip. This is purely decorative and `aria-hidden="true"`.

### Keyboard navigation

- `ArrowRight` / `ArrowDown`: focus and select next template
- `ArrowLeft` / `ArrowUp`: focus and select previous template
- `Space` / `Enter`: select focused template

### Dialog (preview)

Inside the same component template, a `<p-dialog>` controlled by `previewVisible`:
- `[header]` = name of the previewed template
- `[style]="{ width: '800px' }"`
- `[maximizable]="true"`
- `[modal]="true"`
- `[draggable]="false"`
- Scrollable body
- Contains `<cv-template-preview [cv]="mergedCv" [templateId]="previewTemplateId()" />`
- `mergedCv` is passed as an input from the parent

**Additional input on `CvTemplateSelector`:**
- `mergedCv = input.required<CvStructuredData | null>()`

---

## Step 4 — Create `CvTemplatePreview` component

**New files:**
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html`

### Component spec

```ts
@Component({
  selector: 'cv-template-preview',
  templateUrl: './cv-template-preview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvTemplatePreview {
  readonly cv = input.required<CvStructuredData | null>();
  readonly templateId = input.required<CvTemplateId | null>();
}
```

### Template structure

```html
@if (!cv()) {
  <p>No CV data available.</p>
} @else {
  @switch (templateId()) {
    @case ('ats') { <div class="cv-preview-ats"> ... </div> }
    @case ('modern') { <div class="cv-preview-modern"> ... </div> }
    @case ('executive') { <div class="cv-preview-executive"> ... </div> }
  }
}
```

### Styling approach

- All styles are **inline styles** on elements (no Tailwind, no external stylesheet)
- Each template renders all sections: contact, summary, experience, education, skills, certifications, projects, languages
- Each section checks its data array/value is non-null/non-empty before rendering
- Font family: `'Helvetica Neue', Arial, sans-serif` for ATS and Modern; `Georgia, 'Times New Roman', serif` for Executive name/title
- The preview div has `max-width: 794px` (A4 portrait pixel width at 96dpi) and `margin: 0 auto`

#### ATS template inline style palette
- Name: `font-size: 22px; font-weight: bold; color: #1a1a1a`
- Job title: `font-size: 14px; color: #2a9d8f`
- Section headings: `font-size: 13px; font-weight: bold; color: #2a9d8f; border-bottom: 1.5px solid #2a9d8f`
- Skills: each skill wrapped in `span` with `border: 1px solid #2a9d8f; border-radius: 12px; padding: 2px 8px; font-size: 11px`

#### Modern template inline style palette
- Name: `font-size: 22px; font-weight: bold; color: #1a1a1a`
- Contact block: `float: right; text-align: right; font-size: 11px`
- Section headings: `font-size: 13px; font-weight: bold; color: #e63946; border-left: 3px solid #e63946; padding-left: 8px`
- Experience bullet marker: red `•` (`color: #e63946`)
- Skills: each skill wrapped in `span` with `border: 1px solid #e63946; border-radius: 12px; padding: 2px 8px; font-size: 11px`

#### Executive template inline style palette
- Name: `font-size: 22px; font-weight: bold; color: #7b2d8b; text-align: center`
- Job title: `font-size: 13px; font-style: italic; text-align: center`
- Contact: `text-align: center; font-size: 11px`
- Section headings: `background: #f3e8ff; color: #7b2d8b; font-weight: bold; padding: 4px 8px`
- Experience entries: `border-left: 3px solid #e9d5ff; padding-left: 10px; background: #faf5ff`
- Education entries: same card style as experience
- Skills: each skill wrapped in `span` with `background: #7b2d8b; color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 11px`

---

## Step 5 — Update `CvExportService`

**Modified file:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

### Change to method signatures

```ts
async exportToPdf(cv: CvStructuredData, templateId: CvTemplateId): Promise<void>
async exportToDocx(cv: CvStructuredData, templateId: CvTemplateId): Promise<void>
```

### Style profile interface (private, internal to service)

```ts
interface PdfStyleProfile {
  accentColor: string;          // hex, used with doc.setTextColor(r, g, b)
  nameSize: number;
  titleSize: number;
  headingSize: number;
  bodySize: number;
  headingStyle: 'underline' | 'leftBar';   // underline = ATS, leftBar = Modern/Executive
  headingAlign: 'left' | 'center';
  skillsStyle: 'chips' | 'comma';          // chips = draw rounded rect per skill; comma = joined string
  contactAlign: 'left' | 'right-block';    // right-block = Modern
}
```

Create a private `PDF_PROFILES: Record<CvTemplateId, PdfStyleProfile>` map inside the service with concrete values derived from the template visual specs.

### PDF rendering changes per template

**ATS (`accentColor: '#2a9d8f'`):**
- Name: `fontSize 20, bold, black`
- Job title (from first experience or a dedicated field — use `contact` subtitle if present, else skip): `fontSize 13, accent color`
- Section headings: text in accent color + horizontal rule in accent color (existing approach, recolored)
- Skills: draw a rounded rectangle (via `doc.roundedRect`) behind each skill pill; approximate with `doc.rect` if rounded is unavailable. Skills are laid out horizontally, wrapping to next line when they exceed `maxWidth`.
- All other text: black

**Modern (`accentColor: '#e63946'`):**
- Name: `fontSize 20, bold, black`, left-aligned
- Contact: printed right-aligned (use `doc.text(text, pageWidth - marginRight, y, { align: 'right' })`) stacked on separate lines; name/title printed left at same y range
- Section headings: accent color text + left vertical bar drawn with `doc.rect(marginLeft - 6, y - 10, 2.5, 12)` in accent color
- Experience bullet: prefix bullet char with accent color text, remaining text in black
- Skills: pill border in accent color (same chip approach as ATS but with Modern accent)

**Executive (`accentColor: '#7b2d8b'`):**
- Name: `fontSize 20, bold, accent color, centered` (`doc.text(name, pageWidth / 2, y, { align: 'center' })`)
- Job title: italic, centered
- Contact: centered
- Section headings: accent color text, bold, left-aligned; draw filled background rect in `#f3e8ff` behind the heading line (full width minus margins)
- Experience / Education entries: draw a thin left bar (`doc.setDrawColor` then `doc.rect`) in `#e9d5ff`
- Skills: filled rect in `#7b2d8b` with white text (use `doc.setTextColor(255,255,255)` for skill text)

### DOCX style profile interface (private)

```ts
interface DocxStyleProfile {
  accentColorHex: string;       // 6-char hex without #, for TextRun color property
  nameSize: number;             // half-points
  headingSize: number;
  bodySize: number;
  headingBold: boolean;
  headingAlignment: AlignmentType;
  nameAlignment: AlignmentType;
}
```

Create a private `DOCX_PROFILES: Record<CvTemplateId, DocxStyleProfile>` map.

### DOCX rendering changes per template

**ATS:** Heading color = `2A9D8F`, name black, headings left-aligned bold.

**Modern:** Heading color = `E63946`, name black, headings left-aligned bold. Contact stacked as separate paragraphs (right-aligned).

**Executive:** Heading color = `7B2D8B`, name color = `7B2D8B`, name centered, title italic centered, contact centered. Headings: color = `7B2D8B`, bold. Background bands and pill fills degrade gracefully — heading paragraphs have shading via `docx` `Paragraph.shading` if available, otherwise just color text.

DOCX skills: all templates render skills as a comma-separated string (pills are not reproducible in DOCX). For ATS and Modern the skill text uses the accent color. For Executive the skills string uses the accent color.

---

## Step 6 — Update `CvOptimization` orchestrator

**Modified file:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

### Changes

1. Add signal: `readonly selectedTemplate = signal<CvTemplateId>('ats');`
2. Add `CvTemplateSelector` and `DialogModule` to `imports` array.
3. Update `exportCvAsPdf()`: pass `this.selectedTemplate()` as second arg to `cvExportService.exportToPdf`.
4. Update `exportCvAsDocx()`: pass `this.selectedTemplate()` as second arg to `cvExportService.exportToDocx`.
5. Add import for `CvTemplateId` from `@opticv/datatypes`.
6. Add handler: `onTemplateSelected(id: CvTemplateId): void { this.selectedTemplate.set(id); }`

---

## Step 7 — Update `cv-optimization.html`

**Modified file:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

### Changes

The Export CV `<div>` (currently starts at line 338 gated by `@if (jobApplicationId())`) is restructured:

```html
@if (jobApplicationId()) {
  <div class="border-t border-surface-200 pt-6 mt-6">
    <h3 ...>Export CV</h3>

    <!-- Template selector: always visible, above export buttons -->
    <cv-template-selector
      [(selected)]="selectedTemplate"
      [mergedCv]="mergedCv()"
    />

    <!-- Export buttons: only when canExportCv() -->
    @if (canExportCv()) {
      <div class="flex flex-wrap gap-3 mt-4">
        <p-button label="Export CV as PDF" ... (onClick)="exportCvAsPdf()" />
        <p-button label="Export CV as DOCX" ... (onClick)="exportCvAsDocx()" />
      </div>
    } @else {
      <p class="text-sm text-surface-400 m-0 mt-3">
        Select at least one change above to export a modified CV.
      </p>
    }
  </div>
}
```

---

## Step 8 — Update shared datatypes barrel export

**Modified file:** `packages/shared/datatypes/src/index.ts` (or equivalent barrel)

Ensure `CvTemplateId` is exported from the package. Verify the barrel file re-exports from `./lib/datatypes`.

---

## Step 9 — Verify build and types

Run in order:

```
npm exec nx build datatypes
npm exec nx typecheck opticv-web
npm exec nx lint opticv-web
npm exec nx build opticv-web
```

Fix any errors before marking complete.

---

## Files Summary

### Created

| File | Purpose |
|------|---------|
| `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts` | `CvTemplate` interface + `CV_TEMPLATES` constant |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.ts` | Template selector card list component |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.html` | Selector template |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.ts` | Preview renderer component |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html` | Preview template (3 variants via @switch) |

### Modified

| File | Change |
|------|--------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `CvTemplateId` type |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` | Add `templateId` param; add style profiles; update PDF and DOCX rendering per template |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add `selectedTemplate` signal; update export calls; add `CvTemplateSelector` to imports |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Add `<cv-template-selector>`, restructure Export CV section |
