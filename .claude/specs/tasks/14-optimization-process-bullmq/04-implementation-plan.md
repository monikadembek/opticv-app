# Implementation Plan

## Task 14: Optimization Process, BullMQ

---

## Review Issues Resolved

Before implementation begins, the following corrections from `03-spec-review.md` are applied:

- **C1 resolved:** No DB migration needed. `OptimizationResult` already has `@@unique([applicationId, promptType])`. This is the UPSERT key.
- **C2 resolved:** UPSERT key is `(applicationId, promptType)`. The `promptVersionId` is stored for reference but is not part of the unique constraint.
- **N1 resolved:** Worker sets `status = PROCESSING` at job start, then `COMPLETED` or `FAILED` on finish.
- **N2 resolved:** `UsageLog` writes are deferred — explicitly out of scope for this task.
- **N3 resolved:** Single NestJS process — use Node.js `EventEmitter` (NestJS `EventEmitter2` or built-in) for SSE–worker communication within the same process.
- **N4 resolved:** No `trigger-optimization.dto.ts` file created (no request body).
- **N5 resolved:** Trigger endpoint creates 7 `OptimizationResult` records with `status = PENDING` synchronously before enqueuing jobs, so the frontend can show skeletons immediately.

---

## Decisions

| Topic | Decision |
|-------|----------|
| SSE–worker bridge | Node.js built-in `EventEmitter` wrapped as a singleton NestJS provider (`OptimizationEventBus`) |
| UPSERT key | `@@unique([applicationId, promptType])` — existing constraint, no migration |
| Initial record creation | `PENDING` records created synchronously in trigger endpoint (7x `upsertMany` via `Promise.all`) |
| `PROCESSING` transition | Worker sets `status = PROCESSING` as first DB write when it starts processing a job |
| `UsageLog` | Out of scope |
| Empty DTO file | Not created |
| `QueueEvents` (Redis) vs EventEmitter | EventEmitter — single process deployment; simpler and sufficient |

---

## Step-by-Step Implementation

---

### Step 1 — Install packages

**File:** `package.json` (workspace root)

Run:
```
npm install @nestjs/bullmq bullmq
```

Verify both `@nestjs/bullmq` and `bullmq` appear in `dependencies`.

---

### Step 2 — Add Redis to docker-compose

**File (new):** `docker-compose.yml` at workspace root

Create with a single `redis` service:
- Image: `redis:7-alpine`
- Port mapping: `6379:6379`
- No authentication (local dev only)

---

### Step 3 — Add Redis env variables

**File:** `apps/opticv-be/config/env/development.env`

Append:
```
REDIS_HOST=localhost
REDIS_PORT=6379
BULLMQ_CONCURRENCY=5
```

**File:** `apps/opticv-be/config/env/production.env`

Append the same three keys (values to be set via deployment secrets).

---

### Step 4 — Extend Joi validation schema

**File:** `apps/opticv-be/config/validation.ts`

Add to the `Joi.object({...})`:
- `REDIS_HOST`: `Joi.string().required()`
- `REDIS_PORT`: `Joi.number().default(6379)`
- `BULLMQ_CONCURRENCY`: `Joi.number().default(5)`

---

### Step 5 — Register BullMQ globally in AppModule

**File:** `apps/opticv-be/src/app/app.module.ts`

Add `BullModule.forRootAsync()` to the `imports` array. Use `ConfigService` to read `REDIS_HOST` and `REDIS_PORT`. Configuration:
```
BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get<string>('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT'),
    },
  }),
})
```

Also add `OptimizationModule` to `imports`.

---

### Step 6 — Create OptimizationEventBus provider

**File (new):** `apps/opticv-be/src/app/optimization/optimization-event-bus.ts`

A singleton `EventEmitter`-based provider:
- Class: `OptimizationEventBus`
- Decorated with `@Injectable()`
- Wraps Node.js `EventEmitter` (or extends it)
- Two methods:
  - `emit(runId: string, event: OptimizationJobEvent): void` — emits on channel `run:<runId>`
  - `subscribe(runId: string, handler: (event: OptimizationJobEvent) => void): () => void` — returns an unsubscribe function

