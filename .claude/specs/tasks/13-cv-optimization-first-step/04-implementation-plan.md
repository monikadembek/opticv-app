# Implementation Plan

## Task

13-cv-optimization-first-step — First step of CV optimization creator (frontend only)

## Pre-implementation decisions (resolved from review gaps)

- **CV display field:** `CvDocumentListItem.fileName` — confirmed from shared types.
- **CV API return type:** `CvDocumentListItem[]` — returned by `CvApiService.getUserCvs()`.
- **Stepper:** Renders Step 1 only. No placeholder indicators for steps 2–7.
- **Run button disabled when:** CV not selected OR form invalid OR request in flight.
- **Success message:** Shown after successful POST; cleared when user clicks "Run" again (i.e., reset at the start of each submit attempt).

---

## Step 1 — Add `CvOptimizationApiService`

**File (create):** `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`

- `@Injectable({ providedIn: 'root' })`
- Inject `HttpClient`
- Method: `createJobApplication(payload: CreateJobApplicationPayload): Observable<JobApplicationResponse>`
  - POST to `/api/job-applications`
  - `CreateJobApplicationPayload` is a local interface (or inline type):
    ```
    { cvDocumentId: string; jobTitle: string; companyName: string; jobDescription: string; notes?: string }
    ```
  - Return type: `JobApplicationResponse` from `@opticv/datatypes`

---

## Step 2 — Build `CvOptimizationStep1` component

**File (create):** `apps/opticv-web/src/app/features/cv-optimization/components/cv-optimization-step1/cv-optimization-step1.ts`  
**File (create):** `apps/opticv-web/src/app/features/cv-optimization/components/cv-optimization-step1/cv-optimization-step1.html`

### Component class

- `ChangeDetectionStrategy.OnPush`
- Inject `CvApiService` and `CvOptimizationApiService`
- **Signals (local state):**
  - `cvList = signal<CvDocumentListItem[]>([])`
  - `cvLoading = signal(false)`
  - `cvError = signal<string | null>(null)`
  - `selectedCvId = signal<string | null>(null)`
  - `submitting = signal(false)`
  - `submitSuccess = signal(false)`
  - `submitError = signal<string | null>(null)`
- **Reactive form** (`FormGroup` with `FormBuilder`):
  - `companyName`: `Validators.required`
  - `jobTitle`: `Validators.required`
  - `jobDescription`: `Validators.required`
  - `notes`: no validators
- **`runDisabled` computed signal:**
  ```
  computed(() => !selectedCvId() || form.invalid || submitting() || cvLoading() || !!cvError())
  ```
- **`ngOnInit`:** call `loadCvs()`
- **`loadCvs()`:** set `cvLoading(true)`, call `CvApiService.getUserCvs()`, on success set `cvList`, on error set `cvError("Failed to load CVs. Please refresh.")`, always set `cvLoading(false)`
- **`onSubmit()`:**
  1. Guard: if `runDisabled()` return early
  2. `submitting.set(true)`, `submitSuccess.set(false)`, `submitError.set(null)`
  3. Build payload from `selectedCvId()` + form values
  4. Call `CvOptimizationApiService.createJobApplication(payload)`
  5. On success: `submitSuccess.set(true)`, `submitting.set(false)`
  6. On error: `submitError.set("Something went wrong. Please try again.")`, `submitting.set(false)`

### Template

- **CV dropdown:** PrimeNG `<p-select>` bound to `selectedCvId` signal (use `[ngModel]` / event binding pattern since this is outside the ReactiveForm)
  - `[options]="cvList()"`, `optionLabel="fileName"`, `optionValue="id"`
  - `[disabled]="cvLoading() || !!cvError()"`
  - Loading placeholder: `placeholder="Loading CVs..."` when `cvLoading()` is true; `placeholder="No CVs available"` when list is empty
- **CV load error:** `@if (cvError())` — show error message string
- **Form** (`[formGroup]="form"`):
  - Company Name: `<input pInputText formControlName="companyName">`  
    - `@if` field invalid + touched → show "Company name is required"
  - Job Title: `<input pInputText formControlName="jobTitle">`  
    - `@if` field invalid + touched → show "Job title is required"
  - Job Description: `<textarea pTextarea formControlName="jobDescription">`  
    - `@if` field invalid + touched → show "Job description is required"
  - Notes: `<textarea pTextarea formControlName="notes">` (no validation message)
