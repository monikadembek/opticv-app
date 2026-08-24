# Task Specification

## Source

Azure DevOps Task: 115

## Goal

When a job application's optimization section was never processed at all (no `OptimizationResult` row exists — e.g. the user closed the app before that section's job was enqueued, or the request failed before the row was created), the section currently renders with no status badge and no way to recover: `sectionStatus()` returns `undefined` for a missing map entry, and `retryablePromptTypes` only flags sections with a `FAILED` or malformed-`COMPLETED` result, so no Retry button appears. This task adds a distinct "not started" state with its own empty-state message and a free Retry button, and extends the existing retry endpoint so it can start a never-triggered section instead of only failed ones.

## Context

- Frontend: `apps/opticv-web/src/app/features/cv-optimization/`
  - `cv-optimization.ts` — page component; `sectionStatus()`, `retryablePromptTypes`, `retryOptimization()`, `hasPartialStoredResults`
  - `cv-optimization.html` — per-section Retry button blocks (one per `PromptType`)
  - `models.ts` — `SectionStatus` type
  - `components/section-card/section-card.ts` / `.html` — reusable section shell (status badge, collapse, processing placeholder)
  - `services/cv-optimization-api.service.ts` — `retryFailedJob()`, `runSingleOptimizationProcess()`, `streamOptimizationEvents()`
- Backend: `apps/opticv-be/src/app/optimization/`
  - `optimization.controller.ts` — `POST .../retry/:promptType` → `OptimizationService.retryFailedJob`
  - `optimization.service.ts:209-263` — `retryFailedJob()`; currently requires an existing row with `status === 'FAILED'`
- DB: `apps/opticv-be/prisma/schema.prisma` — `OptimizationResult` (unique on `[applicationId, promptType]`; a missing row means the section was never attempted, there is no explicit DB status for "not started")

## Scope

### In scope