`OptimizationJobEvent` shape:
```typescript
interface OptimizationJobEvent {
  promptType: PromptType;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
}
```

Increase `EventEmitter` `maxListeners` to at least 50 to avoid Node warnings under concurrent SSE connections.

---

### Step 7 — Create OptimizationModule

**File (new):** `apps/opticv-be/src/app/optimization/optimization.module.ts`

```
@Module({
  imports: [
    BullModule.registerQueue({ name: 'optimization' }),
    PrismaModule,
    AiModule,
    AuthModule,
  ],
  controllers: [OptimizationController],
  providers: [OptimizationService, OptimizationProcessor, OptimizationEventBus],
})
export class OptimizationModule {}
```

Note: `JobApplicationModule` does NOT export `JobApplicationService`, so ownership checks are done via direct `PrismaService` queries inside `OptimizationService`.

---

### Step 8 — Create OptimizationService

**File (new):** `apps/opticv-be/src/app/optimization/optimization.service.ts`

Inject: `PrismaService`, `@InjectQueue('optimization') Queue`, `OptimizationEventBus`

#### Method: `triggerOptimization(jobApplicationId: string, userId: string): Promise<{ runId: string }>`

1. Query `prisma.jobApplication.findUnique({ where: { id: jobApplicationId }, include: { cvDocument: true } })`.
2. If not found or `record.userId !== userId` → throw `ForbiddenException`.
3. If `record.cvDocument.parseStatus !== 'COMPLETED'` → throw `BadRequestException('CV document is not yet parsed.')`.
4. If `!record.jobDescription?.trim()` → throw `BadRequestException('Job description is required.')`.
5. Generate `runId = randomUUID()`.
6. Build job payload base:
   ```typescript
   {
     runId,
     jobApplicationId,
     userId,
     cvText: record.cvDocument.parsedText ?? '',
     parsedSections: record.cvDocument.structuredData ?? {},
     jobDescription: record.jobDescription,
   }
   ```
7. Get all 7 `PromptType` values from the enum.
8. Create 7 `OptimizationResult` records with `status = PENDING` using `Promise.all` of `prisma.optimizationResult.upsert`:
   - `where: { applicationId_promptType: { applicationId: jobApplicationId, promptType } }`
   - `create: { applicationId: jobApplicationId, promptType, status: 'PENDING' }`
   - `update: { status: 'PENDING', structuredOutput: null, textOutput: null, errorMessage: null, promptVersionId: null, inputTokens: null, outputTokens: null }`
9. Enqueue 7 jobs via `Promise.all` of `queue.add('optimize', { ...payloadBase, promptType })` with options `{ attempts: 2, backoff: { type: 'exponential', delay: 2000 } }`.
10. Return `{ runId }`.

---

### Step 9 — Create OptimizationProcessor

**File (new):** `apps/opticv-be/src/app/optimization/optimization.processor.ts`

Decorated with `@Processor('optimization')` from `@nestjs/bullmq`.

Inject: `PrismaService`, `OpenAiService`, `PromptService`, `OptimizationEventBus`

#### Method: `process(job: Job<OptimizationJobPayload>): Promise<void>`

Decorated with `@Process('optimize')` (or use the default processor method — check `@nestjs/bullmq` v10 API; use `@Process()` or `WorkerHost.process()` pattern as appropriate for installed version).

