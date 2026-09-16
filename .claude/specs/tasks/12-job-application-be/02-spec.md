# Task Specification

## Source

Azure DevOps Task: 12-job-application-be

## Goal

Implement a `JobApplicationModule` in the NestJS backend with full CRUD endpoints for job applications, plus a dedicated endpoint to update the ATS score. All endpoints are scoped to the authenticated user.

## Context

The `job_applications` table already exists in the database and is modelled in the Prisma schema as `JobApplication`. The module lives under `apps/opticv-be/src/app/job-application/`. It follows the same structural pattern as `CvModule`: a NestJS module, a controller behind `SupabaseGuard`, and a service injecting `PrismaService`.

The `JobApplication` model fields:
- `id` — UUID PK
- `userId` — FK to `users`
- `cvDocumentId` — FK to `cv_documents`
- `jobTitle` — `String?` (will be required at API level)
- `companyName` — `String?` (will be required at API level)
- `jobDescription` — `String` (required)
- `atsScore` — `Int?`
- `notes` — `String?`
- `createdAt`, `updatedAt`

## Scope

### In scope

- `POST /api/job-applications` — create a job application
- `GET /api/job-applications` — list all job applications for the authenticated user (with optional pagination)
- `GET /api/job-applications/:id` — get a single job application
- `PATCH /api/job-applications/:id` — update editable fields of a job application
- `PATCH /api/job-applications/:id/ats-score` — update only the ATS score
- `DELETE /api/job-applications/:id` — delete a job application
- Shared types added to `@opticv/datatypes`

### Out of scope

- Optimization result endpoints
- Any frontend changes
- Changes to the Prisma schema (no migration needed — table already exists)

## Behavior

### POST /api/job-applications

1. Validate request body with a `CreateJobApplicationDto` (class-validator):
   - `cvDocumentId` — required, string (UUID)
   - `jobTitle` — required, non-empty string
   - `companyName` — required, non-empty string
   - `jobDescription` — required, non-empty string
   - `notes` — optional, string
2. Verify the `cvDocumentId` exists and belongs to the authenticated user. If the CV is not found or belongs to another user, throw `NotFoundException('CV document not found.')`.
3. Create the `JobApplication` record with `userId` set from the authenticated user.
4. Return `201 Created` with the created `JobApplicationResponse` shape.

### GET /api/job-applications

1. Accept optional query params: `limit` (integer, default none / return all) and `offset` (integer, default 0).
2. When `limit` is provided, apply `take`/`skip` to the Prisma query.
3. Return a `JobApplicationListResponse` shape:
   ```
   { data: JobApplicationListItem[], total: number }
   ```
   `total` is always the full count for the current user (not just the page).
4. Order by `createdAt` descending.

### GET /api/job-applications/:id

1. Find the `JobApplication` by `id`.
2. If not found or `userId` does not match the authenticated user, throw `NotFoundException('Job application not found.')`.
3. Return `200 OK` with the full `JobApplicationResponse` shape.

### PATCH /api/job-applications/:id

1. Validate request body with `UpdateJobApplicationDto` (all fields optional):
   - `cvDocumentId` — optional string (UUID)
   - `jobTitle` — optional non-empty string
   - `companyName` — optional non-empty string
   - `jobDescription` — optional non-empty string
   - `notes` — optional string (allow null to clear)
2. Verify the application exists and belongs to the authenticated user (NotFoundException if not).
3. If `cvDocumentId` is provided, verify the new CV exists and belongs to the authenticated user.
4. Apply partial update via `prisma.jobApplication.update`.
5. Return `200 OK` with the updated `JobApplicationResponse`.

### PATCH /api/job-applications/:id/ats-score

1. Validate request body with `UpdateAtsScoreDto`:
   - `atsScore` — required, integer, min 0, max 100
2. Verify the application exists and belongs to the authenticated user.
3. Update only the `atsScore` field.
4. Return `200 OK` with the updated `JobApplicationResponse`.

### DELETE /api/job-applications/:id

1. Verify the application exists and belongs to the authenticated user (NotFoundException if not).
2. Delete the record.
3. Return `204 No Content`.

## Edge Cases

- `cvDocumentId` referencing another user's CV → `NotFoundException('CV document not found.')` (do not reveal it exists)
- `id` param referencing another user's application → `NotFoundException('Job application not found.')`
- `atsScore` outside 0–100 → `400 Bad Request` via class-validator
- `limit` or `offset` non-integer or negative → `400 Bad Request` via class-validator (use `ParseIntPipe` / `@IsInt @Min(0)`)
- Empty body on `PATCH /api/job-applications/:id` — valid, no-op update (Prisma `update` with empty data is fine)

## Data / API

### Shared types to add to `packages/shared/datatypes/src/lib/datatypes.ts`

```ts
export type JobApplication = {
  id: string;
  userId: string;
  cvDocumentId: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  atsScore: number | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type JobApplicationResponse = JobApplication;

export type JobApplicationListItem = Pick<
  JobApplication,
  | 'id'
  | 'userId'
  | 'cvDocumentId'
  | 'jobTitle'
  | 'companyName'
  | 'atsScore'
  | 'createdAt'
  | 'updatedAt'
>;

export type JobApplicationListResponse = {
  data: JobApplicationListItem[];
  total: number;
};
```

### DTOs (backend only, not shared)

**`CreateJobApplicationDto`**
```ts
{ cvDocumentId: string; jobTitle: string; companyName: string; jobDescription: string; notes?: string }
```

**`UpdateJobApplicationDto`** (all optional)
```ts
{ cvDocumentId?: string; jobTitle?: string; companyName?: string; jobDescription?: string; notes?: string | null }
```

**`UpdateAtsScoreDto`**
```ts
{ atsScore: number } // integer, 0–100
```

**`JobApplicationQueryDto`**
```ts
{ limit?: number; offset?: number }
```

### New files

```
apps/opticv-be/src/app/job-application/
  job-application.module.ts
  job-application.controller.ts
  job-application.controller.spec.ts
  job-application.service.ts
  job-application.service.spec.ts
  dto/
    create-job-application.dto.ts
    update-job-application.dto.ts
    update-ats-score.dto.ts
    job-application-query.dto.ts
```

### Module registration

Add `JobApplicationModule` to the `imports` array in `apps/opticv-be/src/app/app.module.ts`.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-be`)
- Unit tests added for `JobApplicationService` (all happy paths + ownership/not-found errors)
- Unit tests added for `JobApplicationController`
- No breaking changes to existing modules
- `@opticv/datatypes` builds successfully with new types
- All endpoints protected by `SupabaseGuard`
- Ownership check performed on every endpoint that takes an `:id` param
