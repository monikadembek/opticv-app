# Implementation Done

## Task

13-cv-optimization-first-step — First step of CV optimization creator (frontend only)

---

## Summary

The `/cv-optimization` route was implemented as a single-page component using PrimeNG `Stepper` with one active step. The step contains a CV dropdown (populated via `httpResource`) and a reactive job application form that POSTs to `/api/job-applications`. Navigation link added to authenticated top header menu. No new backend endpoints were created.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| New route `/cv-optimization` with `authGuard` | Implemented | `loadComponent` route with `canActivate: [authGuard]` |
| "CV Optimization" link in top nav (authenticated only) | Implemented | Added to `loggedInMenuItems` in `top-header.ts` |
| Lazy-loaded feature component `CvOptimizationPage` | Implemented | Route uses `loadComponent`; component class is `CvOptimization` (not `CvOptimizationPage`) |
| Stepper shell (single-column layout, Step 1 only) | Implemented | PrimeNG `p-stepper` with one `p-step-item` |
| CV selector dropdown (PrimeNG `Select`) populated from `GET /api/cv` | Implemented | Uses `httpResource` in `CvOptimizationApiService` |
| CV dropdown loading state (disabled/placeholder while loading) | Implemented | Placeholder text changes to "Loading CV list" while `cvList.isLoading()` |
| CV list empty state: "No CVs available" | Implemented | Rendered below dropdown when list is empty |
| CV list error state: show error + reload action | Implemented | Error message with "Reload" button shown when `cvList.error()` is truthy |
| Reactive form: `companyName` (required) | Implemented | `Validators.required`, `Validators.maxLength(256)` |
| Reactive form: `jobTitle` (required) | Implemented | `Validators.required`, `Validators.maxLength(256)` |
| Reactive form: `jobDescription` (required) | Implemented | `Validators.required`, `Validators.maxLength(5000)` |
| Reactive form: `notes` (optional) | Implemented | `Validators.maxLength(1000)` |
| Field-level validation messages on submit | Implemented | Per-field error messages shown when invalid + touched |
| "Run" button POSTs to `POST /api/job-applications` | Implemented | Button label is "Start Optimization Process" (not "Run") |
| Button loading/disabled state while request in flight | Implemented | `[loading]="isSubmitting()"`, `[disabled]="isSubmitting()"` |
| Success state: inline "CV processing is in progress" message | Not implemented | On success, a PrimeNG toast message is shown via `MessageService`; no inline message in form |
| Success state: form remains filled (no reset) | Implemented | Form is not reset on success |
| On error: inline error message shown | Implemented | `submitError` signal renders error text below button |
| On error: button re-enabled | Implemented | `isSubmitting` set to `false` in error handler |
| No double-submit (button disabled while in flight) | Implemented | `isSubmitDisabled` computed signal guards submission |
| `cvDocumentId` mapped from CV dropdown to POST body | Implemented | `cvDocumentId` is a `FormControl` within the reactive form |
| No `any` types | Implemented | |
| No `TODO` comments | Implemented | |
| Build passes | Not verified in this report | |
| Typecheck passes | Not verified in this report | |
| Lint passes | Not verified in this report | |

---

## Files

### Created

| File | Purpose |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts` | `httpResource` for CV list + POST job application |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.spec.ts` | Service unit tests |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-optimization-step1/cv-optimization-step1.ts` | Step 1 component logic |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-optimization-step1/cv-optimization-step1.html` | Step 1 template |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-optimization-step1/cv-optimization-step1.spec.ts` | Step 1 component unit tests |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Page component (stepper shell) |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Page template |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Page component unit tests |

### Modified

| File | Change |
|---|---|
| `apps/opticv-web/src/app/app.routes.ts` | Added `/cv-optimization` lazy route with `authGuard` |
| `apps/opticv-web/src/app/layout/top-header/top-header.ts` | Added "CV Optimization" to authenticated menu items |
| `apps/opticv-be/src/app/cv/cv.service.ts` | Modified (unrelated to frontend task scope) |

---

## Components

| Component (from plan) | Status | Note |
|---|---|---|
| `CvOptimizationApiService` | Exist | |
| `CvOptimizationStep1` | Exist | |
| `CvOptimizationStepper` (separate component) | Missing | Stepper is embedded directly in `CvOptimization` page component |
| `CvOptimizationPage` | Exist | Class named `CvOptimization`, not `CvOptimizationPage` |
| `cv-optimization.routes.ts` (lazy route file) | Missing | Route registered inline via `loadComponent` in `app.routes.ts` |

---

## Stores

No NgRx stores were planned or implemented. State is managed via signals on the component class and `httpResource` in the service.

---

## Deviations from Plan

1. **`CvOptimizationStepper` not created as a separate component.** The stepper is rendered directly inside the page component (`cv-optimization.ts` / `cv-optimization.html`) using PrimeNG `StepperModule`. No intermediate stepper shell component was created.

2. **`cv-optimization.routes.ts` not created.** The route was registered directly in `app.routes.ts` using `loadComponent` rather than `loadChildren` + a separate routes file.

3. **Page component named `CvOptimization`, not `CvOptimizationPage`.** File is `cv-optimization.ts`; class is `CvOptimization`.

4. **CV list fetched via `httpResource` in `CvOptimizationApiService`, not via `CvApiService`.** The plan specified reusing the existing `CvApiService`; instead, a new `httpResource` was added to `CvOptimizationApiService`.

5. **Success state uses PrimeNG toast, not inline message.** The spec required an inline "CV processing is in progress" message. The implementation calls `MessageService.add()` which shows a toast notification instead.

6. **`cvDocumentId` included inside the reactive `FormGroup`.** The plan specified a separate `selectedCvId` signal bound to `ngModel`; the implementation uses `formControlName="cvDocumentId"` inside the form.

7. **`activateCallback` input on `CvOptimizationStep1`.** An `input<(step: number) => void>()` is present on Step 1 to receive PrimeNG stepper's `activateCallback`. Not present in the plan.

8. **`runDisabled` computed does not check `cvLoading()` or `cvError()`.** The plan included both conditions; the implementation uses only `form.invalid || isSubmitting()`. CV loading/error states disable the CV field indirectly via the form control's `required` validator.

---

## Additional Implementation

- Unit test files created for `CvOptimizationApiService`, `CvOptimizationStep1`, and `CvOptimization` page (not in the plan).
- `reloadCvList()` method on `CvOptimizationApiService` and `reloadCvs()` method on `CvOptimizationStep1` (reload on error — partially in spec, not detailed in plan).
- `apps/opticv-be/src/app/cv/cv.service.ts` was modified as part of this branch; not covered by the frontend spec.