1. Destructure `{ runId, jobApplicationId, userId, promptType, cvText, parsedSections, jobDescription }` from `job.data`.
2. **Set PROCESSING:** `prisma.optimizationResult.update({ where: { applicationId_promptType: { applicationId: jobApplicationId, promptType } }, data: { status: 'PROCESSING' } })`.
3. Wrap everything from here in `try/catch`.
4. **Get active prompt:** `promptService.getActivePrompt(promptType)` → `promptVersion`.
5. **Build prompt:** `promptService.buildUserPrompt(promptVersion.userPromptTemplate, { resumeText: cvText, parsedSectionsJson: JSON.stringify(parsedSections), jobDescription, targetRole: '', seniority: '', industry: '', yearsExperience: '' })`.
   - Unspecified `PromptVariables` fields default to empty string (not null).
6. **Call OpenAI:** Use `openAiService`'s underlying OpenAI client. Since `OpenAiService.extractCvData` is CV-specific, add a new general-purpose method — see Step 10.
7. **Determine output type:** If `promptVersion.outputSchema` is non-null → use `response_format: { type: 'json_object' }` and store parsed JSON in `structuredOutput`. Otherwise store raw text in `textOutput`.
8. **UPSERT result — COMPLETED:**
   ```
   prisma.optimizationResult.update({
     where: { applicationId_promptType: { applicationId: jobApplicationId, promptType } },
     data: {
       status: 'COMPLETED',
       promptVersionId: promptVersion.id,
       structuredOutput: <json or null>,
       textOutput: <text or null>,
       inputTokens: response.usage?.prompt_tokens ?? null,
       outputTokens: response.usage?.completion_tokens ?? null,
     }
   })
   ```
9. **Emit success event** via `eventBus.emit(runId, { promptType, status: 'completed', result: structuredOutput ?? textOutput })`.
10. **Catch block:**
    - Update `optimizationResult.status = 'FAILED'`, set `errorMessage = err.message`.
    - Emit failure event: `eventBus.emit(runId, { promptType, status: 'failed', error: err.message })`.
    - Re-throw the error so BullMQ's retry mechanism works.

---

### Step 10 — Extend OpenAiService with a general completion method

**File:** `apps/opticv-be/src/app/ai/services/openai.service.ts`

Add a new method: `generateCompletion(systemPrompt: string, userPrompt: string, model: string, useJsonFormat: boolean): Promise<{ content: string; promptTokens: number; completionTokens: number }>`

- Calls `this.client.chat.completions.create(...)` with the provided model, system and user messages, and `response_format: { type: 'json_object' }` if `useJsonFormat` is true.
- Returns content string + token counts.
- Throws if content is empty.
- Does NOT parse JSON — parsing is the caller's responsibility.

---

### Step 11 — Create OptimizationController

**File (new):** `apps/opticv-be/src/app/optimization/optimization.controller.ts`

Decorated with `@Controller('optimizations')` and `@UseGuards(SupabaseGuard)`.

Inject: `OptimizationService`, `OptimizationEventBus`

#### POST `job-applications/:jobApplicationId/run`

- Decorator: `@Post('job-applications/:jobApplicationId/run')`
- Params: `@Param('jobApplicationId') jobApplicationId: string`, `@CurrentUser() user: UserModel`
- Calls `optimizationService.triggerOptimization(jobApplicationId, user.id)`
- Returns the result directly (`{ runId }`) — NestJS default 200. Override with `@HttpCode(202)`.

#### GET `job-applications/:jobApplicationId/stream`

- Decorator: `@Get('job-applications/:jobApplicationId/stream')`
- Params: `@Param('jobApplicationId') jobApplicationId: string`, `@Query('runId') runId: string`, `@CurrentUser() user: UserModel`, `@Res() res: Response` (Express `Response`)
- Steps:
  1. Validate ownership (same Prisma query as in service — or extract to a shared private helper).
  2. Set SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
  3. Initialize a counter `resolved = 0`.
  4. Subscribe to `eventBus.subscribe(runId, handler)` — store the unsubscribe function.
  5. **Handler logic:**
     - Write `event: job-complete\ndata: <JSON>\n\n` to `res`.
     - Increment `resolved`.
     - When `resolved === 7`: write `event: run-complete\ndata: <JSON>\n\n`, call unsubscribe, call `res.end()`.
  6. Handle client disconnect: `req.on('close', () => { unsubscribe(); })`.

