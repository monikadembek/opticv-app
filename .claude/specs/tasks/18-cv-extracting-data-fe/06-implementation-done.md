# Implementation Done

## Task

18-cv-extracting-data-fe

---

## Summary

The task added CV structured-data extraction as a side-effect of a successful job application submission. A new method was added to `CvOptimizationApiService` and called from `JobUpload.onSubmit()`. Unit tests were added for both the service method and the component interaction. No new files were created; four existing source files were modified.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Add `extractCvData(cvId: string)` method to `CvOptimizationApiService` | Implemented | Method exists, POSTs to `/api/cv/:id/extract` |
| Call `extractCvData()` in `JobUpload.onSubmit()` after `createJobApplication()` succeeds | Implemented | Called via `switchMap` after successful `createJobApplication` |
| Silent retry on failure (1 retry, no user-visible error) | Partially implemented | `retry(2)` is applied (2 retries, not 1 as specified); retry and `catchError` are applied in the component pipeline, not inside the service method |
| Return type `Observable<void>` with `retry(1)` and `catchError(() => EMPTY)` applied inside the method | Not implemented | Method returns `Observable<{ data: CvStructuredData }>` with no retry or catchError inside the service; these operators are applied in the component instead |
| Response body discarded via `map(() => void 0)` | Not implemented | Response body is not discarded; the raw `{ data: CvStructuredData }` response is passed to the subscriber |
| `extractCvData()` is NOT called when `createJobApplication()` fails | Implemented | `switchMap` is placed after `catchError(() => EMPTY)`, so extraction is skipped on failure |
| No new user-visible UI changes (no spinner, no new error messages for extraction) | Implemented | No template changes |
| No changes to the user-visible success/error flow | Partially implemented | Success toast is now shown in the `next` callback of `extractCvData`, not immediately after `createJobApplication` succeeds; toast is delayed until extraction completes |
| Unit tests for `extractCvData()` in `CvOptimizationApiService` | Implemented | `describe('extractCvData', ...)` block with 3 test cases added |
| Unit tests for `extractCvData()` call in `JobUpload` | Implemented | 2 test cases added: called with correct id on success; not called on failure |
| Build passes | Not verified by this report | |
| Type check passes | Not verified by this report | |

---

## Files

### Created

None.

### Modified

| File | Change |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts` | Added `extractCvData()` method |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.spec.ts` | Added `describe('extractCvData', ...)` test block with URL constant and 3 test cases |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts` | Added `switchMap` to call `extractCvData()` after `createJobApplication()` succeeds |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.spec.ts` | Added `extractCvData` to mock, added 2 test cases in `describe('onSubmit', ...)` |

---

## Components

| Component | Status |
|---|---|
| `JobUpload` (modified, not new) | Exist |

---

## Stores

None planned or implemented.

---

## Deviations

| # | Deviation |
|---|---|
| 1 | `extractCvData()` returns `Observable<{ data: CvStructuredData }>` instead of `Observable<void>`; the response body is not discarded inside the service |
| 2 | `retry` and `catchError` operators are applied in the component's `onSubmit()` pipeline, not inside `extractCvData()` |
| 3 | `retry(2)` is used instead of `retry(1)` as specified |
| 4 | The flow in `onSubmit()` uses `switchMap` to chain extraction, making the success toast dependent on extraction completing rather than being shown immediately after `createJobApplication()` succeeds |
| 5 | The service test verifies error propagation (no retry/catchError in service) rather than the retry and silent-swallow behaviour described in the plan |

---

## Additional Implementation

`console.log` statements added in `job-upload.ts`:
- `console.log('submit job description result: ', result)` — logs the job application response
- `console.log('extraced data from cv: ', extractedData)` — logs the extracted CV data
- `console.log('error when extracting data from cv: ', err)` — logs extraction errors

These were not in the specification or plan.
