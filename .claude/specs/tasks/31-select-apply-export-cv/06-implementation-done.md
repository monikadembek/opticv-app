# Implementation Done — Task 31: Select, Apply & Export Optimized CV

## Summary

Backend GET endpoint for optimization result IDs added. Frontend API service extended with `getOptimizationResults()` and `saveUserOutput()` methods. Parent `CvOptimization` component extended with CV structured data signal, optimization result ID map, selection state, and export methods. `SummaryRewrite` component updated with variant selection, inline textarea editing, and export-ready text emission. `KeywordGap` component updated with checkbox selection. `BulletRewriter` component updated with checkbox selection for AI-rewritten bullets. New `CvExportService` created for client-side PDF and DOCX export. Shared `applySelectionsToCV()` utility created. `OptimizationResultSummary`, `UserSelections`, and related types added to shared datatypes. Export buttons added to the main page. The Apply/PATCH persistence flow, Keyword Gap textarea, and Bullet Rewriter per-bullet textarea and radio toggle were not implemented.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Summary Rewrite: variant selection with radio/clickable cards | Implemented | Clickable cards with radio buttons; selection stored in parent `selections` signal |
| Summary Rewrite: textarea appears on variant selection, pre-filled | Implemented | Textarea shown via `@if (selectedAngle())`; seeded via `effect()` from `selectedVariantText` computed |
| Summary Rewrite: switching variant replaces textarea content | Implemented | `effect()` in `SummaryRewrite` resets `editableText` when `selectedVariantText` changes |
| Summary Rewrite: free editing of textarea | Implemented | `onTextChange()` updates local `editableText` signal and emits `summaryTextEdited` to parent |
| Summary Rewrite: "Apply selected version" button calling PATCH | Not implemented | No Apply button in `SummaryRewrite`; `saveUserOutput()` is never called for this panel |
| Summary Rewrite: success/error indicator on Apply | Not implemented | Follows from above |
| Summary Rewrite: session state updated on Apply success | Not implemented | Partial — `customSummaryText` is stored in parent `selections` on every text change, not gated on Apply |
| Keyword Gap: checkbox per missing keyword | Implemented | Checkboxes in "Likely have" and "Genuinely lacks" sections; selection emitted via `keywordToggled` output |
| Keyword Gap: textarea with selected keywords (appears when first checked) | Not implemented | No textarea in `KeywordGap` component |
| Keyword Gap: "Apply keywords" button calling PATCH | Not implemented | No Apply button or `saveUserOutput` call |
| Keyword Gap: session state updated on Apply success | Not implemented | Keywords stored in parent `selections.selectedKeywords` on toggle, not gated on Apply |
| Bullet Rewriter: Original / AI Rewrite radio toggle per bullet | Not implemented | Single checkbox to select AI rewrite; no original/rewrite radio pair |
| Bullet Rewriter: per-bullet textarea (editable) | Not implemented | No textarea per bullet |
| Bullet Rewriter: per-bullet "Apply" button calling PATCH | Not implemented | No per-bullet Apply button or `saveUserOutput` call |
| Bullet Rewriter: session state updated on per-bullet Apply | Not implemented | Bullets stored in parent `selections.selectedBullets` on checkbox toggle |
| `PATCH /optimizations/{id}/user-output` called on Apply for any panel | Not implemented | `saveUserOutput()` method exists in API service but is never called |
| `optimizationResultId` passed to panel components | Not implemented | `optimizationResultIds` signal is populated but not passed as inputs to any panel |
| Backend GET `/optimizations/job-applications/:jobApplicationId/results` | Implemented | `OptimizationController.getOptimizationResultSummaries()` with ownership check |
| `OptimizationResultSummaryDto` response DTO | Implemented | `apps/opticv-be/src/app/optimization/dto/optimization-result-summary.dto.ts` |
| `OptimizationResultSummary` type in shared datatypes | Implemented | `packages/shared/datatypes/src/lib/datatypes.ts` line 373 |
| Frontend `getOptimizationResults()` API method | Implemented | `cv-optimization-api.service.ts` line 84 |
| Frontend `saveUserOutput()` API method | Implemented | `cv-optimization-api.service.ts` line 92; method exists but unused |
| `cvStructuredData` signal in parent component | Implemented | `cv-optimization.ts` line 135; populated from `JobUpload.jobSubmitted` event |
| `optimizationResultIds` signal in parent component | Implemented | `cv-optimization.ts` line 136; populated by `loadOptimizationResultIds()` after SSE completes |
| Export CV to PDF | Implemented | `CvExportService.exportToPdf()` — all 8 sections rendered with jsPDF |
| Export CV to DOCX | Implemented | `CvExportService.exportToDocx()` — all 8 sections rendered with docx library |
| Export buttons on main page | Implemented | Export section rendered when `jobApplicationId()` is set and `canExportCv()` is true |
| Export buttons disabled when CV data not ready | Not implemented | Buttons are hidden (not disabled with tooltip) when `!canExportCv()`; buttons not always visible |
| Export merges session state with original `CvStructuredData` | Implemented | `applySelectionsToCV()` utility handles summary, bullets, keywords |
| Export with zero applied optimizations uses original CV data | Not implemented | `canExportCv()` returns `false` when no selections — export not accessible without selections |
| Export buttons show loading state while generating | Implemented | `isExportingPdf` / `isExportingDocx` signals passed to `[loading]` on buttons |

---

## Files

### Created

