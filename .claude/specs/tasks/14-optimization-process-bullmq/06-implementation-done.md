# Implementation Done

## Task 14: Optimization Process, BullMQ

---

## Summary

The backend for the parallel CV optimization pipeline was implemented using BullMQ, Redis, and Server-Sent Events (SSE). The implementation includes a new `optimization` NestJS module with a controller (POST trigger + GET SSE), service (validation + orchestration), BullMQ worker processor, in-process event bus, shared types, and unit tests. BullMQ and `@nestjs/bullmq` were installed, Redis was added via Docker Compose, env variables and Joi validation were extended, and `OpenAiService` gained a new `generateCompletion` method.

---

## Specification Coverage

| Requirement | Status | Note |
|-------------|--------|------|
| Install BullMQ and `@nestjs/bullmq` packages | Implemented | Added to `package.json` |
| Add Redis connection config to NestJS `ConfigModule` env files | Implemented | `REDIS_HOST`, `REDIS_PORT`, `BULLMQ_CONCURRENCY` added to `development.env` and `production.env` |
| Extend Joi validation schema with Redis env vars | Implemented | All 3 keys added to `validation.ts` |
| Add `docker-compose.yml` with Redis 7 for local dev | Implemented | Created at workspace root |
| Create `OptimizationModule` | Implemented | `optimization.module.ts` |
| Create `OptimizationController` with POST trigger endpoint | Implemented | `POST /api/optimizations/job-applications/:jobApplicationId/run` |
| POST returns 202 with `{ runId }` | Implemented | `@HttpCode(202)` applied |
| Create `OptimizationController` with SSE stream endpoint | Implemented | `GET /api/optimizations/job-applications/:jobApplicationId/stream?runId=<uuid>` |
| `SupabaseGuard` applied to all endpoints | Implemented | Applied at controller class level |
| Ownership validation on trigger endpoint | Implemented | Throws `403` if job application not found or userId doesn't match |
| CV must be in `PARSED`/`COMPLETED` status | Implemented | Throws `400` if `cvDocument` is null or `parseStatus !== 'COMPLETED'` |
| `jobDescription` must be non-empty | Implemented | Throws `400` if empty or whitespace-only |
| Generate unique `runId` (UUID) | Implemented | `randomUUID()` used |
| Enqueue 7 BullMQ jobs into `optimization` queue | Implemented | One job per `PromptType` value |
| Job payload includes `runId`, `jobApplicationId`, `userId`, `promptType`, `cvText`, `parsedSections`, `jobDescription` | Implemented | Matches spec exactly |
| Job options: `attempts: 2`, `backoff: { type: 'exponential', delay: 2000 }` | Implemented | |
| Queue name: `optimization` | Implemented | |
| BullMQ concurrency configurable via `BULLMQ_CONCURRENCY` env var | Implemented | Read via `process.env` in processor |
| Ownership validation on SSE stream endpoint | Implemented | `validateStreamAccess()` called before opening stream |
| SSE headers set correctly | Implemented | `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `flushHeaders()` called |
| SSE emits `job-complete` event per job | Implemented | Written on each EventBus event |
| SSE emits `run-complete` event when all 7 jobs resolve | Implemented | Counter-based, triggers at `resolved === TOTAL_JOBS` |
| SSE stream closes when all 7 jobs complete or fail | Implemented | `res.end()` called after `run-complete` |
| Client disconnect cleans up listeners | Implemented | `req.on('close', ...)` calls `unsubscribe()` |
| `runId` required query param validated on SSE endpoint | Implemented | Throws `400` if missing |
| `OptimizationProcessor` extends `WorkerHost`, decorated with `@Processor('optimization')` | Implemented | |
| Worker sets `status = PROCESSING` at job start | Implemented | First DB write in `process()` |
| Worker fetches active `PromptVersion` via `PromptService.getActivePrompt()` | Implemented | |
| Worker builds user prompt via `PromptService.buildUserPrompt()` | Implemented | Unspecified `PromptVariables` fields default to empty string |
| Worker calls OpenAI via `openAiService.generateCompletion()` | Implemented | |
| Worker uses `promptVersion.modelPreference`, falls back to `gpt-4o-mini` | Implemented | |
| Structured output stored in `structuredOutput` when `outputSchema` non-null | Implemented | JSON parsed from content |
| Plain text stored in `textOutput` when `outputSchema` is null | Implemented | |
| Worker UPSERTs `OptimizationResult` to `COMPLETED` | Implemented | Uses `update` on existing PENDING record (upsert handled by pre-creation) |
| Worker stores token counts | Implemented | `inputTokens`, `outputTokens` stored |
| Worker emits success event via event bus | Implemented | |
| Worker catches errors: sets `status = FAILED`, stores `errorMessage`, emits failure event | Implemented | |
| Worker re-throws error for BullMQ retry | Implemented | |
| No active `PromptVersion`: worker marks job `FAILED`, emits event | Implemented | Error propagated from `getActivePrompt()` |
| Re-run: new `runId` generated, 7 new jobs enqueued, UPSERT overwrites previous results | Implemented | UPSERT via `prisma.optimizationResult.upsert` with reset of all result fields |
| UPSERT key: `(applicationId, promptType)` — existing `@@unique` constraint | Implemented | Uses `applicationId_promptType` compound key |
| No DB migration required | Confirmed | Existing `@@unique([applicationId, promptType])` used |
| `OptimizationEventBus` singleton as in-process EventEmitter bridge | Implemented | |
| EventEmitter `maxListeners` set to 50 | Implemented | |
| `OptimizationModule` imports: `BullModule.registerQueue`, `PrismaModule`, `AiModule`, `AuthModule` | Implemented | |
| `BullModule.forRootAsync()` registered in `AppModule` with Redis config | Implemented | |
| `OptimizationModule` added to `AppModule` imports | Implemented | |
| `generateCompletion()` method added to `OpenAiService` | Implemented | |
| Unit tests for `OptimizationService` | Implemented | 5 test cases |
| Unit tests for `OptimizationProcessor` | Implemented | 5 test cases |
| PENDING records created synchronously before enqueueing (N5 resolution) | Implemented | `Promise.all` upsert for all 7 types before queue adds |
| `UsageLog` writes deferred (out of scope) | Confirmed | Not implemented |

---

## Files

### Created

| Path | Description |
|------|-------------|
| `docker-compose.yml` | Redis 7-alpine for local development |
| `apps/opticv-be/src/app/optimization/optimization.module.ts` | NestJS module |
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | POST trigger + GET SSE endpoints |
| `apps/opticv-be/src/app/optimization/optimization.service.ts` | Validation, PENDING upserts, job enqueueing |
| `apps/opticv-be/src/app/optimization/optimization.processor.ts` | BullMQ `WorkerHost` processor |
| `apps/opticv-be/src/app/optimization/optimization-event-bus.ts` | In-process EventEmitter SSE bridge |
| `apps/opticv-be/src/app/optimization/optimization.types.ts` | `OptimizationJobPayload` and `OptimizationJobEvent` interfaces |
| `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` | Unit tests for service |
| `apps/opticv-be/src/app/optimization/optimization.processor.spec.ts` | Unit tests for processor |

### Modified

| Path | Change |
|------|--------|
| `package.json` | Added `@nestjs/bullmq` and `bullmq` to `dependencies` |
| `package-lock.json` | Updated by npm install |
| `apps/opticv-be/config/env/development.env` | Added `REDIS_HOST`, `REDIS_PORT`, `BULLMQ_CONCURRENCY` |
| `apps/opticv-be/config/env/production.env` | Added same 3 keys |
| `apps/opticv-be/config/validation.ts` | Added Joi rules for `REDIS_HOST`, `REDIS_PORT`, `BULLMQ_CONCURRENCY` |
| `apps/opticv-be/src/app/app.module.ts` | Added `BullModule.forRootAsync()` and `OptimizationModule` |
| `apps/opticv-be/src/app/ai/services/openai.service.ts` | Added `generateCompletion()` method |

---

## Components

| Component | Status |
|-----------|--------|
| `OptimizationController` | Exist |
| `OptimizationService` | Exist |
| `OptimizationProcessor` | Exist |
| `OptimizationEventBus` | Exist |
| `OptimizationModule` | Exist |

---

## Stores

No stores were planned or implemented for this task (backend-only task).

---

## Deviations

| Area | Deviation |
|------|-----------|
| `OptimizationService` — worker UPSERT | The plan described using `prisma.optimizationResult.upsert` in the worker (Step 9, point 8). The implementation uses `prisma.optimizationResult.update` in the worker instead, since PENDING records are pre-created by the service. The UPSERT is done at the service level; the worker only updates. |
| `trigger-optimization.dto.ts` | Not created, as resolved in plan (N4) — no request body means no DTO needed. |
| `OptimizationService` — no `OptimizationEventBus` injection | The plan listed `OptimizationEventBus` as an injected dependency of `OptimizationService`. The implementation does not inject it (the service does not emit events; only the processor does). |

---

## Additional Implementation

- `validateStreamAccess()` extracted as a separate public method on `OptimizationService` — called by the controller's SSE endpoint for ownership validation (not described as a distinct named method in the plan, where ownership check was noted as inline or a private helper).
- `TOTAL_JOBS` constant derived dynamically from `Object.values(PromptType).length` in the controller, making it resilient to future `PromptType` enum changes.
- `res.writableEnded` guard added inside the SSE event handler to prevent writes to a closed response.
- Logger added to `OptimizationProcessor` for error output on job failure.
- Documentation files created: `docs/bullmq-redis-docker.md` and `docs/plan-vs-implementation.md` (additional documentation not specified in spec or plan).
