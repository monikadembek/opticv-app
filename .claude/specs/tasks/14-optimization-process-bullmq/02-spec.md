# Task Specification

## Source

Task 14: Optimization Process, BullMQ

## Goal

Implement the backend for the parallel CV optimization pipeline using BullMQ. When a user triggers optimization for a job application, the backend creates 7 parallel BullMQ jobs (one per PromptType), each calling OpenAI and storing results. The frontend is notified of each job's completion in real-time via Server-Sent Events (SSE).

## Context

This lives entirely in the `opticv-be` NestJS backend. The Prisma schema already has `OptimizationResult`, `PromptVersion`, and `PromptType` models in place. The `PromptService` (in `ai/`) and `OpenaiService` are already present. BullMQ is not yet installed.

## Scope

### In scope

- Install BullMQ and `@nestjs/bullmq` packages
- Add Redis connection config to the NestJS `ConfigModule` env files
- Add a `docker-compose.yml` (or extend existing) to run Redis locally for development
- Create a new `optimization` NestJS module with:
  - `OptimizationController` — POST trigger endpoint + SSE stream endpoint
  - `OptimizationService` — orchestrates job enqueueing and result persistence
  - `OptimizationProcessor` — BullMQ worker that processes each job
- All 7 PromptTypes run as parallel child jobs on every optimization request
- Results are stored via UPSERT (overwrite on re-run)
- SSE stream: one connection per optimization run; closes when all 7 jobs complete or fail

### Out of scope

- Frontend implementation (next task)
- Selective job triggering (all 7 always run)
- Optimization history / audit log
- Email/push notifications when optimization finishes
- Authentication on SSE endpoint (auth guard already applied at controller level via SupabaseGuard)

## Behavior

### Step 1 — Trigger optimization

`POST /api/optimizations/job-applications/:jobApplicationId/run`

1. Guard: `SupabaseGuard` — request must have valid Supabase JWT.
2. Validate that the `jobApplicationId` belongs to the authenticated user (use `JobApplicationService` or direct Prisma query). Return `403` if not owner.
3. Fetch the associated `CvDocument` (must be in `PARSED` status). Return `400` if CV is not yet parsed.
4. Fetch `jobDescription` from `JobApplication`. Return `400` if empty.
5. Generate a unique `runId` (UUID) to identify this optimization run.
6. Enqueue 7 BullMQ jobs into a single queue named `optimization`. Each job payload:
   ```
   {
     runId: string,
     jobApplicationId: string,
     userId: string,
     promptType: PromptType,
     cvText: string,           // parsed text from CvDocument
     parsedSections: object,   // structured JSON from CvDocument
     jobDescription: string,
   }
   ```
7. Return `202 Accepted` with `{ runId }`.

### Step 2 — SSE stream

`GET /api/optimizations/job-applications/:jobApplicationId/stream?runId=<uuid>`

1. Guard: `SupabaseGuard`.
2. Validate ownership of `jobApplicationId`.
3. Open an SSE response (`Content-Type: text/event-stream`).
4. Subscribe to BullMQ job completion events for this `runId`.
5. On each job completion, emit an SSE event:
   ```
   event: job-complete
   data: { promptType, status: "completed" | "failed", result?: object, error?: string }
   ```
6. Track how many of the 7 jobs have resolved (completed or failed). When all 7 are done, emit:
   ```
   event: run-complete
   data: { runId, completedAt: ISO8601 }
   ```
   Then close the stream.
7. On client disconnect, clean up listeners.

### Step 3 — Worker processor

Each BullMQ job is processed by `OptimizationProcessor`:

1. Retrieve the active `PromptVersion` for the given `PromptType` from DB via `PromptService.getActivePrompt()`.
2. Build the user prompt via `PromptService.buildUserPrompt()` with the job payload data.
3. Call OpenAI (using the model specified in `PromptVersion.modelPreference`, fall back to `gpt-4o-mini`).
4. Parse and validate the response (JSON for structured outputs, plain text for others).
5. UPSERT an `OptimizationResult` record:
   - Match on `(jobApplicationId, promptVersionId)` — or `(jobApplicationId, promptType)` via a join. See Data/API section.
   - Set `status = COMPLETED`, store `textOutput` or `structuredOutput`, record token counts.
