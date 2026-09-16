# Implementation Plan

## Source

Spec: `.claude/specs/tasks/18-cv-extracting-data-fe/02-spec.md`
Review: `.claude/specs/tasks/18-cv-extracting-data-fe/03-spec-review.md` (PASS)

---

## Overview

Two files are changed. No new files are created. No routing, no UI, no shared types changes.

1. `cv-optimization-api.service.ts` — add `extractCvData()` method
2. `cv-optimization-api.service.spec.ts` — add tests for `extractCvData()`
3. `job-upload.ts` — call `extractCvData()` as a fire-and-forget side-effect after `createJobApplication()` succeeds
4. `job-upload.spec.ts` — update mock of `CvOptimizationApiService` and add test coverage for the new call

---

## Step 1 — Add `extractCvData()` to `CvOptimizationApiService`

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`

### Changes

1. Add RxJS imports: `retry`, `catchError`, `map`, `EMPTY` from `'rxjs'` and `'rxjs/operators'`.
2. Add the method:

```ts
extractCvData(cvId: string): Observable<void>
```

- `POST` to `${environment.apiUrl}/cv/${cvId}/extract` with no body (`{}`).
- `map` the response to `void` (discard body).
- Apply `retry(1)` — one automatic retry on failure.
- Apply `catchError(() => EMPTY)` — swallow all errors after the retry.
- Return type is `Observable<void>`.

The operator chain order is: `map` → `retry(1)` → `catchError(() => EMPTY)`.

> Note: `retry(1)` must come after `map` but before `catchError` so the full HTTP + map pipeline is retried, and `catchError` acts as the final safety net.

---

## Step 2 — Update `CvOptimizationApiService` tests

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.spec.ts`

### Changes

1. Add URL constant: `const CV_EXTRACT_URL = (id: string) => \`${environment.apiUrl}/cv/${id}/extract\``.
2. Add `describe('extractCvData', ...)` block (inside the existing `describe('CvOptimizationApiService', ...)`). Each test must flush the initial `GET /cv` request in `beforeEach`.

### Test cases

| # | Description |
|---|-------------|
| 1 | POSTs to `/api/cv/:id/extract` with no body |
| 2 | Emits `void` (undefined) and completes on success |
| 3 | Retries once on first HTTP error; succeeds on retry |
| 4 | Silently completes (emits nothing, no error) after two consecutive failures |

---

## Step 3 — Call `extractCvData()` in `JobUpload.onSubmit()`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts`

### Changes

Inside the `next` callback of the `createJobApplication()` subscription — after the success toast is shown and `isSubmitting` is set to false — add:

```ts
this.cvOptimizationApiService.extractCvData(payload.cvDocumentId).subscribe();
```

- No `.pipe()` needed in the call site — error handling is already encapsulated in the service method.
- No `takeUntilDestroyed` or manual unsubscription needed — the in-flight HTTP request will complete on its own (this is the accepted fire-and-forget pattern per the spec).
- No new signals, no new injections, no template changes.

The `payload` variable is already in scope (constructed earlier in `onSubmit()`), so `payload.cvDocumentId` is guaranteed non-null at this point.

---

## Step 4 — Update `JobUpload` tests

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.spec.ts`

### Changes

1. Add `extractCvData: ReturnType<typeof vi.fn>` to the `apiService` mock object.
2. In `beforeEach`, initialise it: `extractCvData: vi.fn().mockReturnValue(of(undefined))`.
3. Add test cases inside the existing `describe('onSubmit', ...)` block:

| # | Description |
|---|-------------|
| 1 | Calls `extractCvData` with the submitted `cvDocumentId` after successful `createJobApplication` |
| 2 | Does NOT call `extractCvData` when `createJobApplication` fails |

> Note: The existing test `'should invoke activateCallback with step 2 on success'` references an `activateCallback` input that does not exist on the current component. This is out of scope — do not fix or remove it; leave it as-is.

---

## Checklist

- [ ] Step 1: Add `extractCvData()` to service
- [ ] Step 2: Add service unit tests
- [ ] Step 3: Call `extractCvData()` in `onSubmit()`
- [ ] Step 4: Update component unit tests
- [ ] Run `npm exec nx typecheck opticv-web` — must pass
- [ ] Run `npm exec nx test opticv-web` — must pass
- [ ] Run `npm exec nx build opticv-web` — must pass
