# Task Specification

## Source

Azure DevOps Task: 138 — CV names + unified "My CVs" table

## Goal

Introduce a user-editable `name` on every `CvDocument` and use it as the single display label for CVs
across the app. Uploaded CVs default to the original file name without its extension; CVs created in
the CV builder default to `"Untitled CV"`. Users can rename any CV, either from the dashboard (Rename
dialog) or from the CV builder header. The dashboard "My CVs" table stays a single table and gets a
**Source** badge (PDF / DOCX / Built in app) so uploaded and built CVs both render fully.

## Context

Builder-created CVs (task 117) have `fileName`, `fileSize` and `mimeType` set to `null`. `fileName` is
currently the display label in several places, so builder CVs show up blank:

| Location | File | Current label |
| --- | --- | --- |
| Dashboard "My CVs" table | `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html` | `file.fileName`, filter `['fileName']` |
| Job upload CV dropdown | `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.html` | `optionLabel="fileName"` |
| Optimization list CV column | `apps/opticv-web/src/app/features/dashboard/components/optimization-list/optimization-list.html` | `item.cvDocument.fileName`, filter `'fileName'` |
| Job info banner CV link | `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.html` | `jobApplication().cvDocument.fileName` |

Backend areas involved:

- `apps/opticv-be/prisma/schema.prisma` (`CvDocument` model → table `cv_documents`)
- `apps/opticv-be/src/app/cv/` (`cv.service.ts`, `cv.controller.ts`, `dto/cv-request.dto.ts`, `dto/cv-response.dto.ts`)
- `apps/opticv-be/src/app/job-application/` (`job-application.service.ts`, `dto/job-application-response.dto.ts`)
- `packages/shared/datatypes/src/lib/datatypes.ts`

Relevant existing facts:

- `POST /api/cv/manual` takes `CvStructuredDataRequestDto` as the **flat** request body and stores it
  as `structuredData`. The global `ValidationPipe` uses `whitelist: true, transform: true`.
- `GET /api/cv/:id/structured-data` returns `{ data: CvStructuredData }`. The CV builder (edit mode) and
  cv-optimization feature both call it.
- The CV builder `save()` calls either `createManualCv` (new) or `updateStructuredData` (existing). On
  success it syncs `CvStore` via `syncCvStore()` and navigates to `/dashboard`.
- Ownership checks: `updateStructuredData` / `getStructuredData` return **404** when the CV is missing
  or belongs to another user. Rename follows this pattern.
- No `@Trim` decorator exists in the backend yet. Trimming is done with `class-transformer`'s `@Transform`.
- `optimization-list.html` currently has `globalFilterFields` = `['jobTitle', 'companyName', 'fileName']`.
  `fileName` is nested under `cvDocument`, so CV-name search there does not work today. This task fixes it
  by using `'cvDocument.name'`.
- Dashboard analytics (`dashboard.ts`, PostHog events `original_cv_downloaded` and `cv_deleted`)
  currently send `file_name`.

## Clarifications (resolved)

| # | Question | Decision |
| --- | --- | --- |
| 1 | How is the optional `name` sent on `POST /cv/manual`? | **Flat field.** New `CreateManualCvRequestDto extends CvStructuredDataRequestDto` with an optional `name`. The service separates `name` from the structured data before persisting, so `name` never ends up inside `structuredData`. |
| 2 | Where does the builder get the name when editing an existing CV? | **Extend `GET /cv/:id/structured-data`** to return `{ data, name }`. The change is additive and doesn't break existing consumers. |
| 3 | What happens if the builder name is empty on Save? | **Block save.** Name is required, 100 characters max. Save is disabled and an inline error appears (same rules as the Rename dialog). |
| 4 | What do analytics events send? | **Source only.** Send `file_id` + `cv_source` (`pdf` / `docx` / `built`). Do not send the CV name, which is user-entered and may contain personal data. |

## Scope

### In scope

- DB: new non-null `name VARCHAR(100)` column on `cv_documents` with a hand-written backfill migration.
- Shared types: `name` on CV types, `updatedAt` on the list item, `cvDocument.name` on job application
  types, new `RenameCvRequest`.
