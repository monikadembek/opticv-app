# Implementation Done — 117-implement-cv-builder

Inputs: `02-spec.md`, `03-spec-review.md` (**PASS WITH ISSUES**), `04-implementation-plan.md`, `05-code-review.md`.

Scope of changed code: full branch diff `337224b..HEAD` (branch `117-cv-builder` vs. its `dev` merge base), including the post-review fix commit `19355a6`. `HEAD~1..HEAD` covers only the post-review fixes and so does not represent the whole task.

## Summary

Delivered a CV Builder feature:
- A lazy-loaded `cv-builder` page (`/cv-builder` for create, `/cv-builder/:id` for edit) with an accordion form covering every `CvStructuredData` section and a live `CvA4Preview`.
- Backend endpoints `POST /cv/manual` (gated by the new `CV_BUILDER` quota) and `PATCH /cv/:id/structured-data`.
- A Prisma migration that makes the file fields nullable and adds `manuallyEdited`.
- A re-extraction guard (`MANUAL_EDIT_PROTECTED`).
- Dashboard "Create CV" and "Edit" entry points, with Download hidden for CVs that have no file.

After the code review (`05-code-review.md`):
- The re-extraction guard was moved below the cache-hit return, so builder-created and builder-edited CVs can be optimized.
- `JobUpload` now shows an error and resets its loading state when CV data extraction fails.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Migration: `storageKey`, `fileName`, `fileSize`, `mimeType` nullable | Implemented | `20260825151358_cv_builder_nullable_file_fields/migration.sql` |
| `CvDocument.manuallyEdited Boolean @default(false)` | Implemented | Schema, migration, shared type |
| Builder CVs: `parseStatus` / `extractionStatus` = `COMPLETED` | Implemented | `CvService.createManualCv` |
| `POST /cv/manual` creates `CvDocument` from `CvStructuredData` | Implemented | `CvController.createManualCv` → `CvService.createManualCv` |
| `POST /cv/manual` gated by `QuotaService.checkAndConsume(..., 'CV_BUILDER', ...)` | Implemented | Via `resolveTierAndPeriod` in `CvService` |
| `PATCH /cv/:id/structured-data` updates in place, ownership check, no quota | Implemented | Non-owner → `404 NotFoundException` |
| PATCH sets `manuallyEdited = true` | Implemented | |
| `LimitedFeature` `CV_BUILDER`; `TIER_LIMITS` FREE 1 / BASIC 5 / PRO 10 | Implemented | `datatypes.ts`, Prisma `LimitedFeature` enum |
| Re-extraction guard: `POST /cv/:id/extract` → `403 MANUAL_EDIT_PROTECTED` when `manuallyEdited` | Implemented | Fires only when extraction would run; stored data is still returned (post-review fix) |
| Frontend hides/disables extract action for manually edited CVs | Implemented | No standalone extract action exists in the UI; `manuallyEdited` is exposed on `CvDocumentListItem` |
| `CvStructuredDataDto` drift fix (`gdprClause`, `other`) | Implemented | `gdprClause` added; `other` was already present |
| Lazy-loaded `cv-builder` feature, routes `/cv-builder` and `/cv-builder/:id` behind `authGuard` | Implemented | `app.routes.ts` |
| Accordion form using `SectionCard`, full `CvStructuredData` parity (Contact, Summary, Experience + bullets, Education, Skills, Certifications, Projects, Languages, Other, GDPR) | Implemented | `cv-builder.html` + `ExperienceSection`, `EducationSection` |
| Live A4 preview via `CvA4Preview` | Implemented | `CvA4Preview` measurement logic was modified (see Deviations) |
| GDPR clause: same checkbox UI and `includeGdprClause` / `originalGdprClause` / `DEFAULT_GDPR_CLAUSE` logic | Implemented | `CvBuilder.computeGdprClause()` |
| Dashboard "Create CV" action → `/cv-builder` | Implemented | Header button in `dashboard.html`; empty-state button in `cv-file-list.html` |
| Dashboard "Edit" row action → `/cv-builder/:id` | Implemented | Disabled when `extractionStatus !== 'COMPLETED'` |
| Template/export gating identical for builder CVs | Implemented | No special-casing added |
| Quota errors from `POST /cv/manual` surfaced via existing pattern | Implemented | Global quota interceptor; builder skips duplicate toast for quota codes |
| `CvStore` updated after create/edit | Implemented | `CvBuilder.syncCvStore()` via `updateCvList()` |
| Edit flow fetches via `GET /cv/:id/structured-data`; load error handled | Implemented | `loadError` state with "Back to Dashboard" |
| Save → toast confirmation | Implemented | Success toast, then navigation to `/dashboard` |
| Download hidden when `storageKey === null` | Implemented | `@if (file.storageKey)` in `cv-file-list.html` |
| Existing download/delete paths handle nullable `storageKey` | Implemented | `getDownloadUrl` → 404; `deleteCv` and account deletion skip R2 delete |
| Unit tests: `POST /cv/manual` (success, quota exceeded, feature not available) | Implemented | `cv.service.spec.ts`, `cv.controller.spec.ts` |
| Unit tests: `PATCH /cv/:id/structured-data` (success, ownership failure) | Implemented | `cv.service.spec.ts`, `cv.controller.spec.ts` |
| Unit tests: re-extraction guard | Implemented | `cv-extraction.service.spec.ts` (guard + stored-data return for edited CV) |
| Builder-created/edited CV flows into optimization unchanged | Implemented | Post-review fix in `cv-extraction.service.ts` |
| AXE / WCAG AA on builder form | Implemented | Labels and ARIA names on form controls; focus moving to new entry after "Add" (plan 8.5) is not implemented |

