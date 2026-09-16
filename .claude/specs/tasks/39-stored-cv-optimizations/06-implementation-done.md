# Implementation Done

Task: 39 — CV Optimizations: show list, delete optimization, open stored optimization

---

## Summary

Delivered full task scope: dashboard refactored to a two-tab layout (My CVs / My Optimizations), new `OptimizationList` component with loading/error/empty states, delete flow with confirmation dialog and toast feedback, and stored optimization loading in `CvOptimization` via a new `isStoredMode` signal. Backend endpoints for list, detail, and delete were already present; shared types were extended with `cvDocument` relation on list and detail types and `structuredOutput` on `OptimizationResultSummary`. New `JobApplicationApiService` created in core. Parameterized route added before parameterless route in `app.routes.ts`.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Dashboard: two-tab layout (My CVs / My Optimizations) | Implemented | `p-tabs` with `p-tablist` / `p-tabpanels` |
| "My CVs" tab defaults on first load | Implemented | `value="0"` on `<p-tabs>` |
| "My CVs" tab — existing `CvFileList` unchanged | Implemented | `<app-cv-file-list />` in tab panel 0 |
| "My Optimizations" tab — new `OptimizationList` component | Implemented | |
| Optimizations tab: loading spinner | Implemented | |
| Optimizations tab: list with job title + company, CV file name, created date | Implemented | |
| Optimizations tab: "Open" button navigates to `/cv-optimization/:id` | Implemented | |
| Optimizations tab: "Delete" button (icon, destructive style) | Implemented | `severity="danger"` icon-only button |
| Optimizations tab: empty state with CTA link to `/cv-optimization` | Implemented | `routerLink="/cv-optimization"` button |
| Optimizations tab: error state with retry option | Implemented | `loadOptimizations()` called on retry |
| Delete: confirmation dialog with correct message | Implemented | |
| Delete: confirmed → call `DELETE /api/job-applications/:id` | Implemented | |
| Delete: success → remove item from list + success toast | Implemented | |
| Delete: error → error toast, list unchanged | Implemented | |
| Route `/cv-optimization/:jobApplicationId` added before parameterless route | Implemented | Declared before `/cv-optimization` in `app.routes.ts` |
| `CvOptimization`: stored mode activated by route param | Implemented | `isStoredMode` signal set in `ngOnInit` |
| `CvOptimization`: `GET /api/job-applications/:id` called to load job application | Implemented | `forkJoin` with `getJobApplication` |
| `CvOptimization`: CV structured data loaded via `GET /cv/:id/structured-data` | Implemented | `getStructuredData()` called in `switchMap` after `forkJoin` |
| `CvOptimization`: stored results loaded and populated into `results` signal | Implemented | |
| `CvOptimization`: only COMPLETED results with non-null structuredOutput populated | Implemented | |
| `CvOptimization`: `JobUpload` panel hidden in stored mode | Implemented | `@if (!isStoredMode())` wraps upload accordion |
| `CvOptimization`: partial results notice shown when some ActivePrompts missing | Implemented | `hasPartialStoredResults` computed signal + amber banner |
| `CvOptimization`: error state with "Back to Dashboard" link | Implemented | `@if (loadError())` block at top of template |
| `GET /api/job-applications` — returns list with `cvDocument` | Implemented | Backend `findAll` selects `cvDocument: { id, fileName }` |
| `GET /api/job-applications/:id` — returns detail with `cvDocument` | Implemented | Backend `findOne` includes `cvDocument` |
| `DELETE /api/job-applications/:id` — cascades to OptimizationResult rows | Implemented | Prisma schema already has `onDelete: Cascade` |
| `OptimizationResultSummary` includes `structuredOutput` | Implemented | Field present in shared type and Prisma select |
| `JobApplicationListItem` includes `cvDocument: { id, fileName }` | Implemented | Added to shared type |
| `JobApplicationWithCv` type for detail | Implemented | `JobApplicationWithCv` exported from datatypes |
| New `JobApplicationApiService` in core | Implemented | `apps/opticv-web/src/app/core/services/job-application-api.service.ts` |
| `CvOptimizationApiService.getStructuredData()` added | Implemented | `GET /cv/:id/structured-data` |
| Existing `/cv-optimization` (no param) flow unaffected | Implemented | Parameterless route preserved |
| `JobApplicationResponseDto` updated with `cvDocument` field | Implemented | `CvDocumentSummaryDto` nested in DTO |
| `JobApplicationListItemDto` updated with `cvDocument` field | Implemented | `CvDocumentSummaryDto` nested in DTO |