- Backend: allow `retryFailedJob` to also accept the case where no `OptimizationResult` row exists yet for `(jobApplicationId, promptType)`, in addition to the existing `FAILED` case. In that case, create the row (`status: PENDING`) instead of updating an existing one, then enqueue the job exactly as today. No quota check/consumption is added for either case (both stay free, matching current `FAILED` retry behavior).
- Frontend: introduce a `'not-started'` value on `SectionStatus`, derive it in `sectionStatus()` when there is no entry in `results()` for that prompt type (and it isn't currently processing), and add it to `retryablePromptTypes` so the Retry button appears for it.
- Frontend: render a distinct empty-state message plus Retry button inside the section body when status is `'not-started'`, visually different from the existing `'error'` state (different icon/copy; button behavior identical to today's Retry button — reuses `retryOptimization()`).
- Add a `'not-started'` status badge in `SectionCard` (header), following the same pattern as the existing `completed` / `processing` / `error` badges.
- This applies uniformly to all 7 `PromptType` sections (ATS Analysis, Keywords, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Updates).

### Out of scope

- Any page-level "Retry all missing" action — only per-section Retry buttons are added (existing `hasPartialStoredResults` banner is left as-is, unchanged).
- Quota consumption changes — retries (both `FAILED` and "not started") remain free, consistent with current product decision for `FAILED` retries.
- Changes to the initial full-run flow (`triggerSingleJob` / `run/:promptType`), which is unaffected by this task.
- Any change to how `COMPLETED`-with-null (malformed) results are retried — that existing behavior/messaging is unchanged.

## Behavior

1. **Loading a stored optimization page.** `loadStoredOptimization()` fetches existing `OptimizationResult` rows and populates `results()`. Prompt types with no row remain absent from `results()`, same as today.
2. **Status derivation.** `sectionStatus(type)`:
   - If `isProcessing().get(type)` is true → `'processing'` (unchanged).
   - Else if `results().get(type)` is undefined → **`'not-started'`** (changed from `undefined`).
   - Else, same mapping as today (`'completed'` / `'error'` / `'pending'`).
3. **Section card rendering for `'not-started'`:**
   - Header badge shows a "Not started" indicator (new badge, parallel to `status-error`/`status-completed`), e.g. `pi-circle` icon + "Not started" label.
   - Body shows an empty-state message (e.g. "This section hasn't been processed yet.") instead of the processing placeholder or `<ng-content>` result body.
   - A Retry button is shown below/alongside the empty-state message, using the same `p-button` pattern (`label="Retry"`, `icon="pi pi-refresh"`, `severity="warn"`, `size="small"`), disabled while `isProcessing().get(type)` is true.
4. **`retryablePromptTypes`.** Add `'not-started'` sections (i.e., `!this.results().has(promptType)` and not currently processing) to the retryable set, alongside the existing `'failed'` and malformed-`'completed'` conditions.
5. **Clicking Retry** (for both `'error'` and `'not-started'` sections): unchanged call path — `retryOptimization(promptType)` → `cvOptimizationApiService.retryFailedJob(jobApplicationId, promptType)` → on success, subscribe to `streamOptimizationEvents()` → on completion, update `results()` and clear `isProcessing`.
6. **Backend `retryFailedJob`:**
   - Load `existing` row for `(jobApplicationId, promptType)` as today.
   - If `existing` is `null`: create a new `OptimizationResult` row with `status: PENDING` (all output fields null/empty, same shape as the reset performed today for the `FAILED` case) and enqueue the job with a new `runId`, mirroring the existing `FAILED`-branch behavior.
   - If `existing.status === 'FAILED'`: unchanged — reset the existing row to `PENDING` and enqueue.
   - If `existing` exists with any other status (`PENDING`, `PROCESSING`, `COMPLETED`): unchanged — throw `BadRequestException` (still not retryable via this endpoint).
   - No quota check is added.

## Edge Cases

- **Section actively processing but not yet in `results()`** (e.g. mid-run after clicking "Run all"): `isProcessing().get(type)` is `true`, so `sectionStatus()` returns `'processing'` before falling through to `'not-started'` — no regression.
- **Double-click Retry on a not-started section:** button is disabled once `isProcessing` is set to `true` for that prompt type, preventing a duplicate request, same as the existing `FAILED` retry flow.
- **Race: two concurrent retry requests for the same never-triggered section** (e.g. two tabs open): the second request's `existing` lookup may now see the row just created by the first (status `PENDING`), which falls into the "any other status" branch and correctly throws `BadRequestException` rather than double-creating — no new unique-constraint race is introduced since creation now happens only when `existing` is genuinely `null`.
- **Section malformed-`COMPLETED` (existing case) vs. `'not-started'` (new case):** these remain visually and logically distinct — malformed-completed still shows `'error'` styling per current behavior; only a genuinely absent row is `'not-started'`.
- **`hasPartialStoredResults` banner:** continues to work unchanged, since it's still based on `!results().has(p)` — will now also be true for `'not-started'` sections, which is correct (it already covered this case at the page-banner level; this task only adds section-level actionability).

## Data / API

- **Endpoint (unchanged route):** `POST /api/optimizations/job-applications/:jobApplicationId/retry/:promptType`
- **Backend change:** `apps/opticv-be/src/app/optimization/optimization.service.ts` — `retryFailedJob()`:
  - Replace the `if (!existing || existing.status !== 'FAILED') throw ...` guard with logic that branches on three cases: `existing === null` (create), `existing.status === 'FAILED'` (update/reset, as today), otherwise (throw `BadRequestException`, as today).
  - When creating: use `prisma.optimizationResult.create()` with `applicationId`, `promptType`, `status: 'PENDING'`, and null/empty output fields, in place of the `update()` call used for the `FAILED` branch.
- **No changes to:** DB schema, shared `@opticv/datatypes` types, `runId`/SSE contract, `run/:promptType` (`triggerSingleJob`) endpoint, quota service.
- **Frontend types:** `apps/opticv-web/src/app/features/cv-optimization/models.ts` — extend `SectionStatus`:
  ```ts
  export type SectionStatus =
    | 'completed'
    | 'processing'
    | 'error'
    | 'not-started'
    | 'pending'
    | undefined;
  ```
  (`undefined` is retained for cases where `SectionCard` is used without a status input at all, e.g. default; `sectionStatus()` itself will no longer return `undefined` for a missing result.)

## Acceptance (DEV)

- Build passes (`npm exec nx run-many -t build`)
- Typecheck passes (`npm exec nx run-many -t typecheck`)
- Lint passes (`npm exec nx run-many -t lint`)
- Tests added/updated:
  - Backend: `retryFailedJob` unit tests covering (a) missing row → creates + enqueues, no quota check; (b) `FAILED` row → resets + enqueues (existing test, unchanged); (c) row with other status → still throws `BadRequestException`.
  - Frontend: `sectionStatus()` returns `'not-started'` when no result entry exists and not processing; `retryablePromptTypes` includes prompt types with no result entry.
- Manual verification: on a job application where at least one section's job was never triggered (simulate by deleting/not creating its `OptimizationResult` row, or interrupting a run), confirm the section shows the new "not started" badge + empty-state + Retry button, and clicking Retry successfully runs and populates that section without affecting quota usage (`/usage` count unchanged).
- No breaking changes to existing `FAILED`-retry or full-run flows.
- Accessibility: new badge and empty-state follow existing patterns (icon + text, sufficient color contrast per WCAG AA); Retry button retains `ariaLabel` per section (e.g. `"Retry ATS Analysis"`).