- Backend: default names on upload and manual create; optional `name` on `POST /cv/manual`; new
  `PATCH /cv/:id` rename endpoint; `name` in `GET /cv/:id/structured-data`; `name` / `updatedAt` in
  list and upload responses; job application queries select `name`.
- Frontend: `renameCv` API method; reworked dashboard CV table (Name | Source | Updated | Actions) with
  a Rename dialog; name field in the CV builder header; `fileName` → `name` as the label in job upload,
  optimization list and job info banner; analytics payload change.
- Updated and new unit tests (backend and frontend).

### Out of scope

- Unique-name enforcement (duplicate names are allowed).
- Defaulting builder names from `structuredData.contact.name`.
- Changing `upload-cv.html`. It keeps showing `fileName`, the real uploaded file.
- Removing or renaming the `fileName` / `fileSize` / `mimeType` columns.
- Changing dashboard row ordering. It stays `createdAt desc`.

## Behavior

### 1. Database migration

1. Add `name String @db.VarChar(100)` to the `CvDocument` Prisma model.
2. Create a migration folder `apps/opticv-be/prisma/migrations/<timestamp>_cv_document_name/migration.sql`
   **by hand** (don't run `migrate dev`, because the dev DB has drift):
   ```sql
   ALTER TABLE "cv_documents" ADD COLUMN "name" VARCHAR(100);
   UPDATE "cv_documents"
     SET "name" = COALESCE(NULLIF(regexp_replace("fileName", '\.[^.]+$', ''), ''), 'Untitled CV');
   ALTER TABLE "cv_documents" ALTER COLUMN "name" SET NOT NULL;
   ```
   Existing uploads get their file name without the last extension. Builder CVs (`fileName IS NULL`),
   and files whose stripped name is empty (e.g. `.pdf`), get `"Untitled CV"`.
   Note: a file name longer than 100 characters after stripping would overflow `VARCHAR(100)`. The
   implementer must check whether `fileName` can exceed 100 characters. If it can, wrap the expression in
   `LEFT(…, 100)`. (This is an implementer check, not a new requirement.)
3. Apply from `apps/opticv-be`: `npm exec prisma migrate deploy`, then `npm exec prisma generate`.

### 2. Upload (`POST /api/cv/upload`)

- In both create branches (PDF and DOCX), set `name` = the original file name with its last extension
  removed, cut to 100 characters. If the result is empty, use `"Untitled CV"`.
  - `Foo Bar.pdf` → `Foo Bar`; `my.cv.v2.docx` → `my.cv.v2`; `.pdf` → `Untitled CV`.
- The response includes `name`.

### 3. Manual create (`POST /api/cv/manual`)

- The body is `CreateManualCvRequestDto`: every `CvStructuredDataRequestDto` field plus an optional
  `name` (`@IsOptional @IsString @Transform(trim) @IsNotEmpty @MaxLength(100)`).
- The service takes `name` out of the body and stores the remaining fields as `structuredData`. `name`
  must not be persisted inside `structuredData`.
- If `name` is missing, store `"Untitled CV"`.
- Quota consumption (`CV_BUILDER`) works as before.

### 4. Rename (`PATCH /api/cv/:id`)

- Body is `RenameCvDto { name }`: `@IsString`, trimmed via `@Transform`, `@IsNotEmpty`, `@MaxLength(100)`.
- If the CV doesn't exist or belongs to another user → **404** `CV document not found.`
- Otherwise update `name` (Prisma bumps `updatedAt` automatically) and return the updated document
  (`CvDocumentDto` shape, including `name`).
- An invalid body (missing, empty or whitespace-only, over 100 characters, not a string) → **400**.
- No quota or AI throttling applies.

### 5. Structured data read (`GET /api/cv/:id/structured-data`)

- The response becomes `{ data: CvStructuredData; name: string }`. Error behavior doesn't change.
- Swagger: give this endpoint its own response DTO (e.g. `CvStructuredDataResponseDto`) so the
  `POST :id/extract` response (`CvExtractResponseDto`) stays `{ data }`.

### 6. List and job application responses

- `GET /api/cv` selects `name` and `updatedAt` as well. Ordering doesn't change.
- Job application list and detail queries select `cvDocument: { id, name }` instead of `fileName`.

### 7. Dashboard — "My CVs" table (`cv-file-list`)

- Columns: **Name | Source | Updated | Actions**. The Size and Uploaded columns are removed.
- **Name** cell: a source icon followed by `file.name`. The parse-status sub-line (Parsing… / Parsing
  failed) stays as it is today.
  - PDF → `pi pi-file-pdf` (critical color), DOCX → `pi pi-file-word` (info color), Built → a distinct
    "built" icon (e.g. `pi pi-pencil` / `pi pi-file-edit`, in a neutral or primary color). Icons are
    `aria-hidden="true"`.
- **Source** cell: pill badge using the existing pill styling. The label comes from a new
  `getSourceLabel(file)` helper. It returns `"Built in app"` when `mimeType` is `null`, and otherwise
  reuses `getMimeLabel(mimeType)` (`PDF` / `DOCX`).
  - For uploads, the badge has `[title]` = `formatFileSize(fileSize)`. Built CVs have no title.
- **Updated** cell: `updatedAt | date: 'MMM d, yyyy'`.
- **Search**: `globalFilterFields` = `['name']`.
- **Actions**: the existing actions plus a new **Rename** icon button (secondary, text, `pi pi-pen-to-square`
  or similar, `title`/`ariaLabel` "Rename"). It is available for all CVs, whatever their parse or extraction status.
- **Rename dialog** (PrimeNG `Dialog`, modal, header "Rename CV"):
  - One text input labelled "Name", prefilled with the current name and focused when the dialog opens.
  - Validation: required (after trim) and 100 characters max (`maxlength` attribute plus a validator).
    Show an inline error message linked to the input via `aria-describedby` when the input is invalid
    and touched or dirty.
  - Buttons: **Cancel** closes without changes. **Save** is disabled while the input is invalid or a
    save is running, and submitting with Enter does the same thing.
  - On Save, `cv-file-list` emits `renameCv` with `{ file, name }` (trimmed name). Whether the dialog
    lives in `cv-file-list` or in its own child component is up to the implementer; it must stay a
    small, single-responsibility component.
- `dashboard.ts` handles `renameCv`: it calls `CvApiService.renameCv(id, name)`. On success it replaces
  the item's `name` and `updatedAt` in `cvStore` via `updateCvList`, closes the dialog and shows a
  success toast. On error it shows an error toast (backend message if present) and leaves the dialog
  open with the entered value.

### 8. Dashboard analytics (`dashboard.ts`)

- `original_cv_downloaded` and `cv_deleted` send `file_id` and `cv_source` (`'pdf' | 'docx' | 'built'`,
  derived from `mimeType`). Remove `file_name`. Do not send the CV name.

### 9. CV builder (`cv-builder.ts` / `.html`)

- Add a `name` signal. It is prefilled with `"Untitled CV"` for a new CV, or from `name` in the
  `GET :id/structured-data` response in edit mode. Also store the loaded value (`originalName`) to
  detect changes.
- In `.builder-header`, show a labelled text input (`pInputText`, visible or `aria-label` "CV name",
  `maxlength="100"`) bound to the `name` signal.
- Validation: the trimmed name is required, 100 characters max. When invalid, show an inline error
  (linked via `aria-describedby`) and disable the **Save** button.
- Save flow (bundled with the existing Save, which navigates away afterwards):
  - **New CV**: `createManualCv({ ...mergedCv(), name: trimmedName })`.
  - **Existing CV**: call `updateStructuredData(id, mergedCv())`. If the trimmed name differs from
    `originalName`, also call `renameCv(id, trimmedName)`. Both requests must succeed before the success
    toast and navigation (e.g. `forkJoin`, or run them in sequence). If either fails, the existing error
    handling applies (error toast, `saving` reset, no navigation).
- `syncCvStore()` maps `name` and `updatedAt` into the `CvDocumentListItem`. When a rename was
  performed, it uses the renamed document's `name`.

### 10. Other label usages

- `job-upload.html`: `optionLabel="name"`.
- `optimization-list.html`: show `item.cvDocument.name`; `globalFilterFields` =
  `['jobTitle', 'companyName', 'cvDocument.name']`.
- `job-info-banner.html`: use `cvDocument.name` for the `@if` guard, `aria-label` and link text.
- `upload-cv.html`: no change (keeps `fileName`).

### 11. Frontend API (`core/services/cv-api.service.ts`)

- New `renameCv(id: string, name: string): Observable<CvDocument>` → `PATCH {apiUrl}/cv/{id}` with
  body `RenameCvRequest`.
- `createManualCv` accepts `CvStructuredData & { name?: string }`.
- `getStructuredData` return type becomes `Observable<{ data: CvStructuredData; name: string }>`.
  Existing consumers (cv-optimization) keep reading `data` and need no change beyond types.

## Edge Cases

- Upload whose file name is only an extension (`.pdf`) → name `"Untitled CV"`.
- Upload with multiple dots (`a.b.c.pdf`) → only the last extension is stripped (`a.b.c`).
- Upload file name longer than 100 characters → name cut to 100 characters.
- Rename to a whitespace-only string → 400 from the backend. The frontend blocks it first (trim + required).
- Rename to more than 100 characters → 400 from the backend. The frontend blocks it with `maxlength` + validator.
- Rename a CV owned by another user, or a non-existent id → 404 (no information leak).
- Rename to the same name → allowed. The builder skips the rename call when the name hasn't changed.
  In the dashboard dialog the API is called anyway; `updatedAt` changes, which is acceptable.
- Duplicate names across a user's CVs → allowed.
- `POST /cv/manual` without `name` (older client) → `"Untitled CV"`.
- `POST /cv/manual` with an empty or whitespace-only `name` → 400. The builder never sends it because
  Save is blocked.
- Builder edit: the structured-data update succeeds but the rename fails → error toast, no navigation.
  The structured data is already saved; the user can retry Save. (Accepted: there is no transaction
  across the two endpoints.)
- `PATCH /cv/:id/structured-data` is unchanged. A `name` sent there is stripped by `whitelist` and
  ignored.
- SSR: the Rename dialog and analytics code must not touch browser globals during server rendering.
  Analytics already guards with `isPlatformBrowser`.

## Data / API

### DB

- `cv_documents.name VARCHAR(100) NOT NULL` (Prisma: `name String @db.VarChar(100)`), backfilled by a
  hand-written migration `<timestamp>_cv_document_name`.

### Shared types (`@opticv/datatypes`)

- `CvDocument`: `+ name: string`.
- `UploadCvResponse`: `+ 'name'` in the `Pick`.
- `CvDocumentListItem`: `+ 'name' | 'updatedAt'` in the `Pick`.
- `JobApplicationListItem.cvDocument` and `JobApplicationWithCv.cvDocument`: `{ id: string; name: string }`
  (replaces `fileName`).
- New `RenameCvRequest = { name: string }`.
- New `CreateManualCvRequest = CvStructuredData & { name?: string }`, used by the frontend API and the
  backend controller typing.
- New `CvStructuredDataResponse = { data: CvStructuredData; name: string }`.
- Rebuild: `npm exec nx build datatypes`.

### Endpoints

| Method | Path | Change |
| --- | --- | --- |
| `POST` | `/api/cv/upload` | Persists the default `name`; response includes `name` |
| `POST` | `/api/cv/manual` | Body `CreateManualCvRequestDto` (adds optional `name`); default `"Untitled CV"`; response includes `name` |
| `PATCH` | `/api/cv/:id` | **New.** Body `RenameCvDto { name }` → 200 `CvDocumentDto`; 400 invalid; 401; 404 missing or not owned |
| `GET` | `/api/cv` | Items include `name`, `updatedAt` |
| `GET` | `/api/cv/:id/structured-data` | Response `{ data, name }` |
| Job application list/detail | (existing) | `cvDocument: { id, name }` |

### Backend DTOs (Swagger)

- `cv-request.dto.ts`: `CreateManualCvRequestDto extends CvStructuredDataRequestDto` (optional `name`),
  `RenameCvDto`.
- `cv-response.dto.ts`: add `name` to `UploadCvResponseDto`, `CvDocumentListItemDto` (also `updatedAt`)
  and `CvDocumentDto`. New `CvStructuredDataResponseDto { data; name }`.
- `job-application-response.dto.ts`: the nested CV DTO uses `name` instead of `fileName`.

### Service methods

- `CvService.uploadCv`: sets `name` (private helper to strip the extension and apply the fallback).
- `CvService.createManualCv(data, userId, name?)`: or it receives the DTO and splits out `name`.
- `CvService.renameCv(id, name, userId)`: new.
- `CvService.getStructuredData`: selects and returns `name`.
- `CvService.toUploadCvResponse` / `getUserCvs`: include `name` (+ `updatedAt` for the list).

## Acceptance (DEV)

- `npm exec nx run-many -t typecheck lint test` passes; `npm exec nx format:check` passes.
- Migration applied to dev via `migrate deploy` + `generate`. In Prisma Studio, existing uploads have
  names without extensions and builder CVs have `"Untitled CV"`.
- Backend tests updated or added:
  - `cv.service.spec.ts`: upload sets the stripped name (incl. the empty-name fallback and the 100-character cut);
    `createManualCv` defaults to or uses `name` and doesn't put `name` into `structuredData`; `renameCv`
    succeeds, and returns 404 for a missing CV and for another user's CV; `getStructuredData` returns `name`.
  - `cv.controller.spec.ts`: `PATCH :id` delegates to `renameCv`; `POST manual` passes `name`.
  - `cv-request.dto.spec.ts`: `RenameCvDto` validation (missing, empty, whitespace-only, over 100
    characters, valid with trimming); `CreateManualCvRequestDto` optional `name`.
  - `job-application*.spec.ts`: fixtures and selects use `name`.
- Frontend tests updated or added:
  - Fixtures across the affected `*.spec.ts` include `name` (and `updatedAt` where relevant).
  - `cv-file-list.spec.ts`: renders Name / Source / Updated columns, `Built in app` badge for a null
    `mimeType`, Rename emits `renameCv` with the trimmed name, Save disabled for an empty or too-long name.
  - `dashboard` spec: a successful rename updates `cvStore`; an error shows a toast.
  - `cv-builder.spec.ts`: new CV sends `name` with `createManualCv`; edit calls `renameCv` only when the
    name changed; Save is disabled for an empty name; the name is prefilled from `getStructuredData`.
  - `getSourceLabel` unit test (in `shared/utils.spec.ts` if placed in `shared/utils.ts`).
- Manual verification:
  - Dashboard: uploaded and built CVs are in one table; every row has a name, Source badge and Updated
    date; there are no empty cells.
  - Rename from the dashboard persists after a reload, and search finds the CV by its new name.
  - A CV created in the builder with a custom name shows that name in the dashboard, the job-upload
    dropdown, the optimization list (also searchable) and the job-info banner.
  - Uploading `Foo Bar.pdf` shows "Foo Bar".
  - `PATCH /api/cv/<another user's CV id>` returns 404.
- Accessibility: the Rename dialog and the builder name input have labels, linked error messages,
  keyboard operation (Enter submits, Esc closes the dialog), focus moves into the dialog on open and
  returns to the trigger on close; AXE checks pass.
- No breaking changes for existing API consumers: `structured-data` and `manual` changes are additive.
  The job application `cvDocument.fileName` → `name` rename is a coordinated change across the
  frontend and backend in this task.

## Assumptions

- `updatedAt` (Prisma `@updatedAt`) is the right value for the "Updated" column, even though it also
  changes on non-user updates such as parse or extraction status changes.
- The "built" icon and the Rename icon are picked from PrimeIcons. The exact glyphs are up to the
  implementer, as long as they are visually distinct from PDF / DOCX.
- There are no UI mockups (`ui/` folder absent). Layout follows the existing table, pill badge and
  icon-button styles.
- The rename request for an existing builder CV is bundled with Save rather than sent on blur, because
  Save navigates away and the builder has no autosave.
