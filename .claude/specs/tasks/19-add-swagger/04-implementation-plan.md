# Implementation Plan: Task 19 — Add Swagger

## Pre-implementation notes (resolving review issues)

- **Config key**: `configuration.ts` maps `process.env.NODE_ENV` → `'nodeEnv'`, so `configService.get('nodeEnv')` in `main.ts` is correct.
- **CV module DTOs**: `CvController` uses response types from `@opticv/datatypes` (TypeScript interfaces, not classes). Interfaces cannot carry `@ApiProperty()` decorators. No DTO annotation is possible for CV responses — only `@ApiOperation` and `@ApiResponse` on the controller methods.
- **`swagger-ui-express`**: Not present in `package.json`. Must be installed explicitly alongside `@nestjs/swagger`.
- **`TriggerSingleJobDto`**: Defined inline in `optimization.controller.ts` — will be annotated in place, not extracted to a separate file (out of scope per spec).
- **`AppController`**: Single `GET /` health-check endpoint, no DTO — only `@ApiTags` and `@ApiOperation` needed.

---

## Step 1 — Install packages

Install in workspace root:

```
npm install @nestjs/swagger swagger-ui-express
```

No `tsconfig` changes required. Webpack builds work without additional plugins.

---

## Step 2 — Bootstrap Swagger in `main.ts`

**File:** `apps/opticv-be/src/main.ts`

After `NestFactory.create()` and before `app.setGlobalPrefix()`:

1. Read `nodeEnv` from `configService.get<string>('nodeEnv')`.
2. If `nodeEnv !== 'production'`:
   - Build a `DocumentBuilder` with:
     - `.setTitle('OptiCV API')`
     - `.setDescription('REST API for the OptiCV application')`
     - `.setVersion('1.0')`
     - `.addBearerAuth()` (registers the global JWT bearer security scheme)
   - Call `SwaggerModule.createDocument(app, config)`.
   - Call `SwaggerModule.setup('docs', app, document)`.
3. The `/docs` path is set before `setGlobalPrefix('api')` so it is not prefixed. Alternatively, use `app.setGlobalPrefix(globalPrefix, { exclude: [{ path: 'docs', method: RequestMethod.GET }] })` — whichever is cleaner given the existing bootstrap order.

> `SwaggerModule.setup` is called with `'docs'` (no leading slash). NestJS handles the route mounting.

---

## Step 3 — Annotate `AppController`

**File:** `apps/opticv-be/src/app/app.controller.ts`

- Add `@ApiTags('health')` to the controller class.
- Add `@ApiOperation({ summary: 'Health check' })` to `getData()`.
- Add `@ApiResponse({ status: 200, description: 'Service is running' })` to `getData()`.

---

## Step 4 — Annotate `CvController`

**File:** `apps/opticv-be/src/app/cv/cv.controller.ts`

- Add `@ApiTags('cv')` to the controller class.
- Add `@ApiBearerAuth()` to the controller class (all methods are guarded).
- Per method:

| Method | `@ApiOperation` summary | `@ApiResponse` codes |
|--------|------------------------|----------------------|
| `uploadCv` | Upload a CV file | 201, 400, 401 |
| `getUserCvs` | List all CVs for the current user | 200, 401 |
| `getDownloadUrl` | Get a signed download URL for a CV | 200, 401, 404 |
| `deleteCv` | Delete a CV document | 204, 401, 404 |
| `extractCv` | Extract structured data from a CV | 200, 401, 404 |

No DTO properties to annotate (response types are `@opticv/datatypes` interfaces). Add `@ApiConsumes('multipart/form-data')` and `@ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })` to `uploadCv` so Swagger UI renders the file upload field.

---

## Step 5 — Annotate `JobApplicationController`

**File:** `apps/opticv-be/src/app/job-application/job-application.controller.ts`

- Add `@ApiTags('job-applications')` to the controller class.
- Add `@ApiBearerAuth()` to the controller class.
- Per method:

| Method | `@ApiOperation` summary | `@ApiResponse` codes |
|--------|------------------------|----------------------|
| `create` | Create a job application | 201, 400, 401 |
| `findAll` | List job applications (with pagination) | 200, 401 |
| `findOne` | Get a single job application | 200, 401, 404 |
| `updateAtsScore` | Update ATS score for a job application | 200, 400, 401, 404 |
| `update` | Update a job application | 200, 400, 401, 404 |
| `remove` | Delete a job application | 204, 401, 404 |

---

## Step 6 — Annotate `OptimizationController`

**File:** `apps/opticv-be/src/app/optimization/optimization.controller.ts`

- Add `@ApiTags('optimizations')` to the controller class.
- Add `@ApiBearerAuth()` to the controller class.
- Annotate `TriggerSingleJobDto` (inline class) with `@ApiProperty()` on `runId`.
- Per method:

| Method | `@ApiOperation` summary | `@ApiResponse` codes |
|--------|------------------------|----------------------|
| `triggerOptimization` | Trigger full optimization run for a job application | 202, 401, 404 |
| `triggerSingleJob` | Trigger a single optimization job within a run | 202, 400, 401, 404 |
| `streamOptimization` | Stream optimization progress events (SSE) | 200, 400, 401, 404 |

