# Task Specification

## Source

Azure DevOps Task: 18-cv-extracting-data-fe

## Goal

After a job application is successfully created, trigger CV structured-data extraction by calling `POST /api/cv/:id/extract`. The extraction runs as a background side-effect — it does not block the user's submission flow, and failures are retried silently.

## Context

The CV optimization feature lives at `/cv-optimization`. The `JobUpload` component (`features/cv-optimization/components/job-upload/job-upload.ts`) handles the submission form. All HTTP calls are made through `CvOptimizationApiService` (`features/cv-optimization/services/cv-optimization-api.service.ts`).

The backend endpoint `POST /api/cv/:id/extract` already exists and returns `{ data: CvStructuredData }`.

## Scope

### In scope

- Add `extractCvData(cvId: string)` method to `CvOptimizationApiService`
- Call `extractCvData()` in `JobUpload.onSubmit()` after `createJobApplication()` succeeds
- Silent retry on failure (1 retry, no user-visible error)
- No changes to the user-visible success/error flow

### Out of scope

- Displaying or storing the extracted `CvStructuredData` result
- Any backend changes
- Loading/spinner state tied to extraction
- Routing to a next step after extraction

## Behavior

1. User fills out the job upload form and clicks Submit.
2. `createJobApplication()` is called as today.
3. On success of `createJobApplication()`:
   a. The existing success toast is shown immediately (`isSubmitting` set to false).
   b. `extractCvData(cvDocumentId)` is called as a side-effect (does not block the toast or form reset).
4. If `extractCvData()` fails on the first attempt, it retries once automatically (`retry(1)` from RxJS).
5. If the retry also fails, the error is swallowed silently — no toast, no user feedback.
6. If `createJobApplication()` fails, `extractCvData()` is NOT called.

## Edge Cases

- `cvDocumentId` is always present when `onSubmit()` reaches the API call (enforced by form validation), so no null-guard is needed before passing it to `extractCvData()`.
- The extraction response body is ignored — the call is fire-and-forget from the UI's perspective.
- Network errors during retry are caught and discarded via `catchError(() => EMPTY)`.

## Data / API

**Endpoint:** `POST /api/cv/:id/extract`

**Request:** No body required.

**Response:**
```ts
{ data: CvStructuredData }
```
Response is ignored by the frontend in this task.

**New service method signature:**
```ts
extractCvData(cvId: string): Observable<void>
```
Returns `Observable<void>` (response body discarded via `map(() => void 0)`), with `retry(1)` and `catchError(() => EMPTY)` applied inside the method so callers subscribe without error handling.

## Assumptions

- The backend `POST /api/cv/:id/extract` endpoint is authenticated via the existing `AuthInterceptor` — no additional headers needed.
- "Silent retry" means exactly 1 retry attempt via RxJS `retry(1)`.
- The extraction is triggered even if the user navigates away after submission (the subscription will complete naturally if the component is destroyed, which is acceptable).

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- Type check passes (`npm exec nx typecheck opticv-web`)
- `extractCvData()` method added to `CvOptimizationApiService`, returns `Observable<void>` with retry + catchError
- `extractCvData()` is called in `onSubmit()` inside the `createJobApplication` success callback, after the toast is shown
- No new user-visible UI changes (no spinner, no new error messages for extraction)
- Unit tests updated for `CvOptimizationApiService` to cover the new method
