# Task Specification

## Source

Task 78: Add 'Optimize CV' button in the dashboard to each listed CV

## Goal

In the dashboard's uploaded-CVs list, add an "Optimize CV" icon button to each CV row (placed before the download button). Clicking it navigates to the CV optimization page with that CV pre-selected in the CV select input. Also remove the "Parsed" status text, since parsing status is no longer meaningful to the user.

## Context

- Dashboard CV list: `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/` (container, holds `cvFiles()` from `CvStore` and handles row actions) and `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/` (row component, renders per-CV icon buttons and status).
- CV optimization page: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` / `.html`, routes `cv-optimization` and `cv-optimization/:jobApplicationId` in `apps/opticv-web/src/app/app.routes.ts`.
- CV select input lives in the child component `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts` / `.html`, rendered by `cv-optimization.html` only when `pageState() === 'initial'` (i.e. no `jobApplicationId` route param). It's a PrimeNG `<p-select formControlName="cvDocumentId">` bound to `CvStore.cvList()`.
- `CvStore` (`apps/opticv-web/src/app/core/stores/cv.store.ts`) exposes `cvList()` and `loadUserCVs()`, shared by both the dashboard and `JobUpload`.
- No existing query-param or router-state navigation pattern exists in the app; all navigation today uses positional `Router.navigate([...])` segments or static `routerLink`.

## Scope

### In scope

- Add an "Optimize CV" `<p-button>` in `cv-file-list-item.html`, placed before the existing download button, matching the existing icon-button style (`severity`, `size="small"`, `[text]="true"`, `title`).
- Emit a new output (e.g. `optimize`) from `CvFileListItem` on click, following the existing `download`/`delete` output pattern.
- Handle the new output in `CvFileList` (`cv-file-list.ts`) by navigating to `/cv-optimization` with the CV id passed as a query param: `this.router.navigate(['/cv-optimization'], { queryParams: { cvId: file.id } })`.
- In `CvOptimization` (`cv-optimization.ts`), read the `cvId` query param (via `ActivatedRoute` query param map) when present, and pass it down to `JobUpload` as a new input (e.g. `preselectedCvId`).
- In `JobUpload` (`job-upload.ts`), add the new `preselectedCvId` input and patch `form.controls.cvDocumentId` with it once available — following the same pattern as the existing `prefillData` effect, but keep it independent since `prefillData` is for the read-only stored-optimization case.
- Remove the "Parsed" status text/icon (the `@case ('COMPLETED')` branch content) from `cv-file-list-item.html`. Decide during implementation whether to remove the whole status `@switch` block or keep `PENDING`/`FAILED` states — per this task's wording ("Remove 'Parsed' text"), only the completed-state text/icon should be removed; `PENDING` ("Parsing…") and `FAILED` ("Parsing failed") indicators stay as-is, since they still convey useful info and were not mentioned for removal.
- The "Optimize CV" button is always visible and enabled for every CV row, regardless of `parseStatus`.

### Out of scope

- Any change to the parsing pipeline or `parseStatus` values themselves.
- Changes to the `jobApplicationId`-based "stored optimization" flow or `prefillData`/read-only behavior in `JobUpload`.
- Adding a general-purpose query-param router convention beyond what's needed for this feature.
- Explicitly forcing a `CvStore` reload on `cv-optimization` mount — existing caching/loading behavior is relied upon as-is.

## Behavior

1. User is on the dashboard, viewing the "uploaded CVs" tab/list.
2. Each CV row now shows three icon buttons in this order: **Optimize CV**, **Download**, **Delete**.
3. User clicks "Optimize CV" on a given CV row.
4. App navigates to `/cv-optimization?cvId=<that CV's id>`.
5. `CvOptimization` page loads in its default ("initial") state (no `jobApplicationId`), rendering `JobUpload`.
6. `JobUpload`'s CV select (`cvDocumentId` form control) is pre-populated with the CV whose id matches `cvId`, as soon as `CvStore.cvList()` contains it (relying on existing store loading/caching — no explicit forced reload).
7. User can change the selection, proceed to fill in the job description, and submit as normal — no other part of the optimization flow changes.
8. The "Parsed" text/icon (shown previously when `parseStatus === 'COMPLETED'`) no longer appears anywhere in the CV list. `PENDING` ("Parsing…") and `FAILED` ("Parsing failed") indicators remain unchanged.

## Edge Cases

- `cvId` query param present but does not match any CV in `cvList()` (e.g. CV was deleted): select input simply shows no pre-selected value (falls back to placeholder "Select a CV"); no error is shown.
- `cvId` query param present but `cvList()` is still empty/loading at mount: pre-fill should apply reactively once the store list becomes available (e.g. via an `effect()` watching `cvList()`, mirroring the existing `prefillData` effect pattern), not just once on init.
- Navigating directly to `/cv-optimization` without a `cvId` param: behavior is unchanged from today (no pre-selection, placeholder shown).
- Navigating to `/cv-optimization/:jobApplicationId` (stored optimization view): the `cvId` query param is not applicable/read in this state since `JobUpload` isn't rendered there; no conflict with `prefillData`.
- CV with `parseStatus` `PENDING` or `FAILED`: "Optimize CV" button is still shown and enabled (per clarified decision).

## Data / API

- No backend/API changes.
- No database changes.
- Frontend-only: new output on `CvFileListItem`, new query-param read in `CvOptimization`, new input on `JobUpload`, template changes in `cv-file-list-item.html`.

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx test opticv-web` passes, including updated/new unit tests for:
  - `CvFileListItem` emitting the new `optimize` output on click.
  - `CvFileList` navigating with the correct `queryParams` on `optimize`.
  - `CvOptimization`/`JobUpload` pre-selecting the CV from the `cvId` query param, including the case where `cvList()` loads after the param is read.
  - "Parsed" text no longer rendered for `COMPLETED` status; `PENDING`/`FAILED` text still rendered.
- No breaking changes to existing download/delete row actions or the stored-optimization (`jobApplicationId`) flow.
- Must pass AXE/WCAG AA checks for the new button (icon-only button needs an accessible `title`/`aria-label`, consistent with existing download/delete buttons).
