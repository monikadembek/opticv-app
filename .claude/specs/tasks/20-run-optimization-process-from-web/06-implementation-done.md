# Implementation Done — Task 20: Trigger Optimization Process from Web

## Summary

Task 20 implements the frontend SSE-based optimization trigger flow. The backend `SupabaseGuard` was extended to accept a JWT from the `token` query parameter (required for `EventSource` which cannot set custom headers). A new `streamOptimizationEvents()` method was added to `CvOptimizationApiService`, wrapping native `EventSource` in an Observable with SSR guard and teardown. The `CvOptimization` component was updated to drive a per-`PromptType` run→stream pipeline with bounded concurrency (3). All 7 accordion panels now display streamed results via `| json` pipe, with processing and status indicators in the accordion headers. Unit tests were added for all new service methods and component behavior, including the new guard query-param auth path.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Trigger `runSingleOptimizationProcess` per `PromptType` | Implemented | `from(Object.values(PromptType))` + `mergeMap` with concurrency 3 |
| Implement `streamOptimizationEvents()` using native `EventSource` Observable | Implemented | Added to `CvOptimizationApiService` |
| `isPlatformBrowser` guard for SSR — return `EMPTY` on server | Implemented | First check in `streamOptimizationEvents` |
| `SupabaseGuard` fallback to `request.query['token']` when `Authorization` header absent | Implemented | Token resolution uses ternary chain: header first, then `request.query['token']` |
| `SseJobCompleteEvent` local interface exported from service | Implemented | Defined in `cv-optimization-api.service.ts` |
| `results` signal typed as `Map<PromptType, SseJobCompleteEvent>` | Implemented | |
| Close `EventSource` after `job-complete` (not after `run-complete`) | Implemented | Per plan deviation: `observer.complete()` + `es.close()` inside `job-complete` handler |
| `run-complete` event closes `EventSource` | Not implemented | Plan explicitly decided to close on `job-complete` instead; `run-complete` listener was intentionally omitted |
| `takeUntilDestroyed` to close streams on component destroy | Implemented | Applied to the `mergeMap` pipeline in `runOptimization` |
| Reset `results` signal on re-submission | Implemented | `this.results.set(new Map())` at start of `runOptimization` |
| Template renders result per panel using `@if` / `@else` | Implemented | All 7 `PromptType` panels covered |
| Handle SSE `error` events — log and close | Implemented | `es.onerror` → `observer.error(err)` + `es.close()` |
| `JsonPipe` imported in component | Implemented | Listed in `imports` array |
| Inject `PLATFORM_ID` and `Supabase` service into `CvOptimizationApiService` | Implemented | Both injected via `inject()` |
| Construct SSE URL with `?runId=<runId>&token=<access_token>` | Implemented | |
| `DestroyRef` injected in component | Implemented | |
| `readonly PromptType = PromptType` exposed on component for template | Implemented | |
| Observable teardown closes `EventSource` on unsubscribe | Implemented | Teardown function returns `() => es.close()` |

---

## Files

### Modified

| File | Change description |
|---|---|
| `apps/opticv-be/src/app/auth/supabase.guard.ts` | Extended `canActivate` to fall back to `request.query['token']` when `Authorization` header is absent |
| `apps/opticv-be/src/app/auth/supabase.guard.spec.ts` | Added `describe('query param token (SSE fallback)')` block with 4 new tests |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts` | Added `SseJobCompleteEvent` interface, injected `PLATFORM_ID` and `Supabase`, added `streamOptimizationEvents()` method |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.spec.ts` | Added `describe('streamOptimizationEvents')` block with 6 new tests |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Rewrote `runOptimization()`, added `results` and `isProcessing` signals, added `DestroyRef` and `PromptType` class properties, added `JsonPipe` to `imports` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Added `describe('runOptimization')` block with 7 new tests |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Replaced "Coming soon" placeholders with `@if` / `@else` result rendering; added processing spinners and status badges in accordion headers for all 7 PromptType panels |

### Created

None.

---

## Components

| Component | Status |
|---|---|
| `CvOptimization` (modified) | Exist |
| `CvOptimizationApiService` (modified) | Exist |
| `SupabaseGuard` (modified) | Exist |

---

## Stores

None specified in the plan. No NgRx signal stores were added or modified for this task.

---

## Deviations from Plan

1. **`run-complete` listener omitted** — The plan (Step 2c) specified registering an `es.addEventListener('run-complete', ...)` handler. The implementation does not add this listener. Instead, the `EventSource` is closed immediately inside the `job-complete` handler. This matches the plan's own "Critical Issue #2" resolution: `run-complete` would never fire for single-job runs because `TOTAL_JOBS === 7` but only 1 job completes per single-job run.

2. **`isProcessing` signal added** — The plan does not specify an `isProcessing` signal. The implementation adds `readonly isProcessing = signal<Map<PromptType, boolean>>(new Map())`, sets it to `true` inside `switchMap` when a stream opens, and clears it to `false` in the `next` callback. It is also reset to an empty `Map` at the start of `runOptimization`. This signal drives processing spinner and status badge rendering in the accordion headers.

3. **Template adds per-panel status badges** — The plan specifies a simple `@if / @else` with `r.result | json` and "Coming soon" fallback. The implementation additionally renders a spinner (`isProcessing`), green "COMPLETED" badge, and red "FAILED" badge in each accordion panel header.

4. **`console.log('SSE - job complete event:', event)` remains in production code** — The code review identified this as a critical issue. The current branch state retains this debug log. The TODO comments and `tap` debug operator flagged in the code review have been removed.

---

## Additional Implementation

1. **`isProcessing` signal and template status indicators** — Not covered by the original spec or plan. Adds per-`PromptType` loading state visible in accordion headers (spinner while processing, green/red status badge after completion).

2. **Error display in accordion content panels** — The plan specifies only `r.result | json` and "Coming soon". The implementation also adds an `@else if (results().get(PromptType.X)?.error; as error)` branch that renders the error message in red text inside the panel content when a job fails.
