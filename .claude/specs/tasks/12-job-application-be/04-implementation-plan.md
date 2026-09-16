# Implementation Plan

Task ID: 12-job-application-be
Date: 2026-05-16

---

## Pre-implementation notes (from spec review)

The following open points from the review are resolved as follows before implementation:

- **`JobApplicationListItem` omits `notes`** — intentional; the list view is a lightweight summary. `notes` and `jobDescription` are only returned on the single-item endpoint.
- **`offset` without `limit`** — `offset` without `limit` applies `skip` but returns all remaining records (no `take` applied).
- **`atsScore` reset to `null`** — not in scope. The dedicated ATS endpoint requires the value; `null` is the default and is set only by the DB. Clearing is out of scope for this task.
- **Route order** — `PATCH /:id/ats-score` must be declared before `PATCH /:id` in the controller class to avoid NestJS matching `ats-score` as an `:id` value.

---

## Step 1 — Add shared types to `@opticv/datatypes`

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Append the following types at the end of the file:

```ts
export type JobApplication = { ... }
export type JobApplicationResponse = JobApplication;
export type JobApplicationListItem = Pick<JobApplication, 'id' | 'userId' | 'cvDocumentId' | 'jobTitle' | 'companyName' | 'atsScore' | 'createdAt' | 'updatedAt'>;
export type JobApplicationListResponse = { data: JobApplicationListItem[]; total: number };
```

Fields for `JobApplication`:
- `id: string`
- `userId: string`
- `cvDocumentId: string`
- `jobTitle: string`
- `companyName: string`
- `jobDescription: string`
- `atsScore: number | null`
- `notes: string | null`
- `createdAt: Date | string`
- `updatedAt: Date | string`

---

## Step 2 — Create DTOs

**Directory:** `apps/opticv-be/src/app/job-application/dto/`

### 2a. `create-job-application.dto.ts`

Fields with class-validator decorators:
- `cvDocumentId` — `@IsString() @IsNotEmpty()`
- `jobTitle` — `@IsString() @IsNotEmpty()`
- `companyName` — `@IsString() @IsNotEmpty()`
- `jobDescription` — `@IsString() @IsNotEmpty()`
- `notes` — `@IsString() @IsOptional()`

### 2b. `update-job-application.dto.ts`

All fields optional (use `@IsOptional()` on each):
- `cvDocumentId` — `@IsString() @IsNotEmpty() @IsOptional()`
- `jobTitle` — `@IsString() @IsNotEmpty() @IsOptional()`
- `companyName` — `@IsString() @IsNotEmpty() @IsOptional()`
- `jobDescription` — `@IsString() @IsNotEmpty() @IsOptional()`
- `notes` — `@IsString() @IsOptional()` — also allow `null`: add `@Transform(({ value }) => value ?? null)` or simply type as `string | null`; use `@IsNullable()` or `@ValidateIf(o => o.notes !== null)`

### 2c. `update-ats-score.dto.ts`

- `atsScore` — `@IsInt() @Min(0) @Max(100)`

### 2d. `job-application-query.dto.ts`

- `limit` — `@IsInt() @Min(1) @IsOptional() @Type(() => Number)` — use `@Type` from `class-transformer` to coerce query string to number
- `offset` — `@IsInt() @Min(0) @IsOptional() @Type(() => Number)`

---

## Step 3 — Create `JobApplicationService`

**File:** `apps/opticv-be/src/app/job-application/job-application.service.ts`

Inject `PrismaService` via constructor (matching existing module pattern).

### Method: `create(dto, userId)`

1. Query `prisma.cvDocument.findUnique({ where: { id: dto.cvDocumentId } })`.
2. If `null` or `cvDocument.userId !== userId` → throw `NotFoundException('CV document not found.')`.
3. `prisma.jobApplication.create({ data: { ...dto, userId } })`.
4. Return the created record.

### Method: `findAll(userId, query)`

1. Run two Prisma calls in parallel (`Promise.all`):
   - `prisma.jobApplication.count({ where: { userId } })`
   - `prisma.jobApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: query.limit, skip: query.offset, select: { id, userId, cvDocumentId, jobTitle, companyName, atsScore, createdAt, updatedAt } })`
   - When `query.limit` is `undefined`, omit `take` from the query (do not pass `undefined` explicitly — destructure to avoid it).
2. Return `{ data, total }`.

### Method: `findOne(id, userId)`

1. `prisma.jobApplication.findUnique({ where: { id } })`.
2. If `null` or `record.userId !== userId` → throw `NotFoundException('Job application not found.')`.
3. Return the record.

### Method: `update(id, dto, userId)`

1. Call `findOne(id, userId)` to assert existence and ownership.
2. If `dto.cvDocumentId` is present, validate it the same way as in `create` (findUnique + ownership check).
3. `prisma.jobApplication.update({ where: { id }, data: dto })`.
4. Return the updated record.

### Method: `updateAtsScore(id, dto, userId)`

1. Call `findOne(id, userId)` to assert existence and ownership.
2. `prisma.jobApplication.update({ where: { id }, data: { atsScore: dto.atsScore } })`.
3. Return the updated record.

### Method: `remove(id, userId)`

1. Call `findOne(id, userId)` to assert existence and ownership.
2. `prisma.jobApplication.delete({ where: { id } })`.
3. Return `void`.

---

## Step 4 — Create `JobApplicationController`

**File:** `apps/opticv-be/src/app/job-application/job-application.controller.ts`

