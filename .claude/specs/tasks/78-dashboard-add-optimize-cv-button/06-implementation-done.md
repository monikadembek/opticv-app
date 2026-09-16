# Implementation Done — Task 78: Add "Optimize CV" button to dashboard

## Summary

An "Optimize CV" icon-labeled button was added to each CV row in the dashboard's uploaded-CVs list, placed before the existing download button. Clicking it navigates to `/cv-optimization` with the CV's id passed as a `cvId` query param. `CvOptimization` reads this param on init and passes it to `JobUpload` as a new `preselectedCvId` input, which reactively pre-fills the CV select control once the CV is present in `CvStore.cvList()`. The "Parsed" status text/icon previously shown for `COMPLETED` CVs was removed from `cv-file-list-item.html`; `PENDING`/`FAILED` status indicators remain unchanged. Unit tests were added/updated across all four affected components and pass.

---

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Add "Optimize CV" `<p-button>` in `cv-file-list-item.html`, placed before the download button | Implemented | `cv-file-list-item.html:25-32`. |
| New `optimize` output from `CvFileListItem`, following `download`/`delete` pattern | Implemented | `cv-file-list-item.ts:20,27-29`. |
| `CvFileList` handles `optimize` output, navigates with `queryParams: { cvId: file.id }` | Implemented | `cv-file-list.ts:41,52-56`; `cv-file-list.html:30`. |
| `CvOptimization` reads `cvId` query param, passes to `JobUpload` as `preselectedCvId` | Implemented | `cv-optimization.ts:200,446-449`; `cv-optimization.html:77`. |
| `JobUpload` adds `preselectedCvId` input, patches `cvDocumentId` reactively via a separate `effect()` | Implemented | `job-upload.ts:61,120-127`. |
| Remove "Parsed" status text/icon (`@case ('COMPLETED')` branch); keep `PENDING`/`FAILED` | Implemented | `cv-file-list-item.html:11-22`. |
| "Optimize CV" button always visible/enabled regardless of `parseStatus` | Implemented | No `[disabled]` binding on the button. |
| Edge case: `cvId` not in `cvList()` → no pre-selection, no error | Implemented | Effect only calls `setValue` when a match exists. |
| Edge case: `cvList()` still loading at mount → pre-fill applies reactively once loaded | Implemented | `effect()` re-fires on `cvStore.cvList()` changes. |
| Edge case: navigating to `/cv-optimization` without `cvId` → unchanged behavior | Implemented | `preselectedCvId` defaults to `null`; effect returns early. |
| Edge case: `/cv-optimization/:jobApplicationId` (stored mode) → `cvId` not applicable | Implemented | `cvId` is read unconditionally but `JobUpload` isn't rendered in that state, so it has no effect. |
| Unit tests: `CvFileListItem` emits `optimize` output on click | Implemented | `cv-file-list-item.spec.ts:69-87`. |
| Unit tests: `CvFileList` navigates with correct `queryParams` on `optimize` | Implemented | `cv-file-list.spec.ts:112-123`. |
| Unit tests: pre-selecting CV from `cvId` query param, including `cvList()` loading after param read | Implemented | `job-upload.spec.ts:288-320`. |
| Unit tests: "Parsed" text no longer rendered for `COMPLETED`; `PENDING`/`FAILED` still rendered | Implemented | `cv-file-list-item.spec.ts:111-130`. |
| No breaking changes to existing download/delete actions or stored-optimization flow | Implemented | Existing tests for `downloadCv`, `deleteCv`, `prefillData`/`isReadonly` behavior unchanged and passing. |
| Icon-only button needs accessible `title`/`aria-label` (AXE/WCAG AA) | Implemented | Button has `title="Optimize CV"`. |
| `npm exec nx build opticv-web` passes | Not implemented | Build fails on a pre-existing bundle-size budget (`maximumError: "1mb"`, actual 1.52 MB); see `05-code-review.md` for detail. Not caused by this task's diff. |
| `npm exec nx test opticv-web` passes | Implemented | Full suite run: 942 tests / 49 files passed. |

---

## Files

### Modified

- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.ts`
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.html`
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.spec.ts`
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.ts`
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html`
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.spec.ts`
- `docs/tasks-list.md`

### Created

- `.claude/specs/tasks/78-dashboard-add-optimize-cv-button/00-raw-task.md`
- `.claude/specs/tasks/78-dashboard-add-optimize-cv-button/02-spec.md`
- `.claude/specs/tasks/78-dashboard-add-optimize-cv-button/03-spec-review.md`
- `.claude/specs/tasks/78-dashboard-add-optimize-cv-button/04-implementation-plan.md`
- `.claude/specs/tasks/78-dashboard-add-optimize-cv-button/05-code-review.md`

No files were deleted.

---

## Components

| Component | Status |
| --- | --- |
| `CvFileListItem` | Exist |
| `CvFileList` | Exist |
| `CvOptimization` | Exist |
| `JobUpload` | Exist |

---

## Stores

| Store | Status |
| --- | --- |
| `CvStore` | Exist (unmodified — consumed as-is by both `CvFileList` and `JobUpload`, per plan's "no forced reload" scoping). |

---

## Deviations

- Plan Step 1 specified the "Optimize CV" button use `severity="secondary"` and be icon-only (no visible `label`), matching the download/delete buttons. As implemented (`cv-file-list-item.html:25-32`), the button has no `severity` attribute (defaults to primary) and includes a visible `label="Optimize CV"`.
- `cv-optimization.spec.ts`'s `makeActivatedRoute` helper was extended with a `cvId` parameter (not called for in the plan, which stated no new `CvOptimization`-specific tests were needed). This was subsequently exercised with a `describe('preselectedCvId', ...)` test block added after the initial implementation commit.

---

## Additional Implementation

None.
