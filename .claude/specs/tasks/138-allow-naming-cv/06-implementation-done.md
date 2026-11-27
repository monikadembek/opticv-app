# Implementation Done — Task 138-allow-naming-cv

Source range: commits `89fb4ed`, `c602522`, `7bdbb62`, `d25ea4c`, `f146aab`, `211d6fa` (`a6fec8a..211d6fa`), 49 files.
Inputs: `02-spec.md`, `03-spec-review.md` (PASS WITH ISSUES), `04-implementation-plan.md`, `05-code-review.md`.

## Summary

Every `CvDocument` now has a user-editable `name` (`VARCHAR(100) NOT NULL`), backfilled by a hand-written migration. The backend sets a default name on upload and on manual create. `POST /cv/manual` accepts an optional `name`, a new `PATCH /api/cv/:id` rename endpoint was added, and `name` is returned from structured-data, list, upload and job-application responses. On the frontend, the dashboard "My CVs" table shows Name | Source | Updated | Actions and has a new `RenameCvDialog`. The CV builder has a CV name field that is saved with the CV (create, or update followed by a conditional rename). The job-upload dropdown, optimization list and job-info banner display `name`. Dashboard analytics send `cv_source` in place of `file_name`. Backend and frontend unit tests were added or updated.

## Specification Coverage

| # | Requirement | Status | Note |
| --- | --- | --- | --- |
| 1 | DB: `name VARCHAR(100) NOT NULL` on `cv_documents` (Prisma `name String @db.VarChar(100)`) | Implemented | `schema.prisma` |
| 1 | Hand-written backfill migration (strip last extension, `Untitled CV` fallback, 100-char cap) | Implemented | `20261118120000_cv_document_name/migration.sql`, with `LEFT(…, 100)` |
| 2 | Upload: default `name` = file name without its last extension, max 100 chars, `Untitled CV` fallback, in both the PDF and DOCX branches | Implemented | `CvService.buildCvNameFromFileName` |
| 2 | Upload response includes `name` | Implemented | `toUploadCvResponse`, `UploadCvResponseDto` |
| 3 | `POST /cv/manual` body `CreateManualCvRequestDto` with optional, trimmed, non-empty, max-100 `name` | Implemented | |
| 3 | `name` kept out of `structuredData`; `Untitled CV` stored when missing; quota unchanged | Implemented | `const { name, ...structuredData } = body` |
| 4 | `PATCH /api/cv/:id` with `RenameCvDto`; 400 on invalid body; 404 `CV document not found.` when the CV is missing or not owned; returns `CvDocumentDto`; no quota or throttling | Implemented | `CvController.renameCv`, `CvService.renameCv` |
| 5 | `GET /cv/:id/structured-data` returns `{ data, name }`, documented by its own Swagger DTO; `POST :id/extract` stays `{ data }` | Implemented | `CvStructuredDataResponseDto` |
| 6 | `GET /api/cv` selects `name` and `updatedAt`; ordering unchanged | Implemented | |
| 6 | Job application list/detail select `cvDocument: { id, name }` | Implemented | `job-application.service.ts`, `CvDocumentSummaryDto.name` |
| 7 | Dashboard table columns Name / Source / Updated / Actions; Size and Uploaded removed | Implemented | |
| 7 | Name cell: source icon (`aria-hidden`) + `file.name`; parse-status sub-line kept | Implemented | Built CVs use `pi pi-file-edit` |
| 7 | Source pill via `getSourceLabel`; uploads have a file-size `title`, built CVs have none | Implemented | |
| 7 | Updated cell `updatedAt \| date: 'MMM d, yyyy'` | Implemented | |
| 7 | `globalFilterFields = ['name']` | Implemented | |
| 7 | Rename action button, available for every CV | Implemented | `pi pi-pen-to-square`, `title`/`ariaLabel` "Rename" |
| 7 | Rename dialog: "Rename CV" header, labelled prefilled input, required/trim/max-100 validation, `maxlength`, error linked via `aria-describedby`, Cancel, Save disabled while invalid or saving, Enter submits | Implemented | `RenameCvDialog` |
| 7 | Dashboard rename handling: API call, `cvStore` update of `name`/`updatedAt`, dialog closed and success toast on success; error toast with dialog left open on error | Implemented | `Dashboard.renameCv` |
| 8 | Analytics `original_cv_downloaded` / `cv_deleted` send `file_id` + `cv_source`, without `file_name` | Implemented | |
| 9 | Builder `name` signal: `Untitled CV` for a new CV, prefilled from `getStructuredData` in edit mode; `originalName` stored | Implemented | |
| 9 | Labelled `pInputText` name input with `maxlength` 100, inline linked error, Save disabled when invalid | Implemented | Rendered at the top of `.builder-form` |
| 9 | Save: a new CV calls `createManualCv({ ...mergedCv(), name })`; an existing CV calls `updateStructuredData`, then `renameCv` only when the name changed; both must succeed before navigation | Implemented | Sequential `switchMap` |
| 9 | `syncCvStore` maps `name` and `updatedAt` | Implemented | |
| 10 | `job-upload.html` `optionLabel="name"` | Implemented | |
| 10 | `optimization-list.html` shows `cvDocument.name`; `globalFilterFields` includes `cvDocument.name` | Implemented | |
| 10 | `job-info-banner.html` uses `cvDocument.name` for the guard, `aria-label` and text | Implemented | |
| 10 | `upload-cv.html` unchanged | Implemented | Not modified |
| 11 | `CvApiService.renameCv`; `createManualCv` accepts `CreateManualCvRequest`; `getStructuredData` returns `CvStructuredDataResponse` | Implemented | |
| — | Shared types: `name` on `CvDocument`/`UploadCvResponse`/`CvDocumentListItem` (+ `updatedAt`), `cvDocument.name` on the job application types, `RenameCvRequest`, `CreateManualCvRequest`, `CvStructuredDataResponse` | Implemented | Plus the `DEFAULT_CV_NAME` and `CV_NAME_MAX_LENGTH` constants from the plan |
| — | `getSourceLabel` helper with unit test | Implemented | `shared/utils.ts` / `utils.spec.ts` |
| — | Backend tests (`cv.service`, `cv.controller`, `cv-request.dto`, job-application specs) | Implemented | 370/370 passed in the review run |
| — | Frontend tests (utils, cv-api, rename dialog, cv-file-list, dashboard, cv-builder, optimization-list, job-info-banner, fixture updates) | Implemented | Spec files were added or updated. The full run in `05-code-review.md` did not complete (`ENOSPC`); 436/436 executed tests passed |

