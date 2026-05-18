# Implementation Plan

Task ID: 16-usage-tracking

## Pre-implementation Notes

The spec review raised two non-critical issues. Both are resolved by the current codebase state:

1. **`userId` retrieval** — `OptimizationJobPayload` already carries `userId` (see `optimization.types.ts`). No extra DB query or payload change is needed.
2. **Pricing values** — Concrete values for `gpt-4o-mini` are: input $0.150 / output $0.600 per 1M tokens (OpenAI pricing as of 2025). These will be hard-coded in `CostCalculatorService`.

The spec review ambiguity about `log()` placement in the try/catch is resolved in Step 4 below: the call goes after the COMPLETED update, inside a separate `try/catch`, outside the existing error-handling block.

`AiModule` is already imported by `OptimizationModule` — no module wiring change needed.

---

## Step 1 — Create `CostCalculatorService`

**File:** `apps/opticv-be/src/app/ai/services/cost-calculator.service.ts`

- Decorate with `@Injectable()`
- Define a private pricing map (plain object constant, not injected) of type `Record<string, { inputPerMToken: number; outputPerMToken: number }>` with an entry for `gpt-4o-mini`: `{ inputPerMToken: 0.15, outputPerMToken: 0.60 }`
- Implement a single public method: `calculate(modelId: string, inputTokens: number, outputTokens: number): Decimal`
  - Look up model in pricing map
  - If not found: call `this.logger.warn(...)` and return `new Decimal(0)`
  - Compute: `(inputTokens / 1_000_000) * inputPerMToken + (outputTokens / 1_000_000) * outputPerMToken`
  - Return result as `new Decimal(value.toFixed(6))`
- Import `Decimal` from `decimal.js` (already a transitive dependency via Prisma — verify it is available; if not, import from `@prisma/client/runtime/library`)
- Add a private `Logger` instance

---

## Step 2 — Create `UsageLogService`

**File:** `apps/opticv-be/src/app/ai/services/usage-log.service.ts`

- Decorate with `@Injectable()`
- Inject `PrismaService` via `inject()` (follow conventions.md — use `inject()`, not constructor injection)
- Implement a single public method: `log(params: UsageLogParams): Promise<void>`
  - `UsageLogParams` is a local interface (same file): `{ userId: string; promptType: PromptType; modelId: string; inputTokens: number; outputTokens: number; costUsd: Decimal }`
  - Call `prisma.usageLog.create({ data: { ...params } })`
  - Return `void`; do not throw — errors propagate to the caller which wraps in try/catch
- Import `PromptType` from `../../generated/prisma/enums.js`
- Import `Decimal` from the same source used in Step 1

---

## Step 3 — Write unit tests for `CostCalculatorService`

**File:** `apps/opticv-be/src/app/ai/services/cost-calculator.service.spec.ts`

Test cases (no NestJS testing module needed — instantiate directly):

| Test | Description |
|------|------------|
| known model, normal tokens | `calculate('gpt-4o-mini', 1_000_000, 1_000_000)` returns `new Decimal('0.750000')` (0.15 + 0.60) |
| known model, zero tokens | `calculate('gpt-4o-mini', 0, 0)` returns `new Decimal('0.000000')` |
| unknown model | `calculate('unknown-model', 500, 500)` returns `new Decimal('0')` and calls `logger.warn` |
| fractional result | `calculate('gpt-4o-mini', 100_000, 200_000)` returns correct decimal |

Spy on `logger.warn` to assert warning is emitted for unknown model.

---

## Step 4 — Wire `UsageLogService` into `OptimizationProcessor`

**File:** `apps/opticv-be/src/app/optimization/optimization.processor.ts`

Changes:

1. Add `private readonly usageLogService: UsageLogService` and `private readonly costCalculator: CostCalculatorService` to constructor parameters (constructor injection is used in this file — match existing pattern)
2. After the existing `await this.prisma.optimizationResult.update(...)` for COMPLETED status (line ~82), add:

```
try {
  const costUsd = this.costCalculator.calculate(model, promptTokens, completionTokens);
  await this.usageLogService.log({
    userId: job.data.userId,
    promptType,
    modelId: model,
    inputTokens: promptTokens,
    outputTokens: completionTokens,
    costUsd,
  });
} catch (err: unknown) {
  this.logger.error(`UsageLog write failed for ${promptType}: ${err instanceof Error ? err.message : String(err)}`);
}
```

This block is placed **after** the COMPLETED update and **before** `this.eventBus.emit(...)`, still inside the outer `try` block but with its own inner catch so it never propagates.

3. Add imports: `UsageLogService`, `CostCalculatorService`

---

## Step 5 — Register new services in `AiModule`

**File:** `apps/opticv-be/src/app/ai/ai.module.ts`

- Add `UsageLogService` and `CostCalculatorService` to `providers` array
- Add both to `exports` array (so `OptimizationModule` can inject them via the already-imported `AiModule`)

---

## Step 6 — Verify build and tests

Run in order:

```bash
npm exec nx typecheck opticv-be
npm exec nx test opticv-be -- --testFile=apps/opticv-be/src/app/ai/services/cost-calculator.service.spec.ts
npm exec nx build opticv-be
```

---

## Files Changed

### New files

| File | Action |
|------|--------|
| `apps/opticv-be/src/app/ai/services/cost-calculator.service.ts` | Create |
| `apps/opticv-be/src/app/ai/services/cost-calculator.service.spec.ts` | Create |
| `apps/opticv-be/src/app/ai/services/usage-log.service.ts` | Create |

### Modified files

| File | Change |
|------|--------|
| `apps/opticv-be/src/app/ai/ai.module.ts` | Add `UsageLogService`, `CostCalculatorService` to providers + exports |
| `apps/opticv-be/src/app/optimization/optimization.processor.ts` | Inject new services; add usage log call after COMPLETED save |