Add `@ApiProduces('text/event-stream')` to `streamOptimization`.

---

## Step 7 — Annotate `UsersController`

**File:** `apps/opticv-be/src/app/users/users.controller.ts`

- Add `@ApiTags('users')` to the controller class.
- Add `@ApiOperation({ summary: 'Sync user from Supabase webhook' })` to `sync()`.
- Add `@ApiHeader({ name: 'x-webhook-secret', required: true, description: 'Supabase webhook secret' })` to `sync()`.
- Add `@ApiResponse` for: 200, 401.

---

## Step 8 — Annotate DTOs

### `CreateJobApplicationDto`
**File:** `apps/opticv-be/src/app/job-application/dto/create-job-application.dto.ts`

| Property | Decorator | Example |
|----------|-----------|---------|
| `cvDocumentId` | `@ApiProperty` | `'abc-123'` |
| `jobTitle` | `@ApiProperty` | `'Senior Frontend Engineer'` |
| `companyName` | `@ApiProperty` | `'Acme Corp'` |
| `jobDescription` | `@ApiProperty` | `'We are looking for...'` |
| `notes` | `@ApiPropertyOptional` | `'Applied via LinkedIn'` |

### `UpdateJobApplicationDto`
**File:** `apps/opticv-be/src/app/job-application/dto/update-job-application.dto.ts`

All properties are optional — use `@ApiPropertyOptional` for each.

| Property | Example |
|----------|---------|
| `cvDocumentId` | `'abc-123'` |
| `jobTitle` | `'Lead Engineer'` |
| `companyName` | `'Globex'` |
| `jobDescription` | `'Updated description...'` |
| `notes` | `null` (nullable) |

### `JobApplicationQueryDto`
**File:** `apps/opticv-be/src/app/job-application/dto/job-application-query.dto.ts`

| Property | Decorator | Example |
|----------|-----------|---------|
| `limit` | `@ApiPropertyOptional` | `20` |
| `offset` | `@ApiPropertyOptional` | `0` |

### `UpdateAtsScoreDto`
**File:** `apps/opticv-be/src/app/job-application/dto/update-ats-score.dto.ts`

| Property | Decorator | Example |
|----------|-----------|---------|
| `atsScore` | `@ApiProperty({ minimum: 0, maximum: 100 })` | `85` |

### `WebhookPayloadDto` and `WebhookRecord`
**File:** `apps/opticv-be/src/app/users/dto/webhook-payload.dto.ts`

Both classes need annotation:

| Class | Property | Decorator | Example |
|-------|----------|-----------|---------|
| `WebhookRecord` | `id` | `@ApiProperty` | `'user-uuid'` |
| `WebhookRecord` | `email` | `@ApiProperty` | `'user@example.com'` |
| `WebhookPayloadDto` | `type` | `@ApiProperty` | `'INSERT'` |
| `WebhookPayloadDto` | `record` | `@ApiProperty({ type: () => WebhookRecord })` | — |

---

## Step 9 — Verify

Run in order:

```
npm exec nx typecheck opticv-be
npm exec nx lint opticv-be
npm exec nx build opticv-be
```

Then start dev server and navigate to `http://localhost:3000/docs`:

- All 5 controller tag groups visible
- File upload field renders on `POST /api/cv/upload`
- SSE endpoint shows correct `text/event-stream` content type
- "Authorize" button accepts a bearer token and propagates to guarded requests
- `UsersController` sync endpoint shows `x-webhook-secret` header field

---

## Files modified

| File | Action |
|------|--------|
| `package.json` | Modified — add `@nestjs/swagger`, `swagger-ui-express` |
| `apps/opticv-be/src/main.ts` | Modified — bootstrap Swagger (dev-only) |
| `apps/opticv-be/src/app/app.controller.ts` | Modified — `@ApiTags`, `@ApiOperation`, `@ApiResponse` |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | Modified — `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`, `@ApiConsumes`, `@ApiBody` |
| `apps/opticv-be/src/app/job-application/job-application.controller.ts` | Modified — `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse` |
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | Modified — `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`, `@ApiProduces`, `@ApiProperty` on inline DTO |
| `apps/opticv-be/src/app/users/users.controller.ts` | Modified — `@ApiTags`, `@ApiOperation`, `@ApiHeader`, `@ApiResponse` |
| `apps/opticv-be/src/app/job-application/dto/create-job-application.dto.ts` | Modified — `@ApiProperty` / `@ApiPropertyOptional` |
| `apps/opticv-be/src/app/job-application/dto/update-job-application.dto.ts` | Modified — `@ApiPropertyOptional` |
| `apps/opticv-be/src/app/job-application/dto/job-application-query.dto.ts` | Modified — `@ApiPropertyOptional` |
| `apps/opticv-be/src/app/job-application/dto/update-ats-score.dto.ts` | Modified — `@ApiProperty` |
| `apps/opticv-be/src/app/users/dto/webhook-payload.dto.ts` | Modified — `@ApiProperty` on both classes |

**No files created. No files deleted.**