## Files

### Created (6)

- `apps/opticv-be/prisma/migrations/20261118120000_cv_document_name/migration.sql`
- `apps/opticv-web/src/app/core/guards/unsaved-changes.guard.ts`
- `apps/opticv-web/src/app/core/guards/unsaved-changes.guard.spec.ts`
- `apps/opticv-web/src/app/features/dashboard/components/rename-cv-dialog/rename-cv-dialog.ts`
- `apps/opticv-web/src/app/features/dashboard/components/rename-cv-dialog/rename-cv-dialog.html`
- `apps/opticv-web/src/app/features/dashboard/components/rename-cv-dialog/rename-cv-dialog.spec.ts`

### Modified (43)

**Backend**

- `apps/opticv-be/prisma/schema.prisma`
- `apps/opticv-be/src/app/cv/cv.controller.ts`, `cv.controller.spec.ts`
- `apps/opticv-be/src/app/cv/cv.service.ts`, `cv.service.spec.ts`
- `apps/opticv-be/src/app/cv/dto/cv-request.dto.ts`, `cv-request.dto.spec.ts`
- `apps/opticv-be/src/app/cv/dto/cv-response.dto.ts`
- `apps/opticv-be/src/app/job-application/dto/job-application-response.dto.ts`
- `apps/opticv-be/src/app/job-application/job-application.service.ts`, `job-application.service.spec.ts`, `job-application.controller.spec.ts`

**Shared**

- `packages/shared/datatypes/src/lib/datatypes.ts`, `datatypes.spec.ts`

**Frontend** (paths under `apps/opticv-web/src/app/`)

- `app.routes.ts`, `app.routes.server.ts`
- `core/services/cv-api.service.ts`, `cv-api.service.spec.ts`
- `core/services/job-application-api.service.spec.ts`
- `features/cv-builder/cv-builder.ts`, `.html`, `.css`, `.spec.ts`
- `features/cv-optimization/components/job-info-banner/job-info-banner.html`, `.spec.ts`
- `features/cv-optimization/components/job-upload/job-upload.html`, `.spec.ts`
- `features/cv-optimization/cv-optimization.spec.ts`
- `features/dashboard/components/cv-file-list/cv-file-list.ts`, `.html`, `.spec.ts`
- `features/dashboard/components/optimization-list/optimization-list.html`, `.spec.ts`
- `features/dashboard/dashboard.ts`, `.html`, `.spec.ts`
- `features/home/home.spec.ts`
- `features/upload-cv/upload-cv.spec.ts`
- `features/upload-cv/services/cv-upload-api.service.spec.ts`
- `layout/top-header/top-header.ts`, `top-header.spec.ts`
- `shared/utils.ts`, `utils.spec.ts`

