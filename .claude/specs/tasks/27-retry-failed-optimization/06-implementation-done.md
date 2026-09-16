# Implementation Done

Task ID: 27-retry-failed-optimization

---

## Summary

Retry functionality was delivered for all six typed optimization panels (`RESUME_AUTOPSY`, `KEYWORD_GAP`, `SUMMARY_REWRITE`, `BULLET_UPGRADE`, `COVER_LETTER`, `INTERVIEW_PREP`). A `jobApplicationId` signal was added to preserve the job application ID across retries. A `retryablePromptTypes` computed set drives per-panel Retry button visibility. A `retryOptimization()` method handles the single-prompt re-run. Unit tests covering the new logic were also added.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Store `jobApplicationId` as a component signal after a run is initiated | Implemented | `readonly jobApplicationId = signal<string | null>(null)` added; set in `runOptimization` |
| Reset `jobApplicationId` on each new `runOptimization` call alongside `results` and `isProcessing` | Implemented | `this.jobApplicationId.set(jobApplication.id)` called at top of `runOptimization` |
| Add `retryOptimization(promptType: PromptType): void` method | Implemented | Present in `cv-optimization.ts` |
| Guard early if `jobApplicationId()` is null | Implemented | First line of `retryOptimization` |
| Set `isProcessing` to `true` for that `promptType` before calling API | Implemented | |
| Call `runSingleOptimizationProcess(jobApplicationId, promptType)` | Implemented | |
| On success, open `streamOptimizationEvents(jobApplicationId, runId)` | Implemented | Via `switchMap` |
| On `next` event: set `isProcessing` to `false` and update `results` | Implemented | |
| On `error`: set `isProcessing` to `false`; do not update `results` | Implemented | Error handler only updates `isProcessing` |
| Use `takeUntilDestroyed(this.destroyRef)` for cleanup | Implemented | |
| Add Retry button to panels 1–6 only (not panel 0 or 7) | Implemented | Panels 1–6 have button; panels 0 and 7 are unchanged |
| Button rendered with `@if (retryablePromptTypes().has(PromptType.X))` | Implemented | Exact pattern used in template |
| Button calls `retryOptimization(promptType)` on click | Implemented | |
| Button is disabled while `isProcessing().get(promptType)` is truthy | Implemented | `[disabled]` binding present on all six buttons |
| Button styled with PrimeNG `p-button`, severity `"warn"`, icon `pi pi-refresh` | Implemented | |
| Button positioned below `<app-optimization-result-panel>` | Implemented | Consistent across all six panels |
| Retry button absent before any run is initiated (`jobApplicationId` is null) | Implemented | `retryablePromptTypes` returns empty set when `jobApplicationId()` is null |
| Retry button absent while panel is processing | Implemented | `isProcessing` check inside `retryablePromptTypes` computed |
| Retry button absent after successful retry returning valid data | Implemented | Valid computed result causes prompt type to be excluded from `retryablePromptTypes` |
| Retry button visible when SSE status is `'failed'` | Implemented | |
| Retry button visible when SSE status is `'completed'` but computed signal is `null` | Implemented | |
| Rapid double-click prevention via `isProcessing` flag | Implemented | Button disabled on first click; `isProcessing` set to true immediately |
| HTTP error before SSE keeps button visible | Implemented | `results` not updated on error; previous failed entry preserved |
| SSE network error keeps button visible | Implemented | Same error handler pattern |
| No `any` types introduced | Implemented | All new code uses strict types |
| `ButtonModule` added to component imports | Implemented | Present in `@Component` imports array |

---

## Files

### Modified

| File | Change |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added `jobApplicationId` signal, `retryablePromptTypes` computed, `retryOptimization()` method, `ButtonModule` import |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Added Retry button block after `<app-optimization-result-panel>` in panels 1–6 |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Added unit tests for `retryablePromptTypes` and `retryOptimization` |

### Created

None.

---

## Components

| Component | Status |
|---|---|
| `CvOptimization` (modified) | Exist |

---

## Stores

None specified in the plan.

---

## Deviations

1. **`ariaLabel` added to Retry buttons.** The plan specified only `label`, `icon`, `severity`, `[disabled]`, and `(onClick)`. The implementation also adds an `ariaLabel` attribute to each `p-button` (e.g. `ariaLabel="Retry ATS Analysis"`). This was not in the plan or spec.

2. **Unit tests added.** The spec's acceptance criteria listed only build/typecheck/lint checks. A unit test file (`cv-optimization.spec.ts`) was modified to add `retryablePromptTypes` and `retryOptimization` test suites. This was not required by the plan.

---

## Additional Implementation

- `ariaLabel` attributes added to all six Retry buttons for accessibility (not in spec or plan).
- Unit tests for `retryablePromptTypes` computed signal and `retryOptimization` method added to the existing spec file (not required by spec acceptance criteria).
