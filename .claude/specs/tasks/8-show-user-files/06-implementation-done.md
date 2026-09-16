# Implementation Done — Task 8: Show User Files (Dashboard)

---

## Summary

Backend endpoints for listing, downloading, and deleting CV documents were added to the existing `CvController`/`CvService`, with ownership checks and R2 pre-signed URL support. A new `Dashboard` Angular page was created with loading, error, empty, and populated states; file list and file list item components; and a `CvApiService`. The `getMimeLabel` utility was added to `shared/utils.ts`. The Dashboard route and navigation item were registered. Unit tests were added for all new backend and frontend code. The "View details" action (spec requirement) and `CvFileDetailsDialog` component were **not implemented**.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `GET /api/cv` — returns `CvDocumentListItem[]` ordered by `createdAt` desc | Implemented | `cv.service.ts`, `cv.controller.ts` |
| `GET /api/cv/:id/download` — pre-signed URL, ownership check, 404/403 | Implemented | `cv.service.ts`, `cv.controller.ts` |
| `DELETE /api/cv/:id` — R2 first then DB, ownership check, 204 | Implemented | `cv.service.ts`, `cv.controller.ts` |
| All endpoints return 401 when JWT missing/invalid (SupabaseGuard class-level) | Implemented | `cv.controller.ts` — `@UseGuards(SupabaseGuard)` on class |
| `CvDocumentListItem` shared type in `@opticv/datatypes` | Implemented | `packages/shared/datatypes/src/lib/datatypes.ts` |
| Dashboard route `/dashboard` with `authGuard`, lazy-loaded | Implemented | `app.routes.ts` |
| "Dashboard" nav item in `loggedInMenuItems` | Implemented | `top-header.ts` |
| `CvApiService` — `getUserCvs`, `downloadCv`, `deleteCv` | Implemented | `features/dashboard/services/cv-api.service.ts` |
| Loading state while fetching | Implemented | `dashboard.ts` / `dashboard.html` |
| Error state with retry button | Implemented | `dashboard.ts` / `dashboard.html` |
| Empty state with link to `/upload-cv` | Implemented | `dashboard.html` |
| File list: file name, human-readable size, formatted date, MIME label | Implemented | `cv-file-list-item.ts` / `.html` |
| Download action — call endpoint, open URL in new tab, SSR guard | Implemented | `dashboard.ts:65–81` |
| Delete action — ConfirmDialog, on confirm call DELETE, splice from local list | Implemented | `dashboard.ts:84–112` |
| **View details action** — Dialog with full metadata + parsedText | **Not implemented** | `CvFileDetailsDialog` not created; no `viewDetails` output or handler |
| Unit tests — `R2Service.getPresignedUrl` | Implemented | `r2.service.spec.ts` |
| Unit tests — `CvService`: `getUserCvs`, `getDownloadUrl`, `deleteCv` | Implemented | `cv.service.spec.ts` |
| Unit tests — `CvController` new handlers | Implemented | `cv.controller.spec.ts` |
| Unit tests — `CvApiService` all methods | Implemented | `cv-api.service.spec.ts` |
| Unit tests — `Dashboard` loading, error, empty, populated states | Implemented | `dashboard.spec.ts` |
| Unit tests — `Dashboard` download and delete actions | Implemented | `dashboard.spec.ts` |

---

## Files

### Created

| File | Purpose |
|---|---|
| `apps/opticv-web/src/app/features/dashboard/dashboard.ts` | Dashboard page component |
| `apps/opticv-web/src/app/features/dashboard/dashboard.html` | Dashboard page template |
| `apps/opticv-web/src/app/features/dashboard/dashboard.css` | Dashboard page styles |
| `apps/opticv-web/src/app/features/dashboard/dashboard.spec.ts` | Dashboard unit tests |
| `apps/opticv-web/src/app/features/dashboard/services/cv-api.service.ts` | HTTP service for CV API endpoints |
| `apps/opticv-web/src/app/features/dashboard/services/cv-api.service.spec.ts` | Unit tests for `CvApiService` |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.ts` | File list organism component |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html` | File list template |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.spec.ts` | Unit tests for `CvFileList` |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.ts` | File row molecule component |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.html` | File row template |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.spec.ts` | Unit tests for `CvFileListItem` |

### Modified

| File | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added `CvDocumentListItem` type |
| `apps/opticv-be/src/app/cv/r2.service.ts` | Added `getPresignedUrl(key, ttlSeconds)` method |
| `apps/opticv-be/src/app/cv/cv.service.ts` | Added `getUserCvs`, `getDownloadUrl`, `deleteCv` methods |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | Added `GET /`, `GET /:id/download`, `DELETE /:id` handlers |
| `apps/opticv-be/src/app/cv/r2.service.spec.ts` | Added tests for `getPresignedUrl` |
| `apps/opticv-be/src/app/cv/cv.service.spec.ts` | Added tests for three new service methods |
| `apps/opticv-be/src/app/cv/cv.controller.spec.ts` | Added tests for three new controller handlers |
| `apps/opticv-web/src/app/app.routes.ts` | Registered `/dashboard` route with `authGuard` |
| `apps/opticv-web/src/app/layout/top-header/top-header.ts` | Added Dashboard item to `loggedInMenuItems` |
| `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts` | Updated tests for Dashboard menu item |
| `apps/opticv-web/src/app/shared/utils.ts` | Added `getMimeLabel` utility |
| `apps/opticv-web/src/app/shared/utils.spec.ts` | Added tests for `getMimeLabel` |
| `package.json` / `package-lock.json` | Added `@aws-sdk/s3-request-presigner` dependency |

---

## Components

| Component (from plan) | Status |
|---|---|
| `Dashboard` page component | Exist |
| `CvFileList` organism | Exist |
| `CvFileListItem` molecule | Exist |
| `CvFileDetailsDialog` molecule | Missing |

---

## Stores

No NgRx stores were planned for this task. Local component signals are used on `Dashboard` as specified.

| Signal | Status |
|---|---|
| `cvFiles = signal<CvDocumentListItem[]>([])` | Exist |
| `isLoading = signal(false)` | Exist |
| `error = signal<string | null>(null)` | Exist |
| `selectedFile = signal<CvDocumentListItem | null>(null)` | Exist |
| `detailsVisible = signal(false)` | Missing |

---

## Deviations

1. **`getMimeLabel` placed in `shared/utils.ts` instead of `features/dashboard/utils/mime-label.ts`.** Plan specified a dedicated file at `features/dashboard/utils/mime-label.ts`. It was added to the existing shared utils file alongside `formatFileSize`.

2. **`CvFileList` does not emit a `viewDetails` output.** Plan specifies `output: download, delete, viewDetails`. Only `download` and `delete` are present.

3. **`CvFileListItem` does not have a "View details" button or `viewDetails` output.** Plan specifies three action buttons; only Download and Delete are implemented.

4. **`detailsVisible` signal not present on `Dashboard`.** Listed in the plan's state section; not implemented.

5. **`onViewDetails` handler not present on `Dashboard`.** Listed in the plan's state transitions; not implemented.

---

## Additional Implementation

- `dashboard.css` created with a `max-width: 1440px` container override — not mentioned in the plan.
- `MessageService` from `primeng/api` is injected in `Dashboard` for toast notifications on download/delete success and failure — not explicitly called out in the plan (plan only mentions `ConfirmationService`).
- Error toast on failed download and success/error toasts on delete were added to `Dashboard` beyond the plan's state transitions, which only described `messageService.add` implicitly through the delete flow.
