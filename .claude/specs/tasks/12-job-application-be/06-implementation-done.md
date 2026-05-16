# Implementation Done

Task ID: 12-job-application-be
Date: 2026-05-16

---

## Summary

`JobApplicationModule` has been delivered with full CRUD endpoints (`POST`, `GET`, `GET :id`, `PATCH :id`, `PATCH :id/ats-score`, `DELETE :id`), ownership validation, pagination, shared types in `@opticv/datatypes`, and unit tests for both service and controller. The module is registered in `AppModule`.

---

## Specification Coverage

### Endpoints

| Requirement | Status | Note |
|---|---|---|
| `POST /api/job-applications` — create a job application | Implemented | |
| `GET /api/job-applications` — list all for authenticated user | Implemented | |
| `GET /api/job-applications` — optional `limit` and `offset` pagination | Implemented | |
| `GET /api/job-applications/:id` — get a single job application | Implemented | |
| `PATCH /api/job-applications/:id` — update editable fields | Implemented | |
| `PATCH /api/job-applications/:id/ats-score` — update only ATS score | Implemented | |
| `DELETE /api/job-applications/:id` — delete a job application | Implemented | |
| All endpoints protected by `SupabaseGuard` | Implemented | |
| Ownership check on every `:id` endpoint | Implemented | |

### POST /api/job-applications

| Requirement | Status | Note |
|---|---|---|
| Validate body with `CreateJobApplicationDto` | Implemented | |
| `cvDocumentId` — required, string | Implemented | |
| `jobTitle` — required, non-empty string | Implemented | |
| `companyName` — required, non-empty string | Implemented | |
| `jobDescription` — required, non-empty string | Implemented | |
| `notes` — optional string | Implemented | |
| Verify `cvDocumentId` exists and belongs to authenticated user | Implemented | via `assertCvOwnership` private method |
| Throw `NotFoundException('CV document not found.')` if CV not found or belongs to another user | Implemented | |
| Return `201 Created` with `JobApplicationResponse` | Implemented | |

### GET /api/job-applications

| Requirement | Status | Note |
|---|---|---|
| Accept optional `limit` (integer) and `offset` (integer) query params | Implemented | |
| Apply `take`/`skip` when `limit`/`offset` provided | Implemented | |
| Return `{ data: JobApplicationListItem[], total: number }` | Implemented | |
| `total` is full count for the user, not just the page | Implemented | via `Promise.all` with `count` + `findMany` |
| Order by `createdAt` descending | Implemented | |

### GET /api/job-applications/:id

| Requirement | Status | Note |
|---|---|---|
| Return record when found and user matches | Implemented | |
| Throw `NotFoundException('Job application not found.')` when not found or wrong user | Implemented | |
| Return `200 OK` with full `JobApplicationResponse` | Implemented | |

### PATCH /api/job-applications/:id

| Requirement | Status | Note |
|---|---|---|
| Validate body with `UpdateJobApplicationDto` (all fields optional) | Implemented | |
| `cvDocumentId` — optional string | Implemented | |
| `jobTitle` — optional non-empty string | Implemented | |
| `companyName` — optional non-empty string | Implemented | |
| `jobDescription` — optional non-empty string | Implemented | |
| `notes` — optional string, allow null to clear | Implemented | typed as `string \| null` |
| Verify application exists and belongs to user | Implemented | |
| Verify new `cvDocumentId` ownership if provided | Implemented | |
| Apply partial update via `prisma.jobApplication.update` | Implemented | |
| Return `200 OK` with updated `JobApplicationResponse` | Implemented | |

### PATCH /api/job-applications/:id/ats-score

| Requirement | Status | Note |
|---|---|---|
| Validate body with `UpdateAtsScoreDto` | Implemented | |
| `atsScore` — required, integer, min 0, max 100 | Implemented | |
| Verify application exists and belongs to user | Implemented | |
| Update only `atsScore` field | Implemented | |
| Return `200 OK` with updated `JobApplicationResponse` | Implemented | |

### DELETE /api/job-applications/:id

| Requirement | Status | Note |
|---|---|---|
| Verify application exists and belongs to user | Implemented | |
| Delete the record | Implemented | |
| Return `204 No Content` | Implemented | |