---

### Step 12 — Define shared types

**File (new):** `apps/opticv-be/src/app/optimization/optimization.types.ts`

Define:

```typescript
import { PromptType } from '../../generated/prisma/enums';

export interface OptimizationJobPayload {
  runId: string;
  jobApplicationId: string;
  userId: string;
  promptType: PromptType;
  cvText: string;
  parsedSections: unknown;
  jobDescription: string;
}

export interface OptimizationJobEvent {
  promptType: PromptType;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
}
```

---

### Step 13 — Write unit tests

#### `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`

Test cases:
- `triggerOptimization` → throws `ForbiddenException` when job application not found
- `triggerOptimization` → throws `ForbiddenException` when userId does not match
- `triggerOptimization` → throws `BadRequestException` when CV `parseStatus !== 'COMPLETED'`
- `triggerOptimization` → throws `BadRequestException` when `jobDescription` is empty
- `triggerOptimization` → creates 7 PENDING records and enqueues 7 jobs, returns `{ runId }`

Mock: `PrismaService`, `Queue` (from `@nestjs/bullmq`), `OptimizationEventBus`

#### `apps/opticv-be/src/app/optimization/optimization.processor.spec.ts`

Test cases:
- Happy path: calls `getActivePrompt`, `buildUserPrompt`, `generateCompletion`, updates record to `COMPLETED`, emits success event
- No active prompt: updates record to `FAILED`, emits failure event, re-throws
- OpenAI error: updates record to `FAILED`, emits failure event, re-throws
- Structured output (`outputSchema` non-null): stores `structuredOutput`, sets `textOutput = null`
- Text output (`outputSchema` null): stores `textOutput`, sets `structuredOutput = null`

Mock: `PrismaService`, `OpenAiService`, `PromptService`, `OptimizationEventBus`

---

### Step 14 — Verify build and tests

Run in order:

```bash
npm exec nx typecheck opticv-be
npm exec nx test opticv-be
npm exec nx build opticv-be
```

All must pass with no errors.

---

## Files Summary

### New files

| Path | Description |
|------|-------------|
| `docker-compose.yml` | Redis 7 for local development |
| `apps/opticv-be/src/app/optimization/optimization.module.ts` | NestJS module |
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | POST trigger + GET SSE endpoints |
| `apps/opticv-be/src/app/optimization/optimization.service.ts` | Orchestration: validate, upsert PENDING, enqueue |
| `apps/opticv-be/src/app/optimization/optimization.processor.ts` | BullMQ worker: prompt → OpenAI → UPSERT result |
| `apps/opticv-be/src/app/optimization/optimization-event-bus.ts` | In-process EventEmitter bridge for SSE |
| `apps/opticv-be/src/app/optimization/optimization.types.ts` | Shared payload and event interfaces |
| `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` | Unit tests for service |
| `apps/opticv-be/src/app/optimization/optimization.processor.spec.ts` | Unit tests for processor |

### Modified files

| Path | Change |
|------|--------|
| `package.json` | Add `@nestjs/bullmq` and `bullmq` dependencies |
| `apps/opticv-be/config/env/development.env` | Add `REDIS_HOST`, `REDIS_PORT`, `BULLMQ_CONCURRENCY` |
| `apps/opticv-be/config/env/production.env` | Add same 3 keys |
| `apps/opticv-be/config/validation.ts` | Add Joi rules for `REDIS_HOST`, `REDIS_PORT`, `BULLMQ_CONCURRENCY` |
| `apps/opticv-be/src/app/app.module.ts` | Add `BullModule.forRootAsync()` and `OptimizationModule` |
| `apps/opticv-be/src/app/ai/services/openai.service.ts` | Add `generateCompletion()` method |

### No DB migration required

The existing `@@unique([applicationId, promptType])` constraint on `OptimizationResult` is sufficient as the UPSERT key.
