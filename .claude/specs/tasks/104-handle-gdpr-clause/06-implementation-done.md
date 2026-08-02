# Implementation Done: Task 104 — Handle GDPR Clause

## Summary

Added support for a GDPR consent clause across the CV optimization/export flow: a new `gdprClause: string | null` field on `CvStructuredData`, extraction of an existing clause from the source CV via the AI prompt, a frontend default clause constant, merge logic driven by a new `includeGdprClause` toggle, a checkbox in the export footer, and rendering of the clause in the live template preview, the paginated A4 preview, PDF export, and DOCX export.

---

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Add `gdprClause: string \| null` to `CvStructuredData` | Implemented | `packages/shared/datatypes/src/lib/datatypes.ts` |
| Update `EXTRACTION_SYSTEM_PROMPT` to extract `gdprClause` | Implemented | `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts` — schema field and rule added |
| Add default GDPR clause text constant on frontend | Implemented | `DEFAULT_GDPR_CLAUSE` in `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts` |
| Add `includeGdprClause` boolean state in `cv-optimization.ts`, initialized from extracted CV | Implemented | Signal added; set in both `runOptimization()` and `loadStoredOptimization()` |
| Extend merge logic so final `gdprClause` reflects toggle + original-clause state | Implemented | `applySelectionsToCV` in `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` — two new parameters, `clone.gdprClause` set at end of function |
| Checkbox in `export-footer.html`/`.ts`, two-way bound, title text as specified | Implemented | `model<boolean>` `includeGdprClause` on `ExportFooter`; checkbox with `title` attribute on the wrapping `<label>` |
| Render GDPR clause at bottom of last page — `cv-template-preview.html` (all 6 templates) | Implemented | All six `@case` blocks (`default`, `classic`, `modern`, `corporate`, `minimal`, `impact`) render the clause after the Languages section, gated by `cv()!.gdprClause && showGdprClauseInline()` |
| Render GDPR clause — PDF export (`exportToPdf()`) | Implemented | Renders on every page (see Deviations) |
| Render GDPR clause — DOCX export (`exportToDocx()`) | Implemented | Rendered via a Word frame paragraph anchored to page/margin |
| Toggling never mutates originally extracted `gdprClause` | Implemented | `applySelectionsToCV` reads `originalGdprClause` as a separate parameter from `cv.gdprClause`; `cv-optimization.ts` passes `this.cvStructuredData()?.gdprClause ?? null` as that original value |
| No rendering when merged `gdprClause` is `null` | Implemented | All three rendering paths (preview, PDF, DOCX) guard on truthiness before rendering |
| Tests: extraction prompt/type change | Implemented | `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.spec.ts` (new); `cv-extraction.service.spec.ts` fixture updated |
| Tests: `applySelectionsToCV` merge logic (3 combinations) | Implemented | `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts` |
| Tests: export-footer checkbox initial state and toggle | Implemented | `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts` |
| Tests: template rendering presence/absence of clause | Implemented | New `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.spec.ts` |
| Tests: PDF/DOCX export inclusion | Implemented | `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.spec.ts` |
| Tests: `cv-optimization.ts` init/toggle behavior | Implemented | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` |

---

## Files

### Created

- `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.spec.ts`
- `docs/bugs/gdpr-overlaps-text-pdf.png`

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts`
- `apps/opticv-be/src/app/cv/services/cv-extraction.service.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.css`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.spec.ts`
- `docs/tasks-list.md`

---

## Components

| Component (per plan) | Status |
| --- | --- |
| `CvTemplatePreview` (`cv-template-preview.ts`/`.html`) | Exist — new `showGdprClauseInline` input added |
| `ExportFooter` (`export-footer.ts`/`.html`) | Exist — new `includeGdprClause` model added |
| `CvOptimization` (`cv-optimization.ts`/`.html`) | Exist — new signal, wiring, and `onGdprClauseToggled()` method added |
| `CvA4Preview` (`cv-a4-preview.ts`/`.html`/`.css`) | Exist — not named in the plan's component list, but modified to render a per-page GDPR footer (see Deviations) |

---

## Stores

Not applicable — no NgRx signal store changes are part of this task's scope (state is local component/page signals per plan Step 5).

---

## Deviations

- The implementation plan (Step 4) specifies `includeGdprClause` and `originalGdprClause` as required parameters with no default on `applySelectionsToCV`; the shipped signature gives both parameters defaults (`= false`, `= null`).
- The plan (Step 5f) specifies wiring `cv-optimization.html` to `export-footer` via `[(includeGdprClause)]` two-way binding syntax; the shipped code uses separate `[includeGdprClause]` / `(includeGdprClauseChange)` bindings.
- The plan (Step 6) shows the checkbox's `title` attribute placed on the `<input>` element; the shipped markup places `title` on the wrapping `<label>` element instead.
- The plan (Steps 7–9) describes rendering the GDPR clause once, as the final content block after Languages, so it lands on the last page via natural content flow (preview, PDF, DOCX). The shipped implementation instead renders the clause on every page:
  - `CvTemplatePreview` gained a new `showGdprClauseInline` input (not in the plan) to allow suppressing its own last-page inline rendering.
  - `CvA4Preview` (not listed as a modified component in the plan) renders a separate `.a4-page-gdpr-footer` block inside its per-page `@for` loop, i.e. on every paginated page.
  - `exportToPdf()` reserves footer space on every page (`contentBottom` calculation) and redraws the clause on every page in a loop over `doc.getNumberOfPages()`, rather than appending it once after the Languages block.
  - `exportToDocx()` uses a Word frame (`FrameAnchorType`, `HorizontalPositionAlign`, `VerticalPositionAlign`) anchored to the page/margin bottom, rather than the plan's `para()`-helper trailing paragraph.
- `docs/tasks-list.md` and a new screenshot (`docs/bugs/gdpr-overlaps-text-pdf.png`) were added; neither is listed in the plan's Files Summary.

---

## Additional Implementation

> Additional implementation not covered by the original documents.

- `showGdprClauseInline` input on `CvTemplatePreview`.
- Per-page GDPR footer rendering in `CvA4Preview` (`.html`/`.css`), including the new `.a4-page-gdpr-footer` CSS class.
- Defensive test cases in `cv-optimization.spec.ts` for `gdprClause` being `undefined` (data predating the field), beyond the plan's null/non-null cases.
- `docs/bugs/gdpr-overlaps-text-pdf.png` screenshot documenting a rendering issue encountered during implementation.