- Decorate class with `@Controller('job-applications')` and `@UseGuards(SupabaseGuard)`.
- Inject `JobApplicationService` via constructor.
- Use `@CurrentUser()` decorator to extract the authenticated user.
- Use `@Body()` with DTO classes for request validation.
- Use `@Query()` with `JobApplicationQueryDto` for the list endpoint.

### Route declarations (in this exact order to avoid `:id` matching `ats-score`):

1. `@Post()` `@HttpCode(201)` → `create(@Body() dto: CreateJobApplicationDto, @CurrentUser() user)`
2. `@Get()` → `findAll(@Query() query: JobApplicationQueryDto, @CurrentUser() user)`
3. `@Get(':id')` → `findOne(@Param('id') id: string, @CurrentUser() user)`
4. `@Patch(':id/ats-score')` `@HttpCode(200)` → `updateAtsScore(@Param('id') id, @Body() dto: UpdateAtsScoreDto, @CurrentUser() user)`
5. `@Patch(':id')` `@HttpCode(200)` → `update(@Param('id') id, @Body() dto: UpdateJobApplicationDto, @CurrentUser() user)`
6. `@Delete(':id')` `@HttpCode(204)` → `remove(@Param('id') id, @CurrentUser() user)`

Each method delegates directly to the corresponding service method and returns the result.

---

## Step 5 — Create `JobApplicationModule`

**File:** `apps/opticv-be/src/app/job-application/job-application.module.ts`

```
imports:   [AuthModule, PrismaModule]
controllers: [JobApplicationController]
providers:   [JobApplicationService]
```

---

## Step 6 — Register in `AppModule`

**File:** `apps/opticv-be/src/app/app.module.ts`

Add `JobApplicationModule` to the `imports` array (import from `./job-application/job-application.module`).

---

## Step 7 — Write `JobApplicationService` unit tests

**File:** `apps/opticv-be/src/app/job-application/job-application.service.spec.ts`

Follow the pattern in `cv.service.spec.ts`:
- Mock `PrismaService` with jest mock objects for `jobApplication` and `cvDocument`.
- Use `beforeEach` with `jest.clearAllMocks()`.
- One `describe` block per method.

Test cases:

### `create`
- Creates record and returns it when CV exists and belongs to user.
- Throws `NotFoundException('CV document not found.')` when CV does not exist (`findUnique` returns `null`).
- Throws `NotFoundException('CV document not found.')` when CV belongs to another user.

### `findAll`
- Returns `{ data: [...], total: N }` with correct Prisma arguments (including `select`).
- Applies `take` when `limit` is provided.
- Applies `skip` when `offset` is provided.
- Omits `take` when `limit` is `undefined`.
- Returns `{ data: [], total: 0 }` when user has no applications.

### `findOne`
- Returns record when it exists and belongs to user.
- Throws `NotFoundException` when record does not exist.
- Throws `NotFoundException` when record belongs to another user.

### `update`
- Updates and returns the record.
- Validates new `cvDocumentId` ownership when provided; throws `NotFoundException` on mismatch.
- Throws `NotFoundException` when application does not belong to user.

### `updateAtsScore`
- Updates only `atsScore` and returns the record.
- Throws `NotFoundException` when application does not belong to user.

### `remove`
- Deletes the record.
- Throws `NotFoundException` when application does not belong to user.

---

## Step 8 — Write `JobApplicationController` unit tests

**File:** `apps/opticv-be/src/app/job-application/job-application.controller.spec.ts`

Follow the pattern in `cv.controller.spec.ts`:
- Override `SupabaseGuard` with `allowAllGuard`.
- Mock `JobApplicationService` with jest functions.
- One `describe` per controller method.

Test cases per method: delegation to service (with correct arguments) + error propagation (service throws, controller propagates).

---

## Step 9 — Verify build and tests

Run in order:

```bash
npm exec nx build datatypes
npm exec nx typecheck opticv-be
npm exec nx test opticv-be -- --testFile=apps/opticv-be/src/app/job-application/job-application.service.spec.ts
npm exec nx test opticv-be -- --testFile=apps/opticv-be/src/app/job-application/job-application.controller.spec.ts
npm exec nx build opticv-be
```

---

## Files to create / modify

### Created (new files)

| File | Purpose |
|---|---|
| `apps/opticv-be/src/app/job-application/dto/create-job-application.dto.ts` | Create DTO |
| `apps/opticv-be/src/app/job-application/dto/update-job-application.dto.ts` | Update DTO |
| `apps/opticv-be/src/app/job-application/dto/update-ats-score.dto.ts` | ATS score DTO |
| `apps/opticv-be/src/app/job-application/dto/job-application-query.dto.ts` | Pagination query DTO |
| `apps/opticv-be/src/app/job-application/job-application.service.ts` | Business logic |
| `apps/opticv-be/src/app/job-application/job-application.service.spec.ts` | Service tests |
| `apps/opticv-be/src/app/job-application/job-application.controller.ts` | HTTP controller |
| `apps/opticv-be/src/app/job-application/job-application.controller.spec.ts` | Controller tests |
| `apps/opticv-be/src/app/job-application/job-application.module.ts` | NestJS module |

### Modified (existing files)

| File | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Append `JobApplication`, `JobApplicationResponse`, `JobApplicationListItem`, `JobApplicationListResponse` types |
| `apps/opticv-be/src/app/app.module.ts` | Add `JobApplicationModule` to imports |
