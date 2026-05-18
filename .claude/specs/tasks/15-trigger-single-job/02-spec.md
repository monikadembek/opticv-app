# Task Specification

## Source

Azure DevOps Task: 15 — Trigger single job

## Goal

Add a backend endpoint to trigger a single optimization job for a specific `promptType` on an existing job application. This enables manual re-runs of individual failed (or any-status) jobs without re-running the full 7-job optimization process.

## Context

The existing `POST /api/optimizations/job-applications/:jobApplicationId/run` endpoint queues all 7 BullMQ jobs at once (one per `PromptType`) and returns a `runId`. Each job writes its result to an `OptimizationResult` row and emits an event on `OptimizationEventBus` keyed by `runId`.

When a single job fails, the user currently has no way to re-run just that one job — they would have to re-trigger the entire 7-job run. This task adds a targeted single-job trigger endpoint.

The UI for this feature (a "Retry" button on a failed result card) is **out of scope** and will be implemented in a future task.

## Scope

### In scope

- New `POST /api/optimizations/job-applications/:jobApplicationId/run/:promptType` endpoint
- New `triggerSingleJob(jobApplicationId, promptType, userId)` method on `OptimizationService`
- The endpoint accepts an existing `runId` in the request body to reuse for SSE streaming
- Upsert the target `OptimizationResult` row back to `PENDING` (clearing previous output/error)
- Queue one BullMQ job with the same job name (`optimize`) and options as the full run
- Return `{ runId }` in the response

### Out of scope

- Frontend UI changes (future task)
- Changing the existing full-run endpoint or its behavior
- Any new SSE stream endpoint (existing stream endpoint is reused as-is)
- Authorization changes

## Behavior

1. Client sends `POST /api/optimizations/job-applications/:jobApplicationId/run/:promptType` with body `{ runId: string }`.
2. Backend validates the `:promptType` path param is a valid `PromptType` enum value. If not, respond `400 Bad Request`.
3. Backend loads the `JobApplication` (including `cvDocument`). If not found or `userId` does not match the authenticated user, respond `403 Forbidden`.
4. Backend validates `cvDocument` exists and `parseStatus === 'COMPLETED'`. If not, respond `400 Bad Request` with message `"CV document is not yet parsed."`.
5. Backend validates `jobDescription` is non-empty. If not, respond `400 Bad Request` with message `"Job description is required."`.
6. Backend upserts the `OptimizationResult` row for `(jobApplicationId, promptType)`:
   - Sets `status = PENDING`
   - Clears `structuredOutput`, `textOutput`, `errorMessage`, `promptVersionId`, `inputTokens`, `outputTokens`
7. Backend queues one BullMQ job:
   - Job name: `'optimize'`
   - Payload: same shape as `OptimizationJobPayload` — includes the provided `runId`, `jobApplicationId`, `userId`, `promptType`, `cvText`, `parsedSections`, `jobDescription`
   - Options: `{ attempts: 2, backoff: { type: 'exponential', delay: 2000 } }` (identical to full run)
8. Backend responds `202 Accepted` with `{ runId }`.
9. The BullMQ processor (`OptimizationProcessor`) handles the job identically to any other `'optimize'` job — no changes needed there.
10. The SSE stream (`GET /stream?runId=...`) receives the single `job-complete` event for this job via `OptimizationEventBus`. The stream does **not** auto-close after 1 event (it only closes after `TOTAL_JOBS` events) — this is acceptable for now since the frontend SSE reconnection/usage for retries is a future concern.

## Edge Cases

- **Invalid `promptType`:** Validate against `Object.values(PromptType)` before any DB access; return `400`.
- **Missing `runId` in body:** Return `400 Bad Request` with message `"runId is required."`.
- **Job application not found or wrong user:** Return `403 Forbidden` (same as existing endpoint).
- **CV not parsed / no job description:** Return `400 Bad Request` (same messages as existing endpoint).
- **Re-running a COMPLETED job:** Allowed — the upsert resets it to `PENDING`. No status guard.
- **Re-running a PROCESSING job:** Allowed — the upsert resets the DB row. The in-flight BullMQ job (if still running) will overwrite the row again when it finishes; this is an acceptable race condition for now.

## Data / API

### New endpoint

```
POST /api/optimizations/job-applications/:jobApplicationId/run/:promptType
```

**Auth:** `SupabaseGuard` (same as existing run endpoint)

**Path params:**
- `jobApplicationId` — UUID of the job application
- `promptType` — one of the 7 `PromptType` enum values (case-sensitive)

**Request body:**
```json
{ "runId": "string (UUID)" }
```

**Response `202`:**
```json
{ "runId": "string" }
```

**Error responses:** `400`, `403` (same guard/validation pattern as existing endpoint)

### Service method (new)

```typescript
// OptimizationService
async triggerSingleJob(
  jobApplicationId: string,
  promptType: PromptType,
  runId: string,
  userId: string,
): Promise<{ runId: string }>
```

### No DB schema changes

The `OptimizationResult` table already has the `(applicationId, promptType)` unique constraint and all necessary columns. No Prisma migration needed.

## Assumptions

- The client supplies the original `runId` from the full optimization run. Reusing the same `runId` means any SSE stream already subscribed to that `runId` will receive the retry event without client-side changes.
- The `run-complete` SSE event was already emitted for the original run (after all 7 jobs completed or failed). A reconnected SSE client listening on the same `runId` for a retry will receive only the `job-complete` event for the retried job — not a new `run-complete`. This is acceptable since the full SSE UX for retries is deferred to a future task.
- Validation logic (ownership check, CV parsed, job description present) is identical to `triggerOptimization()` — extract into a shared private helper to avoid duplication.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-be`)
- Type check passes (`npm exec nx typecheck opticv-be`)
- New endpoint returns `202` with `{ runId }` for a valid request
- New endpoint returns `400` for an invalid `promptType` path param
- New endpoint returns `400` for a missing `runId` body field
- New endpoint returns `403` for a job application that does not belong to the authenticated user
- The BullMQ job queued by the new endpoint is processed by the existing `OptimizationProcessor` without modification
- The existing `POST .../run` full-run endpoint behavior is unchanged
- No `TODO` comments left in code
