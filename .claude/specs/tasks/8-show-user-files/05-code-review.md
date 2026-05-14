# Code Review — Task 8: Show User Files (Dashboard)

Reviewed against:
- `.claude/context/role.md`, `rules.md`, `conventions.md`
- `.claude/specs/tasks/8-show-user-files/02-spec.md`
- `.claude/specs/tasks/8-show-user-files/04-implementation-plan.md`

---

## Summary

- **Overall result: PASS WITH ISSUES**
- The backend is fully correct and well-tested. The frontend covers all critical paths (load, error, empty, download, delete) with clean signal-based state and proper SSR guard for `window.open`. Two spec requirements are not implemented: the "View details" action (details dialog with parsedText) and the `CvFileDetailsDialog` component are missing from the codebase. The `getMimeLabel` utility was placed in `shared/utils.ts` instead of the planned `features/dashboard/utils/mime-label.ts`, which is a minor deviation but an acceptable one. No critical convention violations.

---

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. **`dashboard.ts` line 11 — `MessageService` injected but not provided.**
   `MessageService` is injected at line 37 (`private readonly messageService = inject(MessageService)`) but is not listed in the component's `providers` array. This will throw at runtime unless `MessageService` is provided at a higher level (e.g., in `app.config.ts`). Verify that `MessageService` (from `primeng/api`) is globally provided; if not, add it to `providers: [ConfirmationService, MessageService]`.

2. **`cv-file-list-item.ts` lines 11–12 — two separate imports from the same module.**
   `formatFileSize` and `getMimeLabel` are imported on separate `import` lines from `../../../../shared/utils`. Merge into a single import statement.

3. **`top-header.ts` — `items` accumulation bug on repeated `isLoggedIn` changes.**
   The `effect()` block appends to `this.items` (`this.items = [...this.items, ...loggedInMenuItems]`) each time the effect runs, but `this.items` is never reset before appending. A second change from `false → true` would duplicate the logged-in items. The items should be reset to the base `[{ label: 'Home', route: '/' }]` on each effect run. This is a pre-existing bug, not introduced in this task, but the Dashboard item was added inside this effect, so it is surfaced here.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `GET /api/cv` — returns `CvDocumentListItem[]` ordered by `createdAt` desc | Covered | `cv.service.ts:91–103` |
| `GET /api/cv/:id/download` — presigned URL, ownership check, 404/403 | Covered | `cv.service.ts:105–118` |
| `DELETE /api/cv/:id` — R2 first, then DB, ownership check, 204 | Covered | `cv.service.ts:121–127`, `cv.controller.ts:51–58` |
| Auth: all endpoints return 401 when JWT missing (SupabaseGuard class-level) | Covered | `cv.controller.ts:22` |
| `CvDocumentListItem` type in `@opticv/datatypes` | Covered | `datatypes.ts:29–32` |
| Dashboard route `/dashboard` with `authGuard`, lazy-loaded | Covered | `app.routes.ts:28–33` |
| "Dashboard" menu item in `loggedInMenuItems` | Covered | `top-header.ts:32–34` |
| `CvApiService` with `getUserCvs`, `downloadCv`, `deleteCv` | Covered | `cv-api.service.ts` |
| Loading state while fetching | Covered | `dashboard.ts:49,54,60` |
| Error state with retry | Covered | `dashboard.html:10–14` |
| Empty state with link to `/upload-cv` | Covered | `dashboard.html:15–26` |
| File list: name, size (human-readable), date (`d MMM y`), MIME label | Covered | `cv-file-list-item.html:5–10` |
| Download: call endpoint, open URL in new tab, SSR guard | Covered | `dashboard.ts:65–81` |
| Delete: ConfirmDialog, on success splice from local list | Covered | `dashboard.ts:84–112` |
| **View details action** — opens Dialog with full metadata + parsedText | **Missing** | `CvFileDetailsDialog` component not created; no "view details" output on `CvFileList`/`CvFileListItem`, no `onViewDetails` handler in `Dashboard` |
| `CvFileDetailsDialog` component | **Missing** | Not created |
| `getMimeLabel` utility | Covered (deviation) | Placed in `shared/utils.ts` instead of `features/dashboard/utils/mime-label.ts`; functionally equivalent |
| Unit tests: backend `CvService` new methods | Covered | `cv.service.spec.ts:169–277` |
| Unit tests: backend `R2Service.getPresignedUrl` | Covered | `r2.service.spec.ts:108–136` |
| Unit tests: backend `CvController` new handlers | Covered | `cv.controller.spec.ts:97–124` |
| Unit tests: `CvApiService` all methods | Covered | `cv-api.service.spec.ts` |
| Unit tests: Dashboard — loading, error, empty, populated states | Covered | `dashboard.spec.ts:54–89` |
| Unit tests: Dashboard — download, delete | Covered | `dashboard.spec.ts:91–185` |
| Unit tests: `CvFileList` | Covered | `cv-file-list.spec.ts` |
| Unit tests: `CvFileListItem` | Covered | `cv-file-list-item.spec.ts` |
| `formatFileSize` utility | Covered | `shared/utils.ts:1–5`; pre-existing utility reused |

