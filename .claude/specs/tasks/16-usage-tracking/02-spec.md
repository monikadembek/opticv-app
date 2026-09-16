# Task Specification

## Source

Task 16: Implement usage tracking

## Goal

Wire up the existing `UsageLog` table so that every successful optimization AI call writes a usage record with token counts and calculated cost in USD.

## Context

The `UsageLog` model already exists in the Prisma schema and is mapped to the `usage_logs` table, but nothing writes to it. Token counts (`promptTokens`, `completionTokens`) and the model name are already available inside `OptimizationProcessor.process()` immediately after `openAiService.generateCompletion()` resolves. The cost must be calculated from those token counts using known OpenAI per-token pricing.

CV extraction (`extractCvData`) is **out of scope** — only the 7 optimization prompt types are tracked.

## Scope

### In scope

- Create a `UsageLogService` in the `ai` module that writes to `prisma.usageLog`
- Create a `CostCalculatorService` (or utility) that computes `costUsd` from `(model, inputTokens, outputTokens)`
- Call `UsageLogService.log()` inside `OptimizationProcessor.process()` after a COMPLETED result is saved
- Unit tests for `CostCalculatorService` (pricing table logic)

### Out of scope

- CV extraction usage logging
- Frontend changes
- Usage reporting endpoints or dashboards
- Quota enforcement or rate limiting based on usage

## Behavior

### Cost calculation

- Maintain a pricing map keyed by model ID: `{ inputPricePerMToken: number, outputPricePerMToken: number }` (price per 1 million tokens in USD)
- Initial entries must cover at minimum: `gpt-4o-mini` (current default and fallback model)
- Formula: `costUsd = (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice`
- If the model is not in the pricing map, log a warning and use `0` as the cost (do not throw)

### Writing a usage log entry

After `OptimizationProcessor` saves a COMPLETED `OptimizationResult`, it calls `UsageLogService.log()` with:

- `userId` — from the job application (must be retrieved from DB or passed via job payload)
- `promptType` — from `job.data.promptType`
- `modelId` — the model string used for the completion
- `inputTokens` — `promptTokens` returned by `generateCompletion`
- `outputTokens` — `completionTokens` returned by `generateCompletion`
- `costUsd` — computed by `CostCalculatorService`

The log call must **not** throw or cause the job to fail if it errors — wrap in try/catch and log the error.

### UsageLog record fields

Matches the existing schema exactly:

| Field         | Value                          |
|---------------|-------------------------------|
| `userId`      | authenticated user's DB id     |
| `promptType`  | `PromptType` enum value        |
| `modelId`     | model string (e.g. `gpt-4o-mini`) |
| `inputTokens` | integer                        |
| `outputTokens`| integer                        |
| `costUsd`     | `Decimal(10,6)` in USD         |
| `createdAt`   | auto-set by Prisma             |

## Edge Cases

- **Unknown model:** cost defaults to `0`, warning is logged — no exception thrown
- **UsageLog write failure:** caught silently with error log — optimization result is already COMPLETED and must not be rolled back
- **Zero tokens:** valid — write the record with `0` tokens and `0` cost (can happen with empty responses)
- **Failed optimization jobs:** do NOT write a usage log entry on FAILED status

## Data / API

### No DB schema changes

The `UsageLog` model is already present in `schema.prisma`. No migration needed.

### New files

| File | Purpose |
|------|---------|
| `apps/opticv-be/src/app/ai/services/usage-log.service.ts` | Writes `UsageLog` records via `PrismaService` |
| `apps/opticv-be/src/app/ai/services/cost-calculator.service.ts` | Pure pricing logic; `calculate(model, inputTokens, outputTokens): Decimal` |
| `apps/opticv-be/src/app/ai/services/cost-calculator.service.spec.ts` | Unit tests for pricing table and formula |

### Modified files

| File | Change |
|------|--------|
| `apps/opticv-be/src/app/ai/ai.module.ts` | Provide and export `UsageLogService`, `CostCalculatorService` |
| `apps/opticv-be/src/app/optimization/optimization.processor.ts` | Inject `UsageLogService`; call `log()` after COMPLETED save |
| `apps/opticv-be/src/app/optimization/optimization.module.ts` | Import `AiModule` if not already imported (to access new services) |

### `userId` retrieval

`OptimizationJobPayload` currently carries `jobApplicationId` but not `userId`. The processor already has access to `PrismaService`, so retrieve `userId` via:

```
const { userId } = await this.prisma.jobApplication.findUniqueOrThrow({
  where: { id: jobApplicationId },
  select: { userId: true },
});
```

Alternatively, add `userId` to `OptimizationJobPayload` at the enqueue site — either approach is acceptable.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-be`)
- Type check passes (`npm exec nx typecheck opticv-be`)
- Unit tests for `CostCalculatorService` cover: known model, unknown model, zero tokens
- After a successful optimization run, a row appears in `usage_logs` with correct `userId`, `promptType`, `modelId`, token counts, and a non-negative `costUsd`
- A failed optimization job does NOT produce a `usage_logs` row
- A `UsageLog` write error does not affect the `OptimizationResult` status
