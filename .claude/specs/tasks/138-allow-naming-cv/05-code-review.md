# Code Review — Task 138-allow-naming-cv

Reviewed range: `a6fec8a..211d6fa` (commits `89fb4ed`, `c602522`, `7bdbb62`, `d25ea4c`, `f146aab`, `211d6fa`), 49 files.
Inputs: `02-spec.md`, `04-implementation-plan.md`, `.claude/context/*`.

### Summary

- Overall result: **PASS WITH ISSUES**
- Every spec requirement is implemented: the DB column and backfill, shared types, backend endpoints/DTOs, the dashboard table, the Rename dialog, the builder name field, label swaps and the analytics change. Both critical findings from the spec review are resolved as planned (dashboard-owned dialog state, `LEFT(…, 100)` backfill). No critical convention violations were found. The main issue is scope added beyond the spec and plan (Cancel button, unsaved-changes guard, header menu item, client-only render mode for builder routes). It should be acknowledged in the spec or done report. Frontend tests could not be verified because the machine ran out of disk space (see Verification).
- Critical issues: **0**

### Verification

| Gate | Result |
| --- | --- |
| `typecheck` (opticv-be, opticv-web, datatypes) | Pass |
| `lint` (all three) | Pass: 0 errors. The only warnings in task-touched files are pre-existing (`cv.service.ts:235-238` non-null assertions from task 117, `top-header.spec.ts:86-97`) |
| `test` opticv-be | Pass (370/370) |
| `test` datatypes | Pass |
| `test` opticv-web | **Inconclusive.** 436/436 tests that ran passed, but 67 suites failed to load with `ENOSPC: no space left on device` (the `%TEMP%` drive is 100% full). Free up disk space and re-run `npm exec nx test opticv-web` before merging. |
| `format:check` | No task-touched file is flagged (unrelated files elsewhere in the repo are) |

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **Scope beyond the spec and plan (rules.md, "Minimal footprint").** The following were not in `02-spec.md` or `04-implementation-plan.md`:
   - `apps/opticv-web/src/app/core/guards/unsaved-changes.guard.ts` (new) and its wiring in `app.routes.ts:56,63`
   - `cv-builder.ts:75` `(window:beforeunload)` host listener
   - `cv-builder.ts:145-191` snapshot/`canDeactivate` logic
   - `cv-builder.html:422` second `<p-confirmDialog key="unsaved-changes">`
   - `cv-builder.html:20-29` and `cv-builder.ts:310` Cancel button and `cancel()`
   - `top-header.ts:155` "CV Builder" menu item
   - `app.routes.server.ts:12-13` `RenderMode.Client` for the `cv-builder` routes

   The commit messages show these were intentional. Record them in the spec, or in the done report as accepted scope changes, so the spec stays the source of truth.
2. **Unrelated visual change to Save.** `cv-builder.html:30-37` drops the existing `icon="pi pi-check"` and adds `size="small"`. Neither the spec nor the plan asks for this.
3. **Format-only churn.** `job-application.service.ts` reflows `assertCvOwnership`, `create`, `findAll`, `update` and `updateAtsScore`. Only the two `select` lines (L60, L72) are functional changes. This is acceptable if it came from `nx format:write`, but it adds noise to the diff.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| §1 `name VARCHAR(100) NOT NULL` + hand-written backfill migration | Covered | `20261118120000_cv_document_name/migration.sql` with `LEFT(…, 100)` and `COALESCE/NULLIF` fallback; `schema.prisma` updated |
| §2 Upload default name (strip last ext, ≤100, fallback) in both PDF/DOCX branches; response includes `name` | Covered | `cv.service.ts:129,147,213-219,234`. Also trims; see Plan Deviations #5 |
| §3 `POST /cv/manual` with optional `name`, kept out of `structuredData`, default `"Untitled CV"` | Covered | `CreateManualCvRequestDto` + `const { name, ...structuredData } = body` |
| §4 `PATCH /cv/:id` rename, 400/404, no quota | Covered | Controller route + Swagger 200/400/401/404; service ownership check returns 404 |
| §5 `GET :id/structured-data` returns `{ data, name }`; own Swagger DTO; extract stays `{ data }` | Covered | `CvStructuredDataResponseDto`; `CvExtractResponseDto` unchanged |
| §6 List selects `name`, `updatedAt`; job application queries select `cvDocument { id, name }` | Covered | |
| §7 Dashboard table Name / Source / Updated / Actions, icons `aria-hidden`, source badge with size title, `globalFilterFields=['name']`, Rename button | Covered | |
| §7 Rename dialog (label, prefill, trim/required/max 100, linked error, Enter submits, Cancel, Save disabled while invalid/saving, toast on success/error, stays open on error) | Covered | Implemented per plan §4.1 (dashboard owns state), which is a documented deviation from the spec's wording |
| §7 Focus into dialog on open / back to trigger on close | Covered | PrimeNG `focusOnShow` + `returnFocusTo` restore in `onHide()` |
| §8 Analytics send `file_id` + `cv_source`, no `file_name` / name | Covered | `dashboard.ts:122,150` |
| §9 Builder name signal, prefill, validation, Save disabled, create-with-name, update + conditional rename (sequential), `syncCvStore` maps `name`/`updatedAt` | Covered | Field placement differs; see Plan Deviations #1 |
| §10 Label swaps: job-upload `optionLabel="name"`, optimization-list name + `cvDocument.name` filter, job-info-banner | Covered | `upload-cv.html` untouched as required |
| §11 `CvApiService.renameCv`, `createManualCv` / `getStructuredData` types | Covered | |
| Shared types and constants (`RenameCvRequest`, `CreateManualCvRequest`, `CvStructuredDataResponse`, `DEFAULT_CV_NAME`, `CV_NAME_MAX_LENGTH`) | Covered | |
| Error-message array handling (Integration gap 2) | Covered | `getErrorMessage()` in `shared/utils.ts`, used in dashboard rename and builder save |
| Backend tests (service, controller, DTO, job-application) | Covered | 370 BE tests pass |
| Frontend tests (utils, api, dialog, file-list, dashboard, builder, optimization-list, banner, fixtures) | Partial | Spec files exist and were updated, but the full run could not complete (ENOSPC). Status is unconfirmed until re-run |
| Migration applied to dev + manual / AXE verification | Not verifiable in review | Confirm in the done report |

