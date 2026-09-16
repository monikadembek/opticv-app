# Implementation Done

## Task

32 — Create CV Templates

---

## Summary

Three CV templates (Default/ATS-Optimized, Modern, Executive) were implemented as a frontend-only feature. A template selector component was added to the Export CV section of the CV optimization page. Each card shows a thumbnail, name, description, and a Preview button. Selecting a template updates a signal on the orchestrator which is passed to the PDF and DOCX export calls. A preview dialog renders the user's merged CV data in the selected template's visual style using inline styles. Unit tests were added for all new components, pipes, and the template constants.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Three template definitions: ATS-Optimized, Modern, Executive | Implemented | ATS template is named "Default" in the implementation, not "ATS-Optimized" |
| Template selector UI: card per template, rendered above export buttons | Implemented | |
| Selector always visible inside Export CV section (resolved clarification) | Implemented | Selector renders whenever `jobApplicationId()` is truthy |
| Template cards: name, description, thumbnail, Preview button, selected indicator | Implemented | |
| Clicking a card (except Preview) selects it | Implemented | |
| Selected card shows border highlight + checkmark icon | Implemented | |
| `selectedTemplate = signal<CvTemplateId>('ats')` in `CvOptimization` | Implemented | |
| `CvTemplateId` union type: `'ats' \| 'modern' \| 'executive'` | Implemented | Defined in `cv-templates.ts` (frontend feature), not in shared datatypes |
| Default selection: `'ats'` | Implemented | |
| Session-only state | Implemented | No persistence |
| Preview dialog: opens on "Preview" button click | Implemented | |
| Preview shows card's own template (resolved clarification) | Implemented | `previewTemplateId` tracks which card's Preview was clicked |
| Preview dialog: PrimeNG `<p-dialog>`, maximizable, scrollable | Implemented | |
| Preview dialog width ~800px | Implemented | Set to `840px` |
| Preview renders user's `mergedCv()` data | Implemented | |
| Preview: "No CV data available" when `mergedCv()` is null | Implemented | |
| ATS template visual style (teal accent `#2a9d8f`, single column, section headings with underline, skill pills) | Implemented | |
| Modern template visual style (red accent `#e63946`, right-aligned contact block, left-bar headings, red bullet markers) | Implemented | |
| Executive template visual style (purple accent `#7b2d8b`, centered header, filled band headings, card entries, filled skill chips) | Implemented | |
| PDF export respects selected template | Implemented | `exportToPdf(cv, templateId)` uses `PDF_PROFILES` map |
| DOCX export respects selected template | Implemented | `exportToDocx(cv, templateId)` uses `DOCX_PROFILES` map |
| Skill chips in PDF: rounded rect per skill | Implemented | Uses `doc.roundedRect` |
| DOCX skill pills degrade to comma-separated string in accent color | Implemented | |
| Executive DOCX: background bands degrade (shading not used; heading text uses accent color only) | Implemented | |
| Accessibility: `role="radiogroup"` on selector host | Implemented | |
| Accessibility: `role="radio"` + `aria-checked` on each card | Implemented | |
| Keyboard navigation: Arrow keys navigate, Space/Enter select | Implemented | |
| Thumbnail: accent color top bar over muted rectangle | Implemented | |
| `CvTemplate` interface with `accentColor` field | Implemented | Defined in frontend `cv-templates.ts` |
| `CV_TEMPLATES` constant in frontend feature module | Implemented | In `cv-templates.ts`; plan resolved it away from shared datatypes |
| `CvTemplateId` added to `packages/shared/datatypes` | Not implemented | Plan overrode the spec: type lives in `cv-templates.ts` in the frontend feature instead |
| No new `any` types | Implemented | |

---

## Files

### Created