- **Run button:** `<p-button label="Run" (onClick)="onSubmit()" [disabled]="runDisabled()" [loading]="submitting()">`
- **Success message:** `@if (submitSuccess())` — inline text "CV processing is in progress"
- **Error message:** `@if (submitError())` — show `submitError()` string

---

## Step 3 — Build `CvOptimizationStepper` component

**File (create):** `apps/opticv-web/src/app/features/cv-optimization/components/cv-optimization-stepper/cv-optimization-stepper.ts`  
**File (create):** `apps/opticv-web/src/app/features/cv-optimization/components/cv-optimization-stepper/cv-optimization-stepper.html`

- `ChangeDetectionStrategy.OnPush`
- No inputs or outputs (self-contained for now)
- Imports: `CvOptimizationStep1`
- Template: renders `<app-cv-optimization-step1>` in a single-column layout
- Layout: step label "Step 1" above the step component; no other steps rendered

---

## Step 4 — Build `CvOptimizationPage` component

**File (create):** `apps/opticv-web/src/app/features/cv-optimization/pages/cv-optimization-page/cv-optimization-page.ts`  
**File (create):** `apps/opticv-web/src/app/features/cv-optimization/pages/cv-optimization-page/cv-optimization-page.html`

- `ChangeDetectionStrategy.OnPush`
- Imports: `CvOptimizationStepper`
- Template: page heading "CV Optimization" + `<app-cv-optimization-stepper>`

---

## Step 5 — Create lazy route

**File (create):** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.routes.ts`

```
export const cvOptimizationRoutes: Route[] = [
  {
    path: '',
    component: CvOptimizationPage,
  },
];
```

---

## Step 6 — Register route in `app.routes.ts`

**File (modify):** `apps/opticv-web/src/app/app.routes.ts`

Add before the wildcard/redirect entries:

```
{
  path: 'cv-optimization',
  loadChildren: () =>
    import('./features/cv-optimization/cv-optimization.routes')
      .then((m) => m.cvOptimizationRoutes),
  canActivate: [authGuard],
},
```

---

## Step 7 — Add nav menu item

**File (modify):** `apps/opticv-web/src/app/layout/top-header/top-header.ts`

In the `loggedInMenuItems` array inside the `effect()`, add:

```
{ label: 'CV Optimization', route: '/cv-optimization' }
```

Position: after "Dashboard", before "Upload CV" (or at end of logged-in items — order to be confirmed visually).

---

## Files Summary

### Created

| File | Purpose |
|------|---------|
| `features/cv-optimization/services/cv-optimization-api.service.ts` | POST /api/job-applications |
| `features/cv-optimization/components/cv-optimization-step1/cv-optimization-step1.ts` | Step 1 logic |
| `features/cv-optimization/components/cv-optimization-step1/cv-optimization-step1.html` | Step 1 template |
| `features/cv-optimization/components/cv-optimization-stepper/cv-optimization-stepper.ts` | Stepper shell |
| `features/cv-optimization/components/cv-optimization-stepper/cv-optimization-stepper.html` | Stepper template |
| `features/cv-optimization/pages/cv-optimization-page/cv-optimization-page.ts` | Page component |
| `features/cv-optimization/pages/cv-optimization-page/cv-optimization-page.html` | Page template |
| `features/cv-optimization/cv-optimization.routes.ts` | Lazy route config |

### Modified

| File | Change |
|------|--------|
| `apps/opticv-web/src/app/app.routes.ts` | Add `/cv-optimization` lazy route with `authGuard` |
| `apps/opticv-web/src/app/layout/top-header/top-header.ts` | Add "CV Optimization" to authenticated menu items |

---

## Acceptance Checklist

- [ ] `npm exec nx build opticv-web` passes
- [ ] `npm exec nx typecheck opticv-web` passes
- [ ] `npm exec nx lint opticv-web` passes
- [ ] `/cv-optimization` redirects to `/login` when unauthenticated
- [ ] `/cv-optimization` loads when authenticated
- [ ] "CV Optimization" appears in top nav only when logged in
- [ ] CV dropdown populated from API; disabled while loading or on error
- [ ] Run button disabled until CV selected and all required fields valid
- [ ] Run button shows loading state during submit
- [ ] Successful POST shows "CV processing is in progress" message
- [ ] Failed POST shows error message; Run button re-enabled
- [ ] No `any` types
- [ ] No `TODO` comments