---

## Plan Deviations

1. **`CvFileDetailsDialog` not created.** The plan (Step 8, Frontend Files) lists `cv-file-details-dialog.ts` and `.html` as files to create. Neither exists. The "View details" output on `CvFileList` and `CvFileListItem`, the `detailsVisible` signal on `Dashboard`, and the `onViewDetails` handler are all absent.

2. **`getMimeLabel` placed in `shared/utils.ts` instead of `features/dashboard/utils/mime-label.ts`.** The plan (Step 4 / Frontend Files) calls for a dedicated `utils/mime-label.ts` inside the dashboard feature. It was added to the shared utils file instead. This is a reasonable simplification.

3. **`CvFileList` does not emit a `viewDetails` output.** The plan specifies `output: download, delete, viewDetails`. Only `download` and `delete` are present (`cv-file-list.ts:18–19`).

4. **`CvFileListItem` does not have a "View details" button or `viewDetails` output.** The plan specifies three action buttons; only two (Download, Delete) are present in the template (`cv-file-list-item.html:13–28`).

5. **`Dashboard` does not have `detailsVisible` signal.** Plan specifies `detailsVisible = signal(false)` on the Dashboard component. Absent from `dashboard.ts`.

---

## Null Safety Issues

None. `parsedText: string | null` is correctly typed and handled across backend (`select` query) and frontend type (`CvDocumentListItem`). The `storageKey` null/empty check in `cv.service.ts:112–116` is correct. No unguarded nullable access found.

---

## Code Smells

1. **`dashboard.ts` — `MessageService` used without being provided.** See Conventions Violations #1. Using a service that may not be provided at the correct scope is a reliability smell.

2. **`cv-file-list-item.ts` lines 24–25 — utility functions exposed as class fields.**
   `readonly formatFileSize = formatFileSize` and `readonly getMimeLabel = getMimeLabel` are class fields that hold references to pure functions, solely to make them available in the template. This is a common Angular pattern but worth noting: Angular's `DatePipe` is injected properly; consider whether these pure helpers belong in a pipe instead. Not a blocking issue for this task.

---

## Recommendation

**Fix critical issues before merge.**

The missing "View details" feature (spec requirement) is not a convention violation but a missing spec item: `CvFileDetailsDialog`, the `viewDetails` output chain (`CvFileListItem → CvFileList → Dashboard`), the `detailsVisible` and `selectedFile` signals, and the `onViewDetails` handler all need to be implemented before the task can be considered complete per the acceptance criteria.

Additionally, verify that `MessageService` is provided globally (e.g. in `app.config.ts`) or add it to the `Dashboard` component's `providers` array to prevent a runtime injection error.