6. Emit a BullMQ event (via Bull's event system) so the SSE subscriber can detect completion.
7. On error: set `status = FAILED`, store error message, still emit event so SSE doesn't hang.

### Step 4 — Re-run behavior

When the user triggers optimization again for the same `jobApplicationId`:

- A new `runId` is generated.
- 7 new BullMQ jobs are enqueued.
- Workers UPSERT `OptimizationResult` records (overwriting previous results for each PromptType).
- Previous SSE connections are not affected (they have already closed).

## Edge Cases

- **CV not parsed yet**: Return `400 Bad Request` with message `"CV document is not yet parsed."`.
- **Missing job description**: Return `400 Bad Request` with message `"Job description is required."`.
- **Job application not found or wrong owner**: Return `403 Forbidden`.
- **No active PromptVersion for a PromptType**: Worker marks the job as `FAILED` with reason `"No active prompt version found."`.
- **OpenAI API error**: Worker catches the error, marks `OptimizationResult.status = FAILED`, emits failure event on SSE.
- **Client disconnects from SSE before run completes**: Server cleans up event listeners. BullMQ jobs continue running and results are still persisted to DB.
- **Duplicate run trigger**: If a run is already in progress (jobs still in queue), the endpoint still creates a new `runId` and re-enqueues. Previous jobs may still complete and UPSERT results (last-writer-wins).

## Data / API

### New endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/optimizations/job-applications/:jobApplicationId/run` | Trigger optimization run |
| GET | `/api/optimizations/job-applications/:jobApplicationId/stream?runId=uuid` | SSE stream for run |

### Response: POST trigger

```json
{
  "runId": "uuid-v4"
}
```
HTTP 202 Accepted.

### SSE event shapes

```
event: job-complete
data: {"promptType":"RESUME_AUTOPSY","status":"completed","result":{...}}

event: job-complete
data: {"promptType":"KEYWORD_GAP","status":"failed","error":"OpenAI timeout"}

event: run-complete
data: {"runId":"uuid","completedAt":"2025-01-01T12:00:00.000Z"}
```

### BullMQ queue

- Queue name: `optimization`
- Concurrency: configurable via env `BULLMQ_CONCURRENCY` (default: `5`)
- Job options: `attempts: 2`, `backoff: { type: 'exponential', delay: 2000 }`

### OptimizationResult UPSERT strategy

The existing `OptimizationResult` model has a unique constraint candidate on `(jobApplicationId, promptVersionId)`. Since `promptVersionId` may change between runs (if a new version is activated), UPSERT should be done on `(jobApplicationId, promptType)` by joining through `PromptVersion`.

**Recommended approach:** Use `prisma.optimizationResult.upsert` where `where` is a unique composite `(jobApplicationId, promptVersionId)`. If the active prompt version changed, create a new record. This is acceptable given the UPSERT-per-run requirement.

> **Note:** If the Prisma schema does not have a `@@unique([jobApplicationId, promptVersionId])` constraint, it must be added via migration.

### DB migration required

Add unique constraint to `OptimizationResult`:

```prisma
@@unique([jobApplicationId, promptVersionId])
```

### New env variables

Add to `apps/opticv-be/config/env/development.env` and `production.env`:

```
REDIS_HOST=localhost
REDIS_PORT=6379
BULLMQ_CONCURRENCY=5
```

Add to Joi validation schema in `config/validation.ts`.

### New files / modules

```
apps/opticv-be/src/app/optimization/
  optimization.controller.ts
  optimization.service.ts
  optimization.processor.ts
  optimization.module.ts
  dto/
    trigger-optimization.dto.ts   (empty — no request body)
    optimization-event.dto.ts     (SSE event shape)
```

`OptimizationModule` imports: `BullModule.registerQueue({ name: 'optimization' })`, `PrismaModule`, `AiModule`, `JobApplicationModule`.

Register `BullModule.forRootAsync()` in `AppModule` with Redis config from `ConfigService`.

### Docker Compose for local Redis

Add or extend `docker-compose.yml` at the workspace root:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Package installation

```
npm install @nestjs/bullmq bullmq
```

## Acceptance (DEV)

- `npm exec nx build opticv-be` passes with no errors
- `npm exec nx typecheck opticv-be` passes
- Unit tests added for `OptimizationService` (enqueueing logic) and `OptimizationProcessor` (job processing, UPSERT, error handling)
- `npm exec nx test opticv-be` passes
- POST trigger returns `202` with a `runId`
- SSE stream emits 7 `job-complete` events and 1 `run-complete` event in a test scenario
- Re-running optimization for the same job-application overwrites `OptimizationResult` records (verified via Prisma Studio or test)
- No breaking changes to existing endpoints
