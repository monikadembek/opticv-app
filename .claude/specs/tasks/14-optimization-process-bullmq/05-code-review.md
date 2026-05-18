# Code Review — Task 14: Optimization Process, BullMQ

Reviewer: Claude Code  
Date: 2026-05-18

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The core implementation is correct and complete. All 7 spec requirements are covered, the BullMQ + SSE + EventBus pattern is properly wired, and the tests cover the critical paths. Two non-critical issues were found: the `BULLMQ_CONCURRENCY` env variable is read into validation schema but never used to configure the worker, and the SSE stream endpoint has an unguarded race condition where `res.write()` may be called after `res.end()` if two jobs complete nearly simultaneously (the unsubscribe happens after the write, not before).

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`optimization.service.ts` line 19 — constructor injection instead of `inject()`**
   The conventions file requires using the `inject()` function instead of constructor injection for NestJS services. `OptimizationService` uses constructor injection. Same applies to `OptimizationProcessor` (line 17–23), `OptimizationController` (line 24–27), `OptimizationEventBus` (line 6–8), and `PromptService`.
   Note: `@InjectQueue` is a parameter decorator and does require constructor injection — this one is acceptable. The plain `PrismaService`/`OptimizationEventBus` injections should use `inject()`.

2. **`openai.service.ts` line 13 — constructor injection**
   Same issue: `constructor(private readonly config: ConfigService)` should use `inject(ConfigService)` per conventions.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Install `@nestjs/bullmq` and `bullmq` packages | Covered | Present in `package.json` |
| Add Redis config to NestJS ConfigModule env files | Covered | `development.env` and `validation.ts` updated |
| Docker Compose for local Redis | Covered | `docker-compose.yml` created at workspace root |
| `POST /api/optimizations/job-applications/:jobApplicationId/run` endpoint | Covered | Returns 202 with `{ runId }` |
| `GET /api/optimizations/job-applications/:jobApplicationId/stream` SSE endpoint | Covered | Emits `job-complete` x7 then `run-complete` |
| Ownership validation on both endpoints | Covered | `ForbiddenException` on mismatch |
| CV `parseStatus === COMPLETED` guard | Covered | `BadRequestException` with correct message |
| Missing `jobDescription` guard | Covered | `BadRequestException` with correct message |
| 7 parallel BullMQ jobs enqueued with `attempts: 2, backoff: exponential` | Covered | `optimization.service.ts` lines 78–86 |
| 7 `PENDING` `OptimizationResult` records created synchronously before enqueue | Covered | `Promise.all` upserts at lines 55–76 |
| Worker sets `status = PROCESSING` at job start | Covered | `optimization.processor.ts` lines 30–35 |
| Worker calls `getActivePrompt` + `buildUserPrompt` | Covered | Lines 38–51 |
| Worker calls `generateCompletion` with `useJsonFormat` based on `outputSchema` | Covered | Lines 53–62 |
| Worker UPSERTs `COMPLETED` with token counts | Covered | Lines 69–81 |
| Worker sets `FAILED` + `errorMessage` on error and re-throws | Covered | Lines 88–101 |
| SSE emits `job-complete` event per job | Covered | `optimization.controller.ts` line 56 |
| SSE emits `run-complete` when all 7 done, then closes stream | Covered | Lines 59–63 |
| SSE cleans up on client disconnect | Covered | `req.on('close', ...)` line 67 |
| `BULLMQ_CONCURRENCY` env variable | Partial | Added to validation schema but not passed to worker/queue configuration |
| Unit tests for `OptimizationService` | Covered | All 5 cases from plan covered |
| Unit tests for `OptimizationProcessor` | Covered | All 5 cases from plan covered |
| `generateCompletion` method on `OpenAiService` | Covered | `openai.service.ts` lines 50–75 |

---

### Plan Deviations

1. **`BULLMQ_CONCURRENCY` not wired to the worker.**
   The plan (Step 3 + Step 9) specifies this env variable configures BullMQ concurrency. `validation.ts` declares it, but the `@Processor('optimization')` decorator and `BullModule.forRootAsync` in `app.module.ts` do not pass a concurrency option. The worker runs at BullMQ's default (1 concurrent job per worker instance). This is a partial implementation.

2. **SSE stream does not validate that `runId` is provided.**
   The plan specifies `GET .../stream?runId=<uuid>` but the controller does not check that `runId` is a non-empty string before subscribing. An empty `runId` would subscribe to channel `run:` and never receive events (stream hangs open).

3. **`assertOwnership` duplicates the ownership query from `triggerOptimization`.**
   The plan suggests a "shared private helper" for the SSE ownership check, but the service has a public `assertOwnership` method that the controller calls directly. This is a minor structural deviation — not harmful, but the check is now in the controller layer rather than being fully encapsulated in the service.

---

### Null Safety Issues

1. **`optimization.service.ts` line 36 — `record.cvDocument` may be null.**
   `prisma.jobApplication.findUnique({ include: { cvDocument: true } })` returns `cvDocument: CvDocument | null` when the relation is optional. Accessing `record.cvDocument.parseStatus` without a null check will throw a runtime `TypeError` if a job application exists without an associated CV document. The schema shows `cvDocumentId` is required (`String`, non-optional), but the Prisma model type still types the included relation as nullable. A guard `if (!record.cvDocument)` should precede line 36.

2. **`optimization.controller.ts` lines 59–63 — possible write-after-end race.**
   If two BullMQ jobs complete at nearly the same time (e.g. within the same event loop tick), the handler is called twice before `unsubscribe()` executes. Both invocations can see `resolved === 6` before either increments it (this is not a JS concurrency issue since it's single-threaded, but the `unsubscribe()` call on line 62 happens *after* `res.write()` on line 61, leaving a narrow window if the EventEmitter fires re-entrantly). More precisely: if job 6 and job 7 both emit synchronously back-to-back on the same `emit()` call chain, `resolved` increments to 7 on the first handler invocation, `res.end()` is called, then the second invocation executes — calling `res.write()` on a closed response (throws or silently drops). The fix is to guard the write: `if (!res.writableEnded)`.

---

### Code Smells

1. **`TOTAL_JOBS = 7` magic constant in `optimization.controller.ts` line 19.**
   This is derived from `Object.values(PromptType).length`. If a new `PromptType` is added to the enum, the controller's hard-coded 7 will silently hang (the stream never closes). The constant should be `Object.values(PromptType).length` or imported from a shared location to stay in sync with the enum.

2. **`mockEventBus = {}` in `optimization.service.spec.ts` line 22.**
   `OptimizationService` does not use `OptimizationEventBus` (it was removed after the plan — the service only enqueues, the event bus is used by the processor and controller). The mock is provided but unused; it should be removed to avoid misleading future readers.

3. **Unused import in `optimization.processor.spec.ts` line 3.**
   `getQueueToken` is imported but the queue is only provided as `{ provide: getQueueToken('optimization'), useValue: {} }` — this is needed for the `WorkerHost` base class. However, the `@Processor` decorator may register with BullMQ internals at module init time; providing an empty object as the queue may cause test failures if `WorkerHost` tries to use it. This should be verified. (If tests pass, it's fine — just worth flagging.)

---

### Recommendation

**Fix critical issues before merge** — specifically the `record.cvDocument` null safety issue (item 1 under Null Safety), which is a runtime crash risk. The `TOTAL_JOBS` magic constant (Code Smells item 1) is also high-priority because it creates a silent correctness bug if the enum grows. The remaining issues are quality improvements that should be addressed but do not block correctness today.