### Plan Deviations

1. **Builder name field location.** Spec §9 and plan §6 put the field in `.builder-header`, between the heading and Save. It is rendered at the top of `.builder-form` instead (`cv-builder.html:42`). As a result, the planned `.builder-header { flex-wrap: wrap }` and `flex: 1` were not added.
2. **Built-source icon.** The plan specifies `pi pi-hammer`; the implementation uses `pi pi-file-edit` (`cv-file-list.html:71`). The spec allows either. The plan picked `pi-hammer` specifically to stay distinct from the pencil glyph of the Edit action (`pi pi-pencil`, L113), and `pi-file-edit` also contains a pencil.
3. **Rename form submit.** The plan uses `(ngSubmit)="submit()"`; the implementation uses `(submit)="onFormSubmit($event)"` with `preventDefault()` (`rename-cv-dialog.html:13`). The behavior is the same.
4. **Builder `.builder-actions` wrapper and Cancel button.** These were not planned. See Non-Critical #1.
5. **Upload name is trimmed.** `buildCvNameFromFileName` calls `.trim()` after stripping the extension (`cv.service.ts:214`). The spec, the plan and the migration backfill don't trim, so `"  Foo .pdf"` becomes `"Foo"` for new uploads but stays `"  Foo "` for backfilled rows. This is harmless but inconsistent.
6. **Added scope.** The unsaved-changes guard, `beforeunload`, header menu item and client render mode. See Non-Critical #1.

### Null Safety Issues

None introduced by this task.

- `cv.service.ts:235-238` (`toUploadCvResponse`): non-null assertions on `fileName`/`fileSize`/`mimeType`/`storageKey` are **pre-existing** (task 117). They are safe on the upload path, but lint flags them.
- `shared/utils.ts` `validateCvName`: `(value ?? '')` is a redundant guard on a `string` parameter. It is harmless because the parameter also receives `control.value`.

### Code Smells

1. **Duplicated magic style value.** `{ width: '480px', maxWidth: '95vw' }` appears in both `rename-cv-dialog.html:10` and `cv-builder.html:424`. It is minor.
2. **Two error-copy variants for the same rule.** The builder says "CV name is required." / "CV name must be 100 characters or fewer." (`cv-builder.ts:94-103`), while the dialog says "Name is required." / "Name must be …" (`rename-cv-dialog.ts:70-73`). Both match the plan, but the two components map the same `validateCvName` result separately. It is acceptable at this size.
3. **`CvBuilder` keeps growing.** It now also owns the unsaved-changes snapshot, the confirm dialog, `beforeunload` and back-navigation, on top of form state and save orchestration. It is still well under the 1000-line limit. If more page-level concerns are added, consider moving the dirty-tracking logic out of the component.

### Recommendation

- **Merge as-is**, once the opticv-web test suite has been re-run successfully with free disk space. The non-critical items (record the added scope, the field placement and the Save button styling) can be handled in the done report or a follow-up.
