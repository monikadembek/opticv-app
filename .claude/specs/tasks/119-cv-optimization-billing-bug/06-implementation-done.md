# Implementation Done — Task 119: CV optimization billing bug + stuck spinner

Scope of this report: commits `3478f46`, `17117e1`, `c4cfafa`, `1ca121e` and the uncommitted working-tree changes made after `05-code-review.md` (processor final-attempt handling; stale run-error clearing).

Spec review verdict (`03-spec-review.md`): **PASS WITH ISSUES**.

## Summary

- The UI now triggers the four CV-subset prompts with **one** `POST /run` call, which consumes one `CV_OPTIMIZATION` credit. `COVER_LETTER`, `INTERVIEW_PREP` and `LINKEDIN_REWRITE` each still use their own single-job call. Each trigger and its stream run independently.
- `OptimizationEventBus` keeps an in-process registry of runs: the expected job count and the distinct prompt types seen so far. The SSE stream closes when the registry reports the run complete. A 180 s idle timeout also closes it, sending `run-complete` with `timedOut: true`.
- The frontend client keeps each stream open until `run-complete`, and branches on `status: 'completed' | 'failed'`. On every failure path it clears `isProcessing` and records a per-card message (`runErrors`), which is rendered with `role="alert"`.
- Quota (`QUOTA_EXCEEDED`) and plan (`FEATURE_NOT_AVAILABLE`) rejections show messages naming the feature, and those cards do not offer Retry. Cards whose stream timed out do not offer Retry either.
- `retryFailedJob` consumes quota for a missing result row unless a sibling CV-subset row exists for the application.
- The processor writes `FAILED` and emits `failed` only on a job's final BullMQ attempt.

## Specification Coverage

| # | Requirement | Status | Note |
| --- | --- | --- | --- |
| 1 | `runOptimization()` resets run-scoped state | Implemented | Also resets `runErrors`, `stalledPrompts`, `planBlockedPrompts`. |
| 2 | One `POST /run` request for the CV subset | Implemented | `trackRun(..., CvSubsetPrompts, runFullOptimizationProcess(...))`. |
| 3 | Mark four CV-subset prompts processing; one SSE stream for the bulk `runId` | Implemented | |
| 4 | Separate `POST /run/:promptType` for `COVER_LETTER`, `INTERVIEW_PREP`, `LINKEDIN_REWRITE` | Implemented | `PerFeaturePrompts`. |
| 5 | One trigger failure does not cancel the others | Implemented | Per-trigger `catchError` → `EMPTY` inside `merge`. |
| 6 | Frontend branches on event `status` | Implemented | `handleJobEvent()`. |
| 7 | `completed` → clear processing, store result | Implemented | Also clears a prior run error for that prompt. |
| 8 | `failed` → clear processing, record error | Implemented | Falls back to a generic message when `error` is absent. |
| 9 | Stream stays open until `run-complete` or error | Implemented | `streamOptimizationEvents()` completes on `run-complete`. |
| 10 | Server closes after the run's queued jobs have reported | Implemented | `registerRun` / `isRunComplete` / `releaseRun`; counts distinct prompt types. |
| 11 | Idle-timeout backstop emits `run-complete`, unsubscribes, ends response | Implemented | `STREAM_IDLE_TIMEOUT_MS = 180_000`; payload `timedOut: true`. |
| 12 | `req.on('close')` cleanup remains | Implemented | Also clears the timer and releases the run. |
| 13 | Rejected trigger clears spinner and shows reason | Implemented | |
| 14 | 403 `QUOTA_EXCEEDED` shows a quota message naming the feature | Implemented | `FEATURE_NOT_AVAILABLE` handled with its own message. |
| 15 | Failed card exposes the existing retry action | Implemented | Not offered for quota/plan-rejected or timed-out cards. |
| E1 | Partial quota exhaustion affects only the rejected card | Implemented | |
| E2 | All quota exhausted: no spinner, page leaves `processing` | Implemented | |
| E3 | Job fails after trigger: error shown, free retry offered | Implemented | |
| E4 | Worker dies mid-job: idle timeout closes stream, card leaves processing, no retry | Implemented | `stalledPrompts`. |
| E5 | Stream error / connection drop: clear processing, show connection error | Implemented | |
| E6 | Duplicate trigger while in flight: unchanged behavior | Implemented | |
| E7 | SSR: `streamOptimizationEvents()` returns `EMPTY` | Implemented | Guard unchanged. |
| D1 | No DB schema changes, no `TIER_LIMITS` changes | Implemented | |
| D2 | No new routes; existing endpoint contracts kept | Implemented | Retry endpoint can now return 403 for never-paid rows (see Additional Implementation). |
| A1 | Build / lint / typecheck / test pass | Implemented | Recorded during this session: `opticv-be` 299 tests, `opticv-web` 1241 tests passing; typecheck passing; lint 0 errors. A full `run-many -t build` was not run. |
| A2 | FREE user's CV-subset run consumes exactly one credit | Implemented | Covered by service unit tests; manual verification not recorded. |
| A3 | No card left processing after a terminal outcome | Implemented | |
| A4 | 403 `QUOTA_EXCEEDED` renders a quota message, not a spinner | Implemented | |
| A5 | Stream closes server-side when a run's jobs have reported | Implemented | Controller spec `streamOptimization` suite. |
| A6 | Existing `cv-optimization.spec.ts` / `cv-optimization-api.service.spec.ts` updated | Implemented | |

