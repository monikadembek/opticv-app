# Implementation Done: Task 16 — Usage Tracking

**Date:** 2026-05-18  
**Branch:** feature/16-usage-tracking

---

## Summary

Implemented usage tracking for the AI optimization pipeline. Every successful optimization job now writes a `UsageLog` record containing user ID, prompt type, model ID, input/output token counts, and calculated cost in USD. A new `CostCalculatorService` computes cost from a pricing map. A new `UsageLogService` writes the record to the database. Both services are registered in `AiModule` and consumed by `OptimizationProcessor`. Unit tests cover `CostCalculatorService` (4 cases) and `OptimizationProcessor` integration (5 cases).

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Create `UsageLogService` in the `ai` module | Implemented | `apps/opticv-be/src/app/ai/services/usage-log.service.ts` |
| Create `CostCalculatorService` (or utility) for cost calculation | Implemented | `apps/opticv-be/src/app/ai/services/cost-calculator.service.ts` |
| Call `UsageLogService.log()` inside `OptimizationProcessor.process()` after COMPLETED result is saved | Implemented | `optimization.processor.ts` lines 86–100 |
| Unit tests for `CostCalculatorService` | Implemented | `cost-calculator.service.spec.ts` — 4 test cases |
| Cost formula: `(inputTokens / 1M) * inputPrice + (outputTokens / 1M) * outputPrice` | Implemented | `cost-calculator.service.ts` lines 33–37 |
| Initial pricing: `gpt-4o-mini` input $0.150 / output $0.600 per 1M tokens | Implemented | `cost-calculator.service.ts` line 10 |
| If model not in pricing map: log warning, use 0 cost (no throw) | Implemented | `cost-calculator.service.ts` lines 26–31 |
| UsageLog write failures: catch silently with error log (no optimization rollback) | Implemented | `optimization.processor.ts` lines 96–100 — inner `try/catch` with `logger.error` |
| Only track the 7 optimization prompt types, not CV extraction | Implemented | Usage log call is in `OptimizationProcessor` which only handles optimization jobs |
| Failed optimization jobs do NOT produce usage logs | Implemented | Usage log call is inside the success `try` block; outer `catch` skips it |

---

## Files

### Created

- `apps/opticv-be/src/app/ai/services/cost-calculator.service.ts`
- `apps/opticv-be/src/app/ai/services/cost-calculator.service.spec.ts`
- `apps/opticv-be/src/app/ai/services/usage-log.service.ts`

### Modified

- `apps/opticv-be/src/app/ai/ai.module.ts` — added `CostCalculatorService` and `UsageLogService` to providers and exports
- `apps/opticv-be/src/app/optimization/optimization.processor.ts` — injected new services; added usage log call after COMPLETED update
- `apps/opticv-be/src/app/optimization/optimization.processor.spec.ts` — added mocks for `CostCalculatorService` and `UsageLogService`
- `docs/tasks-list.md` — task list updated

---

## Components

| Component | Status |
|---|---|
| `CostCalculatorService` | Exist |
| `UsageLogService` | Exist |
| `UsageLogParams` interface | Exist |
| `ModelPricing` interface | Exist |
| `PRICING` map constant | Exist |

---

## Stores

None specified in plan.

---

## Deviations

1. **Additional models in `PRICING` map** — Plan specified only `gpt-4o-mini`. Implementation also includes `gpt-4o`, `gpt-5-mini`, and `gpt-5.1` in the pricing map (`cost-calculator.service.ts` lines 11–13).
2. **`UsageLogService` uses constructor injection** — Plan noted to use `inject()` for new services (per conventions). `UsageLogService` uses constructor injection (`constructor(private readonly prisma: PrismaService)`).

---

## Additional Implementation

- `optimization.processor.spec.ts` updated with mocks for `CostCalculatorService` and `UsageLogService` and re-verified existing 5 test cases pass with the new dependencies wired in.
