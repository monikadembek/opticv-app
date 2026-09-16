# Task Specification

## Source

Azure DevOps Task: 13 — First step of CV optimization creator

## Goal

Add a `/cv-optimization` page with a multi-step CV optimization creator. Implement Step 1 only: a CV selector dropdown and a job application form that saves to the backend on submit. The page is frontend-only; no new backend endpoints are needed.

## Context

- Feature lives in `apps/opticv-web/src/app/features/cv-optimization/`
- Protected route — requires `authGuard`
- Navigation item added to the top menu (authenticated users only)
- Backend endpoint already exists: `POST /api/job-applications`
- CV list fetched from existing `GET /api/cv` endpoint
- Shared types from `@opticv/datatypes`: `JobApplication`, `CreateJobApplicationDto` pattern

## Scope

### In scope

- New route `/cv-optimization` with `authGuard`
- "CV Optimization" link in top nav (authenticated menu only)
- Lazy-loaded feature component `CvOptimizationPage`
- Stepper shell component (single-column layout) — Step 1 only rendered
- Step 1 component with:
  - CV selector dropdown (PrimeNG `Select`, populated from `GET /api/cv`)
  - Job application reactive form: `companyName` (required), `jobTitle` (required), `jobDescription` (required), `notes` (optional)
  - "Run" button that POSTs to `POST /api/job-applications`
  - Success state: inline message "CV processing is in progress" shown after successful save
- `CvOptimizationApiService` for the POST call
- Reuse existing `CvApiService` for fetching the CV list

### Out of scope

- Steps 2–7 (shell exists but nothing is rendered for them yet)
- Any AI/optimization logic triggered after saving
- Navigation away from page after submit
- Error retry logic beyond showing an error message
- New backend endpoints

## Behavior

1. User navigates to `/cv-optimization` (redirected to login if unauthenticated).
2. Page renders the stepper with Step 1 visible.
3. Step 1 loads the user's CVs via `GET /api/cv` and populates the dropdown.
   - While loading: dropdown shows a loading state (disabled).
   - If the CV list is empty: dropdown shows a placeholder "No CVs available"; Run button is disabled.
4. User selects a CV from the dropdown.
5. User fills in the form:
   - `Company Name` — required text input
   - `Job Title` — required text input
   - `Job Description` — required textarea (for pasting job posting content)
   - `Notes` — optional textarea
6. User clicks "Run":
   - Button shows a loading/disabled state while the request is in flight.
   - On success: button returns to normal; an inline message "CV processing is in progress" appears below the form. Form remains filled (no reset).
   - On error: inline error message shown (e.g., "Something went wrong. Please try again."); button re-enabled.
7. The CV dropdown selection maps to `cvDocumentId` in the POST body.

## Edge Cases

- CV list fetch fails: show an inline error; dropdown disabled; Run button disabled.
- Form submitted with invalid fields: show field-level validation messages; block submission.
- "Run" clicked while a request is already in flight: button remains disabled (no double-submit).

## Data / API

### Existing endpoints used

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/cv` | Fetch user's uploaded CVs to populate the dropdown |
| `POST` | `/api/job-applications` | Save job application (triggers optimization in a future task) |

### POST `/api/job-applications` request body

```typescript
{
  cvDocumentId: string;   // from CV dropdown selection
  jobTitle: string;       // required
  companyName: string;    // required
  jobDescription: string; // required
  notes?: string;         // optional
}
```

### Types (from `@opticv/datatypes`)

- `CvDocument` — used for CV dropdown items
- `JobApplication` — returned by POST (id used if needed)

## File Structure

```
apps/opticv-web/src/app/features/cv-optimization/
  cv-optimization.routes.ts          # lazy route definition
  pages/
    cv-optimization-page/
      cv-optimization-page.ts        # page shell, hosts stepper
      cv-optimization-page.html
  components/
    cv-optimization-stepper/
      cv-optimization-stepper.ts     # stepper shell (Step 1 only for now)
      cv-optimization-stepper.html
    cv-optimization-step1/
      cv-optimization-step1.ts       # CV dropdown + job application form
      cv-optimization-step1.html
  services/
    cv-optimization-api.service.ts   # POST /api/job-applications
```

## Assumptions

- The existing `CvApiService` (from `features/dashboard/`) is injectable at root and can be reused directly.
- `GET /api/cv` returns an array of `CvDocument` objects; `id` is used as `cvDocumentId`, `fileName` or similar field used as display label in the dropdown.
- The stepper is a visual layout only (no step-validation logic needed now); future steps will be added as sibling components.
- PrimeNG `Select` (dropdown) component is used for CV selection, consistent with existing UI library usage.
- ReactiveForm (`FormGroup` / `FormControl`) is used for the job application form (not signal-based forms).
- All components use `ChangeDetectionStrategy.OnPush` and signals for local state.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- Typecheck passes (`npm exec nx typecheck opticv-web`)
- Lint passes (`npm exec nx lint opticv-web`)
- `/cv-optimization` route is accessible when authenticated, redirects to `/login` when not
- "CV Optimization" link appears in top nav for authenticated users only
- CV dropdown is populated from the API
- All required form fields show validation errors when empty and Run is clicked
- Successful POST shows "CV processing is in progress" message
- Failed POST shows error message; button re-enabled
- No `any` types introduced
- No `TODO` comments left in code