## Files

### Created

- `apps/opticv-be/prisma/migrations/20260825151358_cv_builder_nullable_file_fields/migration.sql`
- `apps/opticv-be/src/app/cv/dto/cv-request.dto.ts`
- `apps/opticv-be/src/app/cv/dto/cv-request.dto.spec.ts`
- `apps/opticv-web/src/app/features/cv-builder/cv-builder.ts`
- `apps/opticv-web/src/app/features/cv-builder/cv-builder.html`
- `apps/opticv-web/src/app/features/cv-builder/cv-builder.css`
- `apps/opticv-web/src/app/features/cv-builder/cv-builder.spec.ts`
- `apps/opticv-web/src/app/features/cv-builder/models.ts`
- `apps/opticv-web/src/app/features/cv-builder/components/experience-section/experience-section.ts` (+ `.html`, `.css`, `.spec.ts`)
- `apps/opticv-web/src/app/features/cv-builder/components/education-section/education-section.ts` (+ `.html`, `.css`, `.spec.ts`)
- `.claude/specs/tasks/117-implement-cv-builder/05-code-review.md`
- `docs/cv-builer-research.md`
- `docs/cv-naming-plan.md`
- `docs/cv-archive-on-delete-plan.md`

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/prisma/schema.prisma`
- `apps/opticv-be/src/app/cv/cv.controller.ts`, `cv.controller.spec.ts`
- `apps/opticv-be/src/app/cv/cv.module.ts`
- `apps/opticv-be/src/app/cv/cv.service.ts`, `cv.service.spec.ts`
- `apps/opticv-be/src/app/cv/dto/cv-response.dto.ts`
- `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts`, `cv-extraction.service.spec.ts`
- `apps/opticv-be/src/app/users/users.service.ts`
- `apps/opticv-web/src/app/app.routes.ts`
- `apps/opticv-web/src/app/core/services/cv-api.service.ts`, `cv-api.service.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts`, `job-upload.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`, `cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/dashboard/dashboard.html`, `dashboard.ts`, `dashboard.spec.ts`
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html`, `cv-file-list.ts`, `cv-file-list.spec.ts`
- `apps/opticv-web/src/app/features/home/home.spec.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/upload-cv/upload-cv.html`, `upload-cv.ts`
- `apps/opticv-web/src/app/shared/constants.ts`
- `docs/tasks-list.md`
- `docs/landing-page-and-hosting-research.md`

