# Implementation Plan

Task: 39 — CV Optimizations: show list, delete optimization, open stored optimization

## Pre-implementation findings (from code audit)

Before implementing, these facts from the actual codebase override spec assumptions:

- **All 3 backend endpoints already exist** in `JobApplicationController`: `GET /job-applications`, `GET /job-applications/:id`, `DELETE /job-applications/:id`. No new endpoints needed.
- **`OptimizationResultSummaryDto` lacks `structuredOutput`** — must be added to both the DTO class and the `OptimizationResultSummary` shared type, and the Prisma select in `getOptimizationResultSummaries` must include it.
- **`JobApplicationListItem` lacks `cvDocument.fileName`** — `findAll` selects only flat fields; must add a `cvDocument: { select: { id, fileName } }` include.
- **`JobApplicationResponse` lacks `cvDocument`** — `findOne` fetches a bare record; must add a `cvDocument` include for the open-optimization flow.
- **`CvOptimization` has no `jobSubmittedData` signal** — "stored mode" is activated by directly setting `jobApplicationId` and `cvStructuredData` signals, then populating `results`.
- **Cascade delete is already in the Prisma schema** (`onDelete: Cascade` on `OptimizationResult.applicationId`). No migration needed.
- **Route collision fix**: the parameterized route `/cv-optimization/:jobApplicationId` must be declared **before** the parameterless `/cv-optimization` route in `app.routes.ts`.

---

## Step 1 — Shared types (`packages/shared/datatypes/src/lib/datatypes.ts`)

**Modify:**

1. Add `structuredOutput: unknown` field to `OptimizationResultSummary` type.
2. Add `cvDocument: { id: string; fileName: string }` field to `JobApplicationListItem` type.
3. Add `cvDocument: { id: string; fileName: string }` field to `JobApplicationResponse` type (alias `JobApplication` itself needs the field, or create a new `JobApplicationWithCv` type).

   - Prefer a new exported type `JobApplicationWithCv` that extends `JobApplication` with `cvDocument: { id: string; fileName: string }` to avoid breaking `JobApplicationResponse` consumers that don't need the relation.

---

## Step 2 — Backend: `OptimizationResultSummaryDto` and service

**File: `apps/opticv-be/src/app/optimization/dto/optimization-result-summary.dto.ts`**

- Add `structuredOutput: unknown | null` field with `@ApiProperty({ nullable: true })`.

**File: `apps/opticv-be/src/app/optimization/optimization.service.ts`**

- In `getOptimizationResultSummaries`, add `structuredOutput: true` to the Prisma `select` block.
- Update the return type cast to include the new field.

---

## Step 3 — Backend: `JobApplicationService` — add `cvDocument` to list and detail

**File: `apps/opticv-be/src/app/job-application/job-application.service.ts`**

1. **`findAll`**: Replace `select` with an `include` (or augment the `select` to add a nested `cvDocument: { select: { id: true, fileName: true } }`). Update the return type to `JobApplicationListResponse` (which uses `JobApplicationListItem` — updated in Step 1).

2. **`findOne`**: Add `include: { cvDocument: { select: { id: true, fileName: true } } }` to the `findUnique` call. Update the return type to `JobApplicationWithCv`.

**File: `apps/opticv-be/src/app/job-application/dto/job-application-response.dto.ts`**

- Add a nested `cvDocument` object property to `JobApplicationListItemDto` and `JobApplicationResponseDto`.

**File: `apps/opticv-be/src/app/job-application/job-application.controller.ts`**

- Update the `findOne` return type annotation to `JobApplicationWithCv`.

---

## Step 4 — Frontend: new `JobApplicationApiService`

Create a new service dedicated to job application API calls, used by the dashboard and the cv-optimization page.

**New file: `apps/opticv-web/src/app/features/dashboard/services/job-application-api.service.ts`**

- `providedIn: 'root'`
- Methods:
  - `getJobApplications(): Observable<JobApplicationListItem[]>` — `GET /job-applications` (no query params for MVP)
  - `deleteJobApplication(id: string): Observable<void>` — `DELETE /job-applications/:id`

**New file: `apps/opticv-web/src/app/features/cv-optimization/services/job-application-api.service.ts`**