| File | Description |
|---|---|
| `apps/opticv-be/src/app/optimization/dto/optimization-result-summary.dto.ts` | Response DTO for new GET endpoint |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` | Client-side CV export service (PDF + DOCX) |
| `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` | Utility function to merge `UserSelections` into `CvStructuredData` |

### Modified

| File | Change |
|---|---|
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | Added `GET job-applications/:jobApplicationId/results` endpoint |
| `apps/opticv-be/src/app/optimization/optimization.service.ts` | Added `getOptimizationResultSummaries()` method |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added `OptimizationResultSummary`, `BulletSelectionKey`, `UserSelections` types; added `customSummaryText` field to `UserSelections` |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts` | Added `getOptimizationResults()` and `saveUserOutput()` methods |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added `cvStructuredData`, `optimizationResultIds`, `selections`, `isExportingPdf`, `isExportingDocx` signals; `mergedCv`, `canExportCv` computed; `onAngleSelected`, `onSummaryTextEdited`, `onBulletToggled`, `onKeywordToggled`, `exportCvAsPdf`, `exportCvAsDocx`, `loadOptimizationResultIds` methods |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Added `[selectedAngle]`, `(summaryTextEdited)` bindings to `app-summary-rewrite`; `[selectedKeywords]`, `(keywordToggled)` bindings to `app-keyword-gap`; `[selectedBullets]`, `(bulletToggled)` bindings to `app-bullet-rewriter`; export section with PDF/DOCX buttons |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.ts` | Added `selectedAngle` input, `angleSelected` + `summaryTextEdited` outputs, `editableText` / `isModified` signals, `selectedVariantText` computed, `effect()` to seed textarea, `onTextChange()` method |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.html` | Added variant card click selection, radio buttons, inline textarea editor with `isModified` indicator |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` | Added `selectedKeywords` input, `keywordToggled` output, `isSelected()` and `toggleKeyword()` methods |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` | Added checkboxes per missing keyword in both "Likely have" and "Genuinely lacks" sections; added selection count indicator |
| `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts` | Added `selectedBullets` input, `bulletToggled` output, `isSelected()` and `toggleBullet()` methods |
| `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html` | Added checkbox selection for AI-rewritten bullets |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts` | Updated `jobSubmitted` output to emit `JobSubmittedData` containing both `jobApplication` and `extractedData`; inline CV extraction added to submit flow |

---

## Components

| Component | Status |
|---|---|
| `SummaryRewrite` — selection + textarea | Exist |
| `KeywordGap` — checkbox selection | Exist |
| `BulletRewriter` — checkbox selection | Exist |
| `CvExportService` | Exist |
| `applySelectionsToCV` utility | Exist |
| `OptimizationResultSummaryDto` (BE) | Exist |

---

## Stores

| Store | Status | Note |
|---|---|---|
| `AppliedEdits` signal on `CvOptimization` | Exist (as `UserSelections`) | Implemented as `selections` signal with shape `{ selectedSummaryAngle, customSummaryText, selectedBullets, selectedKeywords }` instead of plan's `{ summary, keywordsText, bullets }` |
| Separate `OptimizationEditsStore` (NgRx) | Missing | Plan decided against this; state lives on parent component |

---

## Deviations from Plan

1. **State shape renamed and restructured** — Plan specifies `AppliedEdits { summary: string | null, keywordsText: string | null, bullets: AppliedBullet[] }`. Implementation uses `UserSelections { selectedSummaryAngle, customSummaryText, selectedBullets: BulletSelectionKey[], selectedKeywords: string[] }` stored in `datatypes.ts`. The merge from selections to CV data is done by `applySelectionsToCV()` utility rather than inside `CvExportService.mergeCv()`.

2. **`CvExportService` signature changed** — Plan specifies `exportToPdf(cv, edits)` and `exportToDocx(cv, edits)` with a private `mergeCv()`. Implementation is `exportToPdf(cv)` / `exportToDocx(cv)` — merging is done upstream in `mergedCv` computed signal before calling the service.

3. **`CvStructuredData` loaded in `JobUpload` component** — Plan specifies calling `extractCvData()` in `CvOptimization.runOptimization()`. Implementation calls `extractCvData()` inside `JobUpload.onSubmit()` via `switchMap` and emits the result as part of `jobSubmitted` event.

4. **Apply/PATCH flow not implemented** — Plan Steps 4–6 specify each panel receives `optimizationResultId` input and calls `saveUserOutput` on an Apply button. This is not implemented for any panel.

5. **Keyword Gap textarea not implemented** — Plan Step 5 specifies a textarea that appears when keywords are selected. Not present.

6. **Bullet Rewriter interaction model not implemented** — Plan Step 6 specifies Original/AI Rewrite radio buttons, per-bullet textarea, and per-bullet Apply button. Only a checkbox to select the AI rewrite is present.

7. **`ActivePrompts` constant limits run to `[PromptType.KEYWORD_GAP]`** — Plan assumes all prompt types run. Current implementation in `cv-optimization.ts` line 105 restricts to a single prompt type.

---

## Additional Implementation

- **`customSummaryText: string | null` field added to `UserSelections`** — allows storing a user-edited summary text independently from the selected angle. Not in the original plan's state shape.
- **`isModified` computed signal in `SummaryRewrite`** — compares `editableText()` against `selectedVariantText()` to display a "Modified from original variant" hint. Not specified in plan.
- **`BulletSelectionKey` type added to shared datatypes** — `{ company, title, originalText }` key type for bullet selection. Not in plan's type definitions (plan used `{ positionIndex, bulletIndex, text }`).