## Components

| Component (from plan) | Status |
| --- | --- |
| `CvBuilder` (`features/cv-builder/cv-builder.ts`) | Exist |
| `ExperienceSection` (`cv-builder/components/experience-section`) | Exist |
| `EducationSection` (`cv-builder/components/education-section`) | Exist |
| `SectionCard` (reused from `cv-optimization`) | Exist |
| `CvA4Preview` (reused from `cv-optimization`) | Exist |
| `CvFileList` — `editCv()`, Edit button, conditional Download, empty-state "Create CV" | Exist |
| `Dashboard` — header "Create CV" button | Exist |

## Stores

| Store (from plan) | Status |
| --- | --- |
| `CvStore` (`core/stores/cv.store.ts`) — reused unchanged via `updateCvList()` (plan 5.2: no new methods) | Exist |

## Deviations

- `CvA4Preview` was modified (effect-driven `doMeasure()` on every input change, an unconditional ResizeObserver re-measure, and a `document.fonts` guard). Spec and plan 8.3 say "unmodified".
- `cv-request.dto.ts` uses class-validator decorators (`@IsOptional`, `@IsString`, `@IsArray`, `@ValidateNested`, `@Type`). Plan 2.1 stated no class-validator decorators were required.
- A separate `CvDocumentDto` was added to `cv-response.dto.ts` as the response type for the new endpoints.
- `CvService.resolveTierAndPeriod` is implemented as a private method in `CvService` rather than shared with `OptimizationService`.
- Skills are entered as one comma-separated text field (`skillsText` signal + `skills` computed).
- Certifications, Projects and Languages are inline `@for` blocks in `cv-builder.html` (as planned). Experience and Education use `model.required()`-based sub-components.
- Template-driven bindings (`FormsModule`, `[ngModel]` / `(ngModelChange)`) are used for form inputs, with signals as the state.
- Focus is not moved to the first field of a newly added entry (plan 8.5).
- `models.ts` defines `CvBuilderMode`, but it is not imported anywhere.
- Re-extraction guard position: placed after the cache-hit return in `extractStructuredData` (post-review). Plan 2.6 specified "immediately after the existing ownership check".
- Plan 1.3 specified `prisma migrate dev`. The migration exists as `20260825151358_cv_builder_nullable_file_fields`.

## Additional Implementation

> Additional implementation not covered by the original documents.

- `cv-extraction.service.ts`: `BadRequestException` when `storageKey` or `fileName` is missing before extraction runs.
- `users.service.ts`: account deletion skips the R2 delete for CVs with no `storageKey`.
- `upload-cv.ts` / `upload-cv.html`: null-safe handling of `fileSize` / `mimeType`.
- `CV_BUILDER` labels added in `shared/constants.ts`, `settings.ts` and `cv-optimization.ts` (`FEATURE_LABELS` maps).
- `cv-request.dto.spec.ts`: validation tests for the request DTO.
- `job-upload.ts`: the extraction-failure handler now sets `submitError` and resets `isSubmitting` (post-review). Two new tests in `job-upload.spec.ts`.
- `cv-extraction.service.spec.ts`: test that a manually edited CV with stored data returns that data without an AI call (post-review).
- `docs/tasks-list.md`: new bug ticket "Start Optimization Process leaves orphan job applications, retries non-retryable errors and can get stuck loading".
- `docs/cv-naming-plan.md`: plan for a `name` column and a unified "My CVs" table (follow-up, not implemented).
- `docs/cv-archive-on-delete-plan.md`, `docs/cv-builer-research.md`, `docs/landing-page-and-hosting-research.md`: documentation changes on the branch.