- Do **not** duplicate. Instead, place the service in a shared location so both the dashboard and cv-optimization feature can use it.
- Place at: `apps/opticv-web/src/app/core/services/job-application-api.service.ts`
- Methods (used from cv-optimization):
  - `getJobApplication(id: string): Observable<JobApplicationWithCv>` — `GET /job-applications/:id`

---

## Step 5 — Frontend: `OptimizationList` component (new)

**New file: `apps/opticv-web/src/app/features/dashboard/components/optimization-list/optimization-list.ts`**

Standalone component, `ChangeDetectionStrategy.OnPush`.

**Signals:**
- `items = signal<JobApplicationListItem[]>([])`
- `isLoading = signal(false)`
- `error = signal<string | null>(null)`

**Injected:**
- `JobApplicationApiService` (via `inject()`)
- `Router` (via `inject()`)
- `ConfirmationService` (via `inject()`)
- `MessageService` (via `inject()`)

**Lifecycle:** `OnInit` — call `loadOptimizations()` on init.

**Methods:**
- `loadOptimizations()` — calls `getJobApplications()`, sets signals.
- `onOpen(item: JobApplicationListItem)` — navigates to `/cv-optimization/:item.id`.
- `onDelete(item: JobApplicationListItem)` — shows `ConfirmDialog`, on confirm calls `deleteJobApplication`, removes item from list on success, shows success toast; shows error toast on failure.

**Template:** (inline or separate `.html` file, per conventions)
- `@if (isLoading())` → spinner
- `@else if (error())` → error message + retry button calling `loadOptimizations()`
- `@else if (items().length === 0)` → empty state message + `routerLink="/cv-optimization"` button
- `@else` → `@for (item of items(); track item.id)` → card per item showing job title + company, CV file name, created date, Open button, Delete button

**Date formatting:** use Angular's `DatePipe` with format `'MMM d, yyyy'`.

---

## Step 6 — Frontend: Dashboard refactor to tabs

**File: `apps/opticv-web/src/app/features/dashboard/dashboard.ts`**

- Import PrimeNG `TabsModule` (or `TabViewModule` — use whichever is available in PrimeNG 21; check existing imports in the project; PrimeNG 21 uses `p-tabs` / `p-tab-list` / `p-tab` / `p-tab-panels` / `p-tab-panel` from `TabsModule`).
- Import `OptimizationList` component.
- Remove `isLoading`, `error`, `selectedFile` signals that are now owned by child components.
- Keep `cvFiles`, `onDownload`, `onDelete` (still needed by `CvFileList`).
- Keep `ConfirmationService` provider (still needed for CV delete in dashboard scope).

**File: `apps/opticv-web/src/app/features/dashboard/dashboard.html`**

- Replace the current `@if`/`@else` structure with a PrimeNG `Tabs` layout:
  ```
  <p-tabs value="0">
    <p-tab-list>
      <p-tab value="0">My CVs</p-tab>
      <p-tab value="1">My Optimizations</p-tab>
    </p-tab-list>
    <p-tab-panels>
      <p-tab-panel value="0">
        <!-- existing CV loading/error/list logic -->
      </p-tab-panel>
      <p-tab-panel value="1">
        <app-optimization-list />
      </p-tab-panel>
    </p-tab-panels>
  </p-tabs>
  ```
- The CV tab panel retains the existing spinner/error/empty/list rendering from the current template.
- `h1` heading changes from "My CVs" to "Dashboard" (or keep it — no strong opinion, but it should reflect the page, not just one tab).

---

## Step 7 — Frontend: `CvOptimization` — stored mode