## Components

| Component (from plan) | Status | Location |
| --- | --- | --- |
| `RenameCvDialog` (new) | Exist | `features/dashboard/components/rename-cv-dialog/` |
| `CvFileList` (modified; `renameCvFile` output) | Exist | `features/dashboard/components/cv-file-list/` |
| `Dashboard` (modified; `renameTarget`, `renaming`, `openRenameDialog`, `closeRenameDialog`, `renameCv`) | Exist | `features/dashboard/` |
| `CvBuilder` (modified; `name`, `originalName`, `trimmedName`, `nameError`) | Exist | `features/cv-builder/` |
| `JobUpload` / `OptimizationList` / `JobInfoBanner` (label swaps) | Exist | as listed in Files |
| Backend `CvController.renameCv` / `CvService.renameCv` | Exist | `apps/opticv-be/src/app/cv/` |
| DTOs `CreateManualCvRequestDto`, `RenameCvDto`, `CvStructuredDataResponseDto` | Exist | `apps/opticv-be/src/app/cv/dto/` |

## Stores

| Store (from plan) | Status | Note |
| --- | --- | --- |
| `CvStore` (`cvList`, `updateCvList`) | Exist | Code unchanged. Updated from `Dashboard.renameCv` and `CvBuilder.syncCvStore` |

## Deviations

1. The builder CV name field is rendered at the top of `.builder-form` (`cv-builder.html`), not inside `.builder-header`. The plan's `.builder-header { flex-wrap: wrap }` / `flex: 1` styles were not added; `.builder-name-field` and `.builder-name-error` styles were.
2. The icon for built CVs is `pi pi-file-edit`; the plan named `pi pi-hammer`.
3. The Rename dialog form uses `(submit)="onFormSubmit($event)"` with `preventDefault()`; the plan named `(ngSubmit)="submit()"`.
4. The Rename dialog's `maxlength` is bound as `[attr.maxlength]="maxLength"` (constant `CV_NAME_MAX_LENGTH`) rather than a literal `maxlength="100"`. The builder input works the same way (`[attr.maxlength]="nameMaxLength"`).
5. `buildCvNameFromFileName` also trims whitespace after stripping the extension. The spec, the plan and the migration backfill do not trim.
6. A shared `getErrorMessage(err, fallback)` helper was added to `shared/utils.ts`. It implements Integration Check gap 2 (joins array messages) and is used by `Dashboard.renameCv` and `CvBuilder.save`.
7. In the builder header, the Save button no longer has `icon="pi pi-check"` and now has `size="small"`. Save sits in a new `.builder-actions` wrapper together with a Cancel button.
8. `job-application.service.ts` contains formatting-only line reflows in addition to the two `select` changes.

## Additional Implementation

> Additional implementation not covered by the original documents.

1. **Unsaved-changes guard.** New `unsavedChangesGuard` (`CanDeactivateFn<HasUnsavedChanges>`) in `core/guards/unsaved-changes.guard.ts` with a spec. It always allows navigation to `/login`. It is registered as `canDeactivate` on both `cv-builder` routes in `app.routes.ts`.
2. **CV builder dirty tracking.**
   - `CvBuilder` implements `HasUnsavedChanges`.
   - A JSON snapshot of `{ name, cv }` (`savedSnapshot` / `currentSnapshot` / `hasUnsavedChanges`) is taken on init (new CV), after load (edit) and after a successful save.
   - `canDeactivate()` shows a PrimeNG confirm dialog (`key="unsaved-changes"`, "Discard changes?", Discard changes / Keep editing). `ConfirmationService` is provided at component level.
   - A `(window:beforeunload)` host listener calls `preventDefault()` when there are unsaved changes.
3. **CV builder Cancel button.** `cancel()` calls `location.back()` when there was a previous in-app navigation, and otherwise navigates to `/dashboard`. It is disabled while saving.
4. **Top header menu item.** "CV Builder" (`/cv-builder`) was added to the navigation menu in `layout/top-header/top-header.ts`, with spec updates.
5. **Server render mode.** `cv-builder/:id` and `cv-builder` were added to `app.routes.server.ts` with `RenderMode.Client`.