### Edge Cases

| Requirement | Status | Note |
|---|---|---|
| `cvDocumentId` referencing another user's CV → `NotFoundException('CV document not found.')` | Implemented | |
| `id` referencing another user's application → `NotFoundException('Job application not found.')` | Implemented | |
| `atsScore` outside 0–100 → `400 Bad Request` | Implemented | via `@Min(0) @Max(100)` |
| `limit` or `offset` non-integer or negative → `400 Bad Request` | Implemented | via `@IsInt @Min` with `@Type(() => Number)` |
| Empty body on `PATCH /:id` — valid no-op update | Implemented | |

### Shared Types

| Requirement | Status |
|---|---|
| `JobApplication` type added to `@opticv/datatypes` | Implemented |
| `JobApplicationResponse` type added | Implemented |
| `JobApplicationListItem` type added | Implemented |
| `JobApplicationListResponse` type added | Implemented |

### Module Registration

| Requirement | Status |
|---|---|
| `JobApplicationModule` added to `AppModule` imports | Implemented |

### Acceptance

| Requirement | Status |
|---|---|
| Unit tests for `JobApplicationService` (happy paths + ownership/not-found errors) | Implemented |
| Unit tests for `JobApplicationController` | Implemented |
| All endpoints protected by `SupabaseGuard` | Implemented |
| Ownership check on every `:id` endpoint | Implemented |

---

## Files

### Created

| File | Purpose |
|---|---|
| `apps/opticv-be/src/app/job-application/dto/create-job-application.dto.ts` | Create DTO with class-validator decorators |
| `apps/opticv-be/src/app/job-application/dto/update-job-application.dto.ts` | Update DTO (all fields optional) |
| `apps/opticv-be/src/app/job-application/dto/update-ats-score.dto.ts` | ATS score DTO with `@Min(0) @Max(100)` |
| `apps/opticv-be/src/app/job-application/dto/job-application-query.dto.ts` | Pagination query DTO with `@Type(() => Number)` coercion |
| `apps/opticv-be/src/app/job-application/job-application.service.ts` | Service with all CRUD methods and ownership validation |
| `apps/opticv-be/src/app/job-application/job-application.service.spec.ts` | Service unit tests |
| `apps/opticv-be/src/app/job-application/job-application.controller.ts` | HTTP controller with all 6 route handlers |
| `apps/opticv-be/src/app/job-application/job-application.controller.spec.ts` | Controller unit tests |
| `apps/opticv-be/src/app/job-application/job-application.module.ts` | NestJS module |

### Modified

| File | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Appended `JobApplication`, `JobApplicationResponse`, `JobApplicationListItem`, `JobApplicationListResponse` types |
| `apps/opticv-be/src/app/app.module.ts` | Added `JobApplicationModule` to imports |
| `apps/opticv-be/src/main.ts` | Added `ValidationPipe` with `{ whitelist: true, transform: true }` as global pipe |

---

## Components

| Component | Status |
|---|---|
| `CreateJobApplicationDto` | Exist |
| `UpdateJobApplicationDto` | Exist |
| `UpdateAtsScoreDto` | Exist |
| `JobApplicationQueryDto` | Exist |
| `JobApplicationService` | Exist |
| `JobApplicationController` | Exist |
| `JobApplicationModule` | Exist |

---

## Stores

None planned. Not applicable.

---

## Deviations from Plan

| Deviation |
|---|
| `main.ts` was modified to add a global `ValidationPipe` with `{ whitelist: true, transform: true }`. This file is not listed in the plan's Files to create / modify table, but the change is required for DTO validation and `@Type(() => Number)` coercion to work at runtime. |
| `JobApplication.jobTitle` and `JobApplication.companyName` are typed as `string \| null` in the shared types (matching the Prisma schema where these columns are nullable), whereas the spec described them as `string` (required at API level). The DTOs enforce non-empty strings on input, but the shared type reflects the DB nullable reality. |

---

## Additional Implementation

`assertCvOwnership` private method extracted in `JobApplicationService` to deduplicate CV ownership validation used by both `create` and `update`. This is an internal refactor not mentioned in the plan but does not change external behavior.