**File: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`**

1. Inject `ActivatedRoute` and `Router` via `inject()`.
2. Inject `JobApplicationApiService` and `CvOptimizationApiService` (already injected).
3. Add signal: `isStoredMode = signal(false)`.
4. Add signal: `loadError = signal<string | null>(null)`.
5. Implement `OnInit`. In `ngOnInit`:
   - Read `jobApplicationId` from `ActivatedRoute.snapshot.paramMap.get('jobApplicationId')`.
   - If present: set `isStoredMode.set(true)`, call `loadStoredOptimization(jobApplicationId)`.
6. Add method `loadStoredOptimization(id: string)`:
   - Parallel calls via `forkJoin`:
     - `jobApplicationApiService.getJobApplication(id)` → sets `this.jobApplicationId.set(id)` and `this.cvStructuredData.set(cvData)` from the subsequent CV structured-data call.
     - `cvOptimizationApiService.getOptimizationResults(id)` → for each result with `status === 'COMPLETED'` and non-null `structuredOutput`, build a `SseJobCompleteEvent`-shaped object `{ promptType, status: 'completed', result: structuredOutput }` and populate the `results` signal.
   - On the job application response, use `cvDocumentId` to call `cvOptimizationApiService.extractCvData` is **not** needed — the CV structured data comes from the `GET /cv/:id/structured-data` endpoint (already exists in `CvOptimizationApiService`).
   - Add `getCvStructuredData(cvId: string): Observable<{ data: CvStructuredData }>` to `CvOptimizationApiService` if it doesn't exist (it currently uses `extractCvData` which triggers a POST extraction — use `GET /cv/:id/structured-data` instead via a new `getStructuredData` method).
   - On any error: set `loadError`.
7. **Hiding `JobUpload`**: in the template, wrap the `p-accordion` containing `app-job-upload` with `@if (!isStoredMode())`.
8. **Partial results notice**: if `isStoredMode()` is true, show an info banner above the results accordion if any `ActivePrompts` are missing from `results()` (i.e., the result map doesn't have a completed entry for them).
9. **Load error state**: at the top of the template, add `@if (loadError())` block showing the error message and a "Back to Dashboard" `routerLink="/dashboard"` button.

**File: `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`**

- Add method `getStructuredData(cvId: string): Observable<{ data: CvStructuredData }>`:
  - `GET /cv/:cvId/structured-data` (read-only, does not trigger extraction).

---

## Step 8 — Frontend: routing

**File: `apps/opticv-web/src/app/app.routes.ts`**

- Add the parameterized route **before** the existing parameterless route:

```typescript
{
  path: 'cv-optimization/:jobApplicationId',
  loadComponent: () =>
    import('./features/cv-optimization/cv-optimization').then(
      (m) => m.CvOptimization,
    ),
  canActivate: [authGuard],
},
{
  path: 'cv-optimization',   // existing, unchanged
  ...
},
```

---

## Step 9 — Verification checklist (Acceptance)

- [ ] `npm exec nx build opticv-be` passes with no TypeScript errors.
- [ ] `npm exec nx build opticv-web` passes with no TypeScript errors.
- [ ] Dashboard renders two tabs; "My CVs" tab behaves identically to the pre-task dashboard.
- [ ] "My Optimizations" tab loads and displays the correct list for the authenticated user.
- [ ] Each list card shows: job title + company, CV file name, creation date.
- [ ] Empty state renders when no optimizations exist, with CTA link to `/cv-optimization`.
- [ ] Error state renders with a retry button.
- [ ] Delete shows confirmation dialog; confirmed delete removes item and shows success toast; rejected delete leaves list unchanged.
- [ ] Navigating to `/cv-optimization/:id` (valid ID) pre-populates results; `JobUpload` section is hidden.
- [ ] Navigating to `/cv-optimization/:id` (invalid/unauthorized ID) shows error state with "Back to Dashboard" link.
- [ ] Navigating to `/cv-optimization` (no param) still works exactly as before.
- [ ] Partial results (some prompts PENDING/FAILED in stored mode) show an info notice; no crash.
- [ ] Cascade delete confirmed: deleting a job application via the API removes its `OptimizationResult` rows.

---

## Files created / modified summary

### New files
- `apps/opticv-web/src/app/core/services/job-application-api.service.ts`
- `apps/opticv-web/src/app/features/dashboard/components/optimization-list/optimization-list.ts`
- `apps/opticv-web/src/app/features/dashboard/components/optimization-list/optimization-list.html` *(if external template)*

### Modified files
- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/src/app/optimization/dto/optimization-result-summary.dto.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/job-application/job-application.service.ts`
- `apps/opticv-be/src/app/job-application/dto/job-application-response.dto.ts`
- `apps/opticv-be/src/app/job-application/job-application.controller.ts`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/dashboard/dashboard.ts`
- `apps/opticv-web/src/app/features/dashboard/dashboard.html`
- `apps/opticv-web/src/app/app.routes.ts`