## Files

### Created

None.

### Modified — backend

- `apps/opticv-be/src/app/optimization/optimization-event-bus.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`
- `apps/opticv-be/src/app/optimization/optimization.controller.ts`
- `apps/opticv-be/src/app/optimization/optimization.controller.spec.ts`
- `apps/opticv-be/src/app/optimization/optimization.processor.ts`
- `apps/opticv-be/src/app/optimization/optimization.processor.spec.ts`

### Modified — frontend

- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.spec.ts`

### Modified — docs / specs

- `docs/tasks-list.md`
- `.claude/specs/tasks/119-cv-optimization-billing-bug/00-raw-task.md`, `02-spec.md`, `03-spec-review.md`, `04-implementation-plan.md` (added)
- `.claude/specs/tasks/119-cv-optimization-billing-bug/05-code-review.md` (added)

## Components

| Component (from plan) | Status |
| --- | --- |
| `OptimizationEventBus` run registry (`registerRun`, `isRunComplete`, `releaseRun`) | Exist |
| `OptimizationService` run registration in `triggerOptimization` / `triggerSingleJob` / `retryFailedJob` | Exist |
| `OptimizationController.streamOptimization` completion + idle timeout | Exist |
| `CvOptimizationApiService.streamOptimizationEvents` multi-event stream | Exist |
| `CvOptimization` component — bulk + per-feature trigger split | Exist |
| `CvOptimization` component — `runErrors` signal and per-card message | Exist |
| `CvOptimization` component — `stalledPrompts` retry suppression | Exist |

## Stores

| Store (from plan) | Status |
| --- | --- |
| None defined in plan (component-local signals only) | — |

## Deviations

1. On `run-complete` with `timedOut: true`, `streamOptimizationEvents()` calls `observer.error(new OptimizationStreamTimeoutError())` instead of `observer.complete()`.
2. New exports in `cv-optimization-api.service.ts`: `SseRunCompleteEvent` interface and `OptimizationStreamTimeoutError` class.
3. `OptimizationEventBus.emit()` releases a run's registry entry immediately after listeners run once the run is complete, in addition to release on stream close.
4. `retryOptimization()` was refactored to use the shared `trackRun()` helper.
5. Trigger/stream handling is centralized in a private `trackRun()` helper with `handleJobEvent`, `handleStreamError`, `failPrompts`, `setProcessing`, `recordRunErrors`, `clearRunErrors`.
6. `optimization.processor.ts` and `optimization.processor.spec.ts` were modified; the plan listed the processor as unchanged.
7. `optimization.controller.ts` Swagger metadata for the retry endpoint was updated (summary, description, 403 response).

## Additional Implementation

> Additional implementation not covered by the original documents.

- `trackRun()` marks any prompt still processing when its stream completes normally as failed with a generic message.
- `planBlockedPrompts` signal: prompts rejected with `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE` are excluded from `retryablePromptTypes`.
- `retryFailedJob` charges quota (`checkAndConsume`) for a missing result row, unless the prompt is in the CV subset and a sibling CV-subset row exists (`isCvSubsetPaid()`). Previously a missing row was always retried for free.
- `OptimizationProcessor` writes `FAILED` and emits `status: 'failed'` only on the final BullMQ attempt (`job.attemptsMade + 1 >= job.opts.attempts`). Earlier attempts log a warning, leave the row `PROCESSING` and rethrow.
- `handleJobEvent()` clears a prompt's run error on a `completed` event.