---

## Files

### Created
- `apps/opticv-web/src/app/core/services/job-application-api.service.ts`
- `apps/opticv-web/src/app/features/dashboard/components/optimization-list/optimization-list.ts`
- `apps/opticv-web/src/app/features/dashboard/components/optimization-list/optimization-list.html`

### Modified
- `packages/shared/datatypes/src/lib/datatypes.ts` — added `cvDocument` to `JobApplicationListItem`, added `JobApplicationWithCv`, added `JobApplicationListResponse`; confirmed `structuredOutput` already present in `OptimizationResultSummary`
- `apps/opticv-be/src/app/optimization/dto/optimization-result-summary.dto.ts` — confirmed `structuredOutput` field added
- `apps/opticv-be/src/app/optimization/optimization.service.ts` — `structuredOutput: true` in Prisma select in `getOptimizationResultSummaries`
- `apps/opticv-be/src/app/job-application/job-application.service.ts` — `findAll` adds `cvDocument` select; `findOne` includes `cvDocument`; return types updated
- `apps/opticv-be/src/app/job-application/dto/job-application-response.dto.ts` — added `CvDocumentSummaryDto` nested class; added `cvDocument` to `JobApplicationResponseDto` and `JobApplicationListItemDto`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts` — added `getStructuredData()` method
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` — added `isStoredMode`, `loadError`, `jobApplication` signals; `ngOnInit`; `loadStoredOptimization()`; `hasPartialStoredResults` computed; `canExportCv` updated for stored mode; `openOriginalCv()` updated to use `jobApplication()?.cvDocument?.id`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` — load error state; stored mode job application display section; partial results banner; `@if (!isStoredMode())` guard on upload accordion
- `apps/opticv-web/src/app/features/dashboard/dashboard.ts` — replaced previous state signals with `TabsModule` + `OptimizationList` imports; `providers: []`
- `apps/opticv-web/src/app/features/dashboard/dashboard.html` — replaced template with `p-tabs` two-tab layout
- `apps/opticv-web/src/app/app.routes.ts` — added `/cv-optimization/:jobApplicationId` route before `/cv-optimization`

---

## Components

| Component | Status |
|---|---|
| `OptimizationList` | Exist |
| `CvOptimization` (modified for stored mode) | Exist |
| `Dashboard` (refactored to tabs) | Exist |
| `CvFileList` (unchanged) | Exist |

---

## Stores

None planned or required by this task.

---

## Deviations from Plan

- Plan Step 4 described the service initially as a dashboard-feature-level file, then corrected to `core/services/`. Final location matches the corrected path: `apps/opticv-web/src/app/core/services/job-application-api.service.ts`.
- Plan Step 7 specified using `forkJoin` with a nested `switchMap` for the CV structured data call. Implemented as `forkJoin` for the job application and results in parallel, then `switchMap` into `getStructuredData` — matches the plan's intent.
- `JobApplicationController` return type annotation update (plan Step 3) was not separately visible as a diff item; the controller already used `JobApplicationWithCv` via the service return type.
- The `jobApplication` signal (`signal<JobApplicationWithCv | null>(null)`) was added to `CvOptimization` to hold the full job application object for display in the stored-mode header section. This is an implementation detail not explicitly named in the plan but required to render the job application info panel.

---

## Additional Implementation

- `CvOptimization` template: stored-mode displays a "Job Application" section showing CV file name (as a clickable link to open the original CV), job title, company name, and a collapsible "View job description" details section. This goes beyond the plan's "hide JobUpload" and "populate signals" description but is consistent with the spec's requirement to "pre-populate" the view.
- `canExportCv` computed signal updated to return `true` when `isStoredMode()` is active (without requiring selections), enabling export from a stored optimization without re-selecting changes.