| File | Purpose |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts` | `CvTemplateId` type, `CvTemplate` interface, `CV_TEMPLATES` constant |
| `apps/opticv-web/src/app/features/cv-optimization/cv-templates.spec.ts` | Unit tests for `CV_TEMPLATES` |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.ts` | Template selector card-list component |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.html` | Selector template (cards + preview dialog) |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.spec.ts` | Unit tests for `CvTemplateSelector` |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.ts` | Preview renderer component |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html` | Preview template (3 cases via `@switch`) |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-preview-pipes.ts` | `AtsContactPipe`, `DateRangePipe`, `DegreeFieldPipe` |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-preview-pipes.spec.ts` | Unit tests for the preview pipes |

### Modified

| File | Change |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added `selectedTemplate` signal; added `CvTemplateSelector` to imports; updated `exportCvAsPdf()` and `exportCvAsDocx()` to pass `selectedTemplate()` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Added `<app-cv-template-selector>` with "Choose Template" heading above export buttons; restructured Export CV section |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` | Added `templateId` parameter to `exportToPdf` and `exportToDocx`; added `PdfStyleProfile`, `DocxStyleProfile` interfaces; added `PDF_PROFILES` and `DOCX_PROFILES` maps; implemented per-template rendering logic |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Updated tests to reflect new template selector integration |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.html` | Minor change (part of same commit batch) |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.spec.ts` | Minor change (part of same commit batch) |

---

## Components

| Component | Status |
|---|---|
| `CvTemplateSelector` (`app-cv-template-selector`) | Exist |
| `CvTemplatePreview` (`app-cv-template-preview`) | Exist |

---

## Stores

No NgRx stores were introduced by this task. Template selection is managed via a local `signal<CvTemplateId>` on the `CvOptimization` orchestrator component, as specified in the plan.

| Store | Status |
|---|---|
| (none planned) | N/A |

---

## Deviations from Plan

| # | Deviation |
|---|---|
| 1 | **ATS template name changed.** Plan specifies `name: 'ATS-Optimized'`; implementation uses `name: 'Default'`. |
| 2 | **`CvTemplateId` not added to shared datatypes package.** The spec required it in `packages/shared/datatypes/src/lib/datatypes.ts`. The plan overrode this: `CvTemplateId`, `CvTemplate`, and `CV_TEMPLATES` all live in `apps/opticv-web/.../cv-templates.ts`. The `datatypes.spec.ts` file was listed as changed but the type was not added to it. |
| 3 | **Preview dialog width is `840px` not `800px`.** Plan specified `[style]="{ width: '800px' }"`. |
| 4 | **Plan specified a `CvTemplateSelector` with `selector: 'cv-template-selector'`; implementation uses `selector: 'app-cv-template-selector'`.** Same for `CvTemplatePreview` which uses `app-cv-template-preview`. |
| 5 | **Three additional pipes (`AtsContactPipe`, `DateRangePipe`, `DegreeFieldPipe`) were extracted into a separate file** `cv-preview-pipes.ts` — not mentioned in the plan's file list. |
| 6 | **Plan Step 6 mentioned adding a `DialogModule` import to `CvOptimization`; the preview dialog is instead contained within `CvTemplateSelector`, so no `DialogModule` was added to the orchestrator.** |

---

## Additional Implementation

- `cv-preview-pipes.ts` and `cv-preview-pipes.spec.ts` — Three standalone pipes (`AtsContactPipe`, `DateRangePipe`, `DegreeFieldPipe`) extracted into their own file to format contact strings, date ranges, and degree/field text in the preview templates. Not mentioned in the original plan.
- `PdfStyleProfile` includes additional fields beyond the plan spec: `accentR/G/B` (split from `accentColor`), `chipsStyle`, `entryCardStyle`, `accentBullet`, `nameFont`, `nameStyle`, `headingFont`, `bodyFont`, `bodyStyle`, `dateStyle`. These extend the profile with finer-grained PDF rendering control.
- `DocxStyleProfile` includes additional fields beyond the plan spec: `nameHex`, `nameCenter`, `contactCenter`, `contactRightStack`, `nameFont`, `nameBold`, `nameItalic`, `headingFont`, `bodyFont`. Same rationale.
