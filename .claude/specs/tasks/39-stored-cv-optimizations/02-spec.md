# Task Specification

## Source

Azure DevOps Task: 39 — CV Optimizations: show list, delete optimization, open stored optimization

## Goal

Allow users to view, open, and delete their past CV optimizations from the Dashboard. Stored optimizations should be openable in the existing `cv-optimization` page, pre-populated with saved results.

## Context

Currently the Dashboard only shows uploaded CV files. Users can run a CV optimization from the `/cv-optimization` route, but there is no way to revisit past results. The backend already stores `JobApplication` records and associated `OptimizationResult` rows — this task exposes them through new API endpoints and a new Dashboard tab.

## Scope

### In scope

- **Dashboard**: Add a "Tabs (CVs / Optimizations)" layout — one tab for the existing CV file list, a new tab for past optimizations.
- **Optimizations tab**: List of past optimizations (one entry per `JobApplication`), showing job title + company, CV file name, and creation date.
- **Open optimization**: Clicking an optimization entry navigates to `/cv-optimization/:jobApplicationId`, which loads the stored results and pre-populates the existing component.
- **Delete optimization**: Each list entry has a delete action. Deleting removes the full `JobApplication` (cascades to its `OptimizationResult` rows).
- **Backend**: New endpoints to list job applications with their results, delete a job application, and load a full optimization by ID.
- **Shared types**: Add any new DTOs/response types needed.

### Out of scope

- Re-running or editing a stored optimization (no new run triggers from the view).
- Pagination or search/filter on the optimizations list (MVP: show all).
- Showing the ATS score on the list card (not requested).
- Deleting individual `OptimizationResult` rows without deleting the `JobApplication`.

## Behavior

### Dashboard tab layout

1. The Dashboard page renders a PrimeNG `TabView` (or `Tabs`) with two tabs:
   - **"My CVs"** — existing `CvFileList` component, unchanged.
   - **"My Optimizations"** — new `OptimizationList` component.
2. The active tab defaults to "My CVs" on first load.

### Optimizations tab

1. On tab activation, the component calls `GET /api/job-applications` (new endpoint — see API section).
2. While loading: show a spinner.
3. On success: render a list of `OptimizationListItem` cards. Each card shows:
   - Job title + company name (e.g. "Senior Angular Developer @ Acme Corp")
   - CV file name (from the linked `CvDocument.fileName`)
   - Created date (formatted as `MMM D, YYYY`)
   - **"Open"** button — navigates to `/cv-optimization/:jobApplicationId`
   - **"Delete"** button (icon, destructive style) — triggers confirmation dialog before deleting.
4. Empty state: if no optimizations exist, show a short message and a link to `/cv-optimization`.
5. On error: show an error message with a retry option.

### Delete flow

1. User clicks the Delete button on a list item.
2. A PrimeNG `ConfirmDialog` appears: "Are you sure you want to delete this optimization? This will permanently remove the job application and all associated results."
3. On confirm: call `DELETE /api/job-applications/:id`.
4. On success: remove the item from the list; show a success toast.
5. On error: show an error toast; list unchanged.

### Open / Load stored optimization

1. A new route `/cv-optimization/:jobApplicationId` is added to `app.routes.ts` (lazy-loaded, behind `authGuard`).
2. The existing `CvOptimization` component is reused for this route.
3. On init, if a `jobApplicationId` route param is present:
   a. Call `GET /api/job-applications/:id` to fetch job application details (jobTitle, companyName, jobDescription, notes, cvDocumentId).
   b. Call `GET /api/cv/:cvDocumentId/structured-data` to load `CvStructuredData`.
   c. Call `GET /api/optimizations/job-applications/:jobApplicationId/results` to load all stored `OptimizationResult` summaries (already exists).
   d. For each completed `OptimizationResult`, parse `structuredOutput` into the appropriate typed result and populate the `results` signal.
   e. Populate `jobSubmittedData` signal so the UI renders as if the user just completed optimization.
4. The `JobUpload` panel should be hidden when viewing a stored optimization (job data is already submitted).
5. All existing export, selection, and display functionality remains available.

## Edge Cases

- **Optimization in progress (PENDING/PROCESSING results)**: If a stored optimization has some results still in `PENDING` or `PROCESSING` status, display completed results and show a notice that some results are unavailable (no re-trigger from this view).
- **Missing structured output**: If a completed `OptimizationResult` has a null `structuredOutput`, skip it silently and show only the available results.
- **Navigating to `/cv-optimization/:id` for a non-existent or unauthorized job application**: Backend returns 404/403. Frontend shows an error state with a "Back to Dashboard" link.
- **No optimizations yet**: The "My Optimizations" tab shows an empty-state message with a CTA to start a new optimization.

## Data / API

### New backend endpoints

#### `GET /api/job-applications`
- Auth: required (userId from JWT)
- Returns: `JobApplicationListItem[]`
- Each item includes: `id`, `jobTitle`, `companyName`, `createdAt`, `cvDocument: { id, fileName }`

#### `GET /api/job-applications/:id`
- Auth: required; must belong to current user
- Returns: `JobApplicationDetail` — `id`, `jobTitle`, `companyName`, `jobDescription`, `notes`, `createdAt`, `cvDocumentId`, `cvDocument: { id, fileName }`

#### `DELETE /api/job-applications/:id`
- Auth: required; must belong to current user
- Cascades: deletes the `JobApplication` and all linked `OptimizationResult` rows (via Prisma cascade or explicit delete)
- Returns: `204 No Content`

### Existing endpoint used (no changes)

- `GET /api/optimizations/job-applications/:jobApplicationId/results` → `OptimizationResultSummary[]`
  - Already returns `promptType`, `status`, `structuredOutput`
- `GET /api/cv/:id/structured-data` → `{ data: CvStructuredData }`

### New / updated shared types (`@opticv/datatypes`)

```typescript
// New: list item for dashboard
interface JobApplicationListItem {
  id: string;
  jobTitle: string;
  companyName: string;
  createdAt: string; // ISO datetime
  cvDocument: {
    id: string;
    fileName: string;
  };
}

// New: detail for loading stored optimization
interface JobApplicationDetail extends JobApplicationListItem {
  jobDescription: string;
  notes: string | null;
  cvDocumentId: string;
}
```

### Database changes

None — `JobApplication` and `OptimizationResult` already exist. Cascade deletes should be confirmed in the Prisma schema (`onDelete: Cascade` on `OptimizationResult.applicationId` → `JobApplication`).

### Routing change

```typescript
// app.routes.ts — add alongside existing cv-optimization route
{
  path: 'cv-optimization/:jobApplicationId',
  loadComponent: () =>
    import('./features/cv-optimization/cv-optimization').then(
      (m) => m.CvOptimization,
    ),
  canActivate: [authGuard],
},
```

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web` and `npm exec nx build opticv-be`).
- Dashboard renders a two-tab layout; existing CV list is unchanged on the first tab.
- Optimizations tab loads and displays the list for the authenticated user.
- Empty state is shown when no optimizations exist.
- Delete confirmation dialog appears; confirmed delete removes the item and shows a toast.
- Navigating to `/cv-optimization/:jobApplicationId` for an existing optimization pre-populates all available results.
- Navigating to a non-existent/unauthorized ID shows an error state (no unhandled crash).
- No TypeScript errors; strict mode passes.
- Existing `/cv-optimization` (no param) flow is unaffected.
