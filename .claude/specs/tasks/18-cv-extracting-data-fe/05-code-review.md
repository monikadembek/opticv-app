# Code Review

## Task: 18-cv-extracting-data-fe

Reviewed by: Claude Code (senior fullstack engineer role)

---

### Summary

- **Overall result: FAIL**
- The implementation deviates significantly from the spec and plan in two critical ways: (1) `extractCvData()` in the service does not encapsulate `retry(1)` and `catchError(() => EMPTY)` as required, and returns `Observable<{ data: CvStructuredData }>` instead of `Observable<void>`; (2) the component chains extraction via `switchMap` inside the main submission pipe — blocking the success toast until extraction completes — rather than treating it as a fire-and-forget side-effect. The resulting user experience contradicts the spec's core behavioral requirement. Additionally, `retry(2)` is placed on the outer pipe, retrying the entire submission chain (including `createJobApplication`) rather than only the extraction.

---

### Conventions Violations

#### Critical (must fix before merge)

1. **`job-upload.ts` lines 116–118 — `console.log` in production code**
   `console.log('submit job description result: ', result)` and `console.log('extraced data from cv: ', extractedData)` (line 134) and `console.log('error when extracting data from cv: ', err)` (line 137) must be removed. Project rules require clean, production-grade code with no debug artifacts.

2. **`job-upload.ts` lines 119–125 — extraction blocks submission success flow**
   `extractCvData()` is called inside `switchMap`, making the success toast (`messageService.add`) fire only after extraction completes (or never if it errors). Spec section "Behavior" step 3a states: "The existing success toast is shown **immediately** … `extractCvData()` is called as a **side-effect** (does not block the toast or form reset)." The current design violates this requirement.

3. **`job-upload.ts` line 124 — `retry(2)` retries the entire submission chain**
   `retry(2)` is applied at the top level of the `createJobApplication` pipe. This means the entire observable — including the initial `createJobApplication` POST — is retried on any error from any step in the chain. Spec requires exactly `retry(1)` applied only to extraction, encapsulated inside `extractCvData()` in the service. This is a logic correctness defect.

4. **`cv-optimization-api.service.ts` lines 45–50 — `extractCvData` missing `retry`, `catchError`, and wrong return type**
   Spec explicitly defines: return type `Observable<void>` (body discarded via `map(() => void 0)`), with `retry(1)` and `catchError(() => EMPTY)` applied **inside** the method. The implementation returns `Observable<{ data: CvStructuredData }>` with no retry or error handling. This violates the spec's API contract and pushes error-handling responsibility to callers, which contradicts the "callers subscribe without error handling" requirement.

#### Non-Critical (should fix)

1. **`job-upload.ts` line 122 — unnecessary type assertion**
   `cvDocumentId as string` is used where `cvDocumentId` is already `string` in scope (extracted from `form.getRawValue()` at line 92). The assertion adds noise and suggests uncertain typing.

---

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `extractCvData(cvId: string): Observable<void>` added to service | Missing | Returns `Observable<{ data: CvStructuredData }>`, not `Observable<void>` |
| `map(() => void 0)` discards response body | Missing | Raw response returned directly |
| `retry(1)` encapsulated inside `extractCvData()` | Missing | Not present in service at all |
| `catchError(() => EMPTY)` encapsulated inside `extractCvData()` | Missing | Not present in service at all |
| `extractCvData()` called as a fire-and-forget after `createJobApplication()` success | Missing | Chained via `switchMap`, blocking success toast |
| Success toast shown immediately after `createJobApplication()` succeeds | Missing | Toast only fires after extraction resolves |
| `isSubmitting` set to false before extraction runs | Missing | `isSubmitting` is reset only in the `next` callback, after extraction |
| No user-visible error for extraction failure | Partial | `error` callback only `console.log`s, but the toast is also blocked if extraction errors |
| Exactly 1 retry on extraction failure | Missing | `retry(2)` on outer pipe — wrong count and wrong scope |
| Silent error swallow after retry exhausted | Missing | Errors from the outer retry could propagate to the `error` callback |
| No new user-visible UI changes | Covered | No template changes |
| Unit tests for `extractCvData()` in service spec | Partial | Test cases for retry and silent-catchError behaviors are absent |
| Unit tests: `extractCvData` called with `cvDocumentId` on success | Covered | `job-upload.spec.ts` line 243 |
| Unit tests: `extractCvData` NOT called on `createJobApplication` failure | Covered | `job-upload.spec.ts` line 249 |

---

### Plan Deviations

1. **Plan Step 1** states the operator chain order inside `extractCvData()` must be `map → retry(1) → catchError(() => EMPTY)`. None of these operators are present in the service implementation.

2. **Plan Step 2, test case 2** specifies the method "emits `void` (undefined) and completes". The test at `cv-optimization-api.service.spec.ts` line 154–167 instead asserts `emitted` equals the full mock response object `{ data: { name: 'John' } }`, and uses the variable name `emitted` typed as `unknown`. This test would fail if the spec-correct `map(() => void 0)` were applied, and it currently tests the wrong behavior.

3. **Plan Step 2, test cases 3 and 4** (retry once on first error, silent complete after two failures) are absent from the service spec file entirely.

4. **Plan Step 3** states: "No `.pipe()` needed in the call site — error handling is already encapsulated in the service method" and explicitly shows `this.cvOptimizationApiService.extractCvData(payload.cvDocumentId).subscribe()` as a standalone fire-and-forget call. The implementation instead uses `switchMap` inside the existing pipe with `retry(2)` at the outer level.

---

### Null Safety Issues

None beyond the unnecessary `as string` type assertion noted in Conventions.

---

### Code Smells

1. **`job-upload.ts` lines 116–118, 134, 137 — three `console.log` calls** left in the submission flow. These are debug artifacts and expose internal data (extraction results, errors) to the browser console in production.

2. **`job-upload.ts` lines 108–138 — extraction logic mixed into the submission pipeline** creates a pipe that conflates two concerns: job application creation (user-visible, must be reliable) and CV data extraction (background, fire-and-forget). This violates single-responsibility and makes the flow harder to reason about and test.

---

### Recommendation

- **Fix critical issues before merge**

The four critical issues must be addressed:
1. Move `retry(1)` and `catchError(() => EMPTY)` and `map(() => void 0)` into `extractCvData()` in the service, and fix the return type to `Observable<void>`.
2. Refactor `job-upload.ts` `onSubmit()` to show the success toast and reset `isSubmitting` immediately after `createJobApplication()` succeeds, then call `extractCvData().subscribe()` as a standalone fire-and-forget.
3. Remove `retry(2)` from the outer pipe.
4. Remove all `console.log` statements.
5. Fix the service spec to assert `void` emission and add missing retry/catchError test cases.
