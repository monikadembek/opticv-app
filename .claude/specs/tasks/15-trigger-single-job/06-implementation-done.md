# Implementation Done

## Task

15 — Trigger single job

---

## Summary

A new backend endpoint `POST /api/optimizations/job-applications/:jobApplicationId/run/:promptType` was added to allow manual re-triggering of a single optimization job for a given `promptType`. The implementation refactored shared validation logic out of `triggerOptimization()` into a private helper `loadAndValidateApplication()`, added a new `triggerSingleJob()` method to `OptimizationService`, and wired the new route in `OptimizationController`. Unit tests for the new method were added to the existing service spec file. No database schema changes, no processor changes, and no module changes were required.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| New `POST /api/optimizations/job-applications/:jobApplicationId/run/:promptType` endpoint | Implemented | `optimization.controller.ts` line 45 |
| Endpoint protected by `SupabaseGuard` | Implemented | Inherited from controller-level `@UseGuards(SupabaseGuard)` |
| Validate `:promptType` path param against `PromptType` enum — return 400 if invalid | Implemented | Controller lines 53–55 |
| Validate `runId` presence in request body — return 400 if missing | Implemented | Controller lines 57–59 |
| Return 403 if job application not found or userId mismatch | Implemented | Via `loadAndValidateApplication()` |
| Return 400 if CV document not parsed / parseStatus !== COMPLETED | Implemented | Via `loadAndValidateApplication()` |
| Return 400 if job description is empty | Implemented | Via `loadAndValidateApplication()` |
| Upsert `OptimizationResult` row to PENDING, clear all output fields | Implemented | Service lines 79–93 |
| Queue one BullMQ job with name `'optimize'`, same options as full run | Implemented | Service lines 95–99 — `attempts: 2`, exponential backoff 2000ms |
| Job payload includes caller-supplied `runId` | Implemented | Service line 97 |
| Return `202 Accepted` with `{ runId }` | Implemented | `@HttpCode(202)`, service line 101 |
| Existing full-run endpoint unchanged | Implemented | `triggerOptimization()` refactored but behaviour identical |
| No changes to `OptimizationProcessor` | Implemented | File untouched |
| No DB schema changes / no Prisma migration | Implemented | No migration added |
| Shared validation logic extracted to avoid duplication | Implemented | `loadAndValidateApplication()` private method |
| Build passes | Implemented | Webpack build confirmed passing |
| Typecheck passes | Implemented | Pre-existing unrelated failure in `cv-extraction.service.spec.ts`; optimization module clean |
| Tests added for `triggerSingleJob` | Implemented | 6 new test cases in `optimization.service.spec.ts` |
| No `TODO` comments | Implemented | |

---

## Files

### Modified

| File | Change |
|---|---|
| `apps/opticv-be/src/app/optimization/optimization.service.ts` | Extracted `loadAndValidateApplication()` private helper; added `triggerSingleJob()` public method |
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | Added `Body` import, `TriggerSingleJobDto` class, and `triggerSingleJob` route handler |
| `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` | Added `describe('triggerSingleJob')` block with 6 test cases |

### Created

None.

---

## Components

| Component | Status |
|---|---|
| `loadAndValidateApplication()` private method on `OptimizationService` | Exist |
| `triggerSingleJob()` public method on `OptimizationService` | Exist |
| `TriggerSingleJobDto` class in `optimization.controller.ts` | Exist |
| `triggerSingleJob` route handler on `OptimizationController` | Exist |

---

## Stores

Not applicable — this task is backend only with no frontend state management changes.

---

## Deviations

- `TriggerSingleJobDto` is defined inline in `optimization.controller.ts` rather than in a separate `dto/` subfolder. No `dto/` directory exists in the optimization module; the class lives at module scope in the controller file.

---

## Additional Implementation

None.
