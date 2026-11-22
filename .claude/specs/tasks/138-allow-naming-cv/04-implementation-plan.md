# Implementation Plan — Task 138-allow-naming-cv

Sources: `02-spec.md`, `03-spec-review.md` (PASS WITH ISSUES). Both critical review findings are resolved in this plan:

- **Critical #1 (Rename dialog state ownership):** the dashboard owns the dialog state. See Frontend §4.1.
- **Critical #2 (backfill overflow):** the backfill wraps the name in `LEFT(…, 100)`. See Backend §2.

---

## Backend Plan

### Review findings resolved

| Review item | Resolution |
| --- | --- |
| Critical #2 — backfill overflow | **Resolved.** `fileName` is an unbounded `String?` and `uploadCv` stores `file.originalname` verbatim, so long names can exist. The backfill wraps the expression in `LEFT(…, 100)`, the same 100-char rule as new uploads. |
| Non-critical #1 — trim on non-strings | **Resolved.** Both name DTOs use `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)`. A non-string reaches `@IsString` untouched, so the client gets a 400, not a 500. |
| Non-critical #4 — Swagger for `PATCH /cv/:id` | **Resolved.** The route gets `@ApiOperation`, `@ApiBody({ type: RenameCvDto })` and `@ApiResponse` for 200/400/401/404, matching the existing `cv.controller.ts` style. |
| Non-critical #5 — other `fileName` usages | **Resolved: no change.** `cv-extraction.service.ts` (L57 guard `!doc.fileName`, L74 passes it to OpenAI) and `openai.service.ts` (L39/L55 `filename` sent to OpenAI) use the real file name and stay untouched. |
| `createManualCv` signature | **Resolved.** The controller passes the DTO unchanged: `createManualCv(body, user.id)`. The service signature is `createManualCv(body: CreateManualCvRequest, userId: string)` and the service does `const { name, ...structuredData } = body`. The controller test asserts `toHaveBeenCalledWith({ ...mockStructuredData, name: 'My CV' }, mockUser.id)`. |

### 1. API Contract

All routes are under the global `/api` prefix. `SupabaseGuard` is applied at class level on `CvController`, so every route requires auth.

| Method | Route | Request DTO | Response DTO | Status codes | Auth |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/cv/upload` | multipart `file` (unchanged) | `UploadCvResponseDto` (**+ `name`**) | 201, 400, 401, 403 (`CV_LIMIT_EXCEEDED`), 422, 500 (unchanged) | ✅ |
| POST | `/api/cv/manual` | **`CreateManualCvRequestDto`** (all `CvStructuredDataRequestDto` fields + optional `name`) | `CvDocumentDto` (**+ `name`**) | 201; **400** (invalid body, incl. empty, whitespace-only or >100-char `name`); 401; 403 (quota) | ✅ |
| **PATCH** | **`/api/cv/:id`** (new) | **`RenameCvDto { name }`** | `CvDocumentDto` | 200; 400 (missing/empty/whitespace-only/>100/non-string); 401; 404 `CV document not found.` (missing or not owned) | ✅ |
| GET | `/api/cv` | — | `CvDocumentListItemDto[]` (**+ `name`, `updatedAt`**) | 200, 401 | ✅ |
| GET | `/api/cv/:id/structured-data` | — | **`CvStructuredDataResponseDto { data, name }`** | 200, 401, 404 (unchanged) | ✅ |
| PATCH | `/api/cv/:id/structured-data` | `CvStructuredDataRequestDto` (unchanged; a `name` sent here is stripped by `whitelist`) | `CvDocumentDto` (now includes `name`) | unchanged | ✅ |
| POST | `/api/cv/:id/extract` | — | `CvExtractResponseDto { data }` (**unchanged**) | unchanged | ✅ |
| GET | `/api/job-applications` (list) | unchanged | items with `cvDocument: { id, name }` | unchanged | ✅ |
| GET | `/api/job-applications/:id` | — | `cvDocument: { id, name }` | unchanged | ✅ |

There is no conflict between `PATCH :id` and `PATCH :id/structured-data`, because Express matches path segments exactly.

### 2. Database Changes

**`apps/opticv-be/prisma/schema.prisma`** (`CvDocument`)
- Add `name String @db.VarChar(100)` next to the file fields.
- The column has no default and is NOT NULL, so Prisma's `create` input requires it. This is intentional: it forces both create paths in `cv.service.ts` to set a name.

**New migration:** `apps/opticv-be/prisma/migrations/<YYYYMMDDHHMMSS>_cv_document_name/migration.sql`
- The timestamp must be after `20261019114230_product_updates_opt_in`.
- Write the SQL by hand:

```sql
ALTER TABLE "cv_documents" ADD COLUMN "name" VARCHAR(100);
UPDATE "cv_documents"
  SET "name" = LEFT(
    COALESCE(NULLIF(regexp_replace("fileName", '\.[^.]+$', ''), ''), 'Untitled CV'),
    100);
ALTER TABLE "cv_documents" ALTER COLUMN "name" SET NOT NULL;
```

- `LEFT` counts characters, which is how `VARCHAR(100)` measures length.
- Builder CVs (`fileName IS NULL`) and names that are only an extension both get `'Untitled CV'`.
- No index and no RLS change. The RLS policies from `20261015120000_enable_rls` cover whole rows, so they need no update.

**Apply** from `apps/opticv-be`, never with `migrate dev`:
1. `npm exec prisma migrate deploy`
2. `npm exec prisma generate`

### 3. Shared types (`packages/shared/datatypes/src/lib/datatypes.ts`)

Changes to existing types:
- `CvDocument`: add `name: string`.
- `UploadCvResponse`: add `'name'` to the `Pick`.
- `CvDocumentListItem`: add `'name' | 'updatedAt'` to the `Pick`.
- `JobApplicationListItem.cvDocument` and `JobApplicationWithCv.cvDocument`: change to `{ id: string; name: string }`.

New types:
- `RenameCvRequest = { name: string }`
- `CreateManualCvRequest = CvStructuredData & { name?: string }`
- `CvStructuredDataResponse = { data: CvStructuredData; name: string }`

New constants, added next to `TIER_LIMITS`:
- `DEFAULT_CV_NAME = 'Untitled CV'`
- `CV_NAME_MAX_LENGTH = 100`

These are the single source shared by the backend default, the DTO limit and the frontend builder/dialog. See Integration Check, gap 1.

Rebuild with `npm exec nx build datatypes`.

### 4. Domain Logic

**4.1 Upload default name (`CvService.uploadCv`)**
- Add a private helper `buildCvNameFromFileName(originalName: string): string`:
  1. Strip the last extension with `originalName.replace(/\.[^.]+$/, '')`. This matches the migration regex.
  2. Truncate to `CV_NAME_MAX_LENGTH` code points with `Array.from(stripped).slice(0, 100).join('')`. This matches Postgres character counting and never splits a surrogate pair (review assumption #8).
  3. If the result is empty, return `DEFAULT_CV_NAME`.
- Set `name: this.buildCvNameFromFileName(file.originalname)` in **both** `prisma.cvDocument.create` calls (PDF and DOCX).
- `toUploadCvResponse`: add `name: string` to the parameter type and `name: doc.name` to the returned object.
- Expected results:
  - `Foo Bar.pdf` → `Foo Bar`
  - `a.b.c.pdf` → `a.b.c`
  - `.pdf` → `Untitled CV`
  - a 150-char base name → its first 100 chars

**4.2 Manual create (`CvService.createManualCv`)**
- Signature: `createManualCv(body: CreateManualCvRequest, userId: string): Promise<CvDocument>`.
- First line: `const { name, ...structuredData } = body;`. The backend targets es2021, so `useDefineForClassFields` is off and a missing `name` is not an own property. The rest spread never leaks `name` into `structuredData`.
- The quota check (`CV_BUILDER`) and the order of operations stay the same.
- Persist `name: name ?? DEFAULT_CV_NAME` along with `structuredData`.
- An explicit JSON `null` for `name` is skipped by `@IsOptional` and stored as `"Untitled CV"`, the same as a missing name.

**4.3 Rename (`CvService.renameCv`, new)**
- Signature: `renameCv(id: string, name: string, userId: string): Promise<CvDocument>`.
- Steps:
  1. `findUnique({ where: { id }, select: { userId: true } })`.
  2. If the CV is missing or `userId` doesn't match, throw `NotFoundException('CV document not found.')`. A CV the user doesn't own looks the same as a missing one.
  3. `update({ where: { id }, data: { name } })`. `@updatedAt` bumps automatically.
  4. Return the updated document as `CvDocument`, using the same cast as `updateStructuredData`.
- The DTO has already trimmed and validated `name`, so there is no re-validation.
- No quota check and no `AiThrottlerGuard`.

**4.4 Structured data read (`CvService.getStructuredData`)**
- Add `name: true` to `select`.
- The return type becomes `Promise<CvStructuredDataResponse>` and the method returns `{ data, name: doc.name }`.
- Both 404 branches stay as they are.

**4.5 List (`CvService.getUserCvs`)**
- Add `name: true` and `updatedAt: true` to `select`.
- Ordering stays `createdAt: 'desc'`.

**4.6 Job applications (`job-application.service.ts`)**
- `findAll` select (L45) and `findOne` include (L57) become `cvDocument: { select: { id: true, name: true } }`.

**4.7 DTOs**

`cv/dto/cv-request.dto.ts`
- Add imports: `Transform` from `class-transformer`, and `IsNotEmpty` and `MaxLength` from `class-validator`.
- `trimIfString`: a module-level function, `({ value }) => typeof value === 'string' ? value.trim() : value`.
- `CreateManualCvRequestDto extends CvStructuredDataRequestDto`, with an optional `name?: string`:
  - `@ApiPropertyOptional({ example: 'Frontend CV', maxLength: 100 })`
  - `@IsOptional()`
  - `@Transform(trimIfString)`
  - `@IsString()`
  - `@IsNotEmpty()`
  - `@MaxLength(CV_NAME_MAX_LENGTH)`
- `RenameCvDto` with `name!: string`. It uses the same decorators with `@ApiProperty` instead of `@ApiPropertyOptional` and without `@IsOptional()`, and implements `RenameCvRequest`.
- `@Transform` runs during `plainToInstance`, before validation. A whitespace-only name becomes `''` and fails `@IsNotEmpty`. `@IsOptional` only skips `null` and `undefined`, so `''` is still rejected.

`cv/dto/cv-response.dto.ts`
- Add `name` (`@ApiProperty({ example: 'my-cv' })`) to `UploadCvResponseDto`, `CvDocumentListItemDto` and `CvDocumentDto`.
- Add `updatedAt` to `CvDocumentListItemDto`.
- New `CvStructuredDataResponseDto { data: CvStructuredDataDto; name: string }`.
- `CvExtractResponseDto` stays `{ data }`.

`job-application/dto/job-application-response.dto.ts`
- Change `CvDocumentSummaryDto.fileName` to `name!: string` with `@ApiProperty({ example: 'my-resume' })`.

**4.8 Controller (`cv.controller.ts`)**
- `createManualCv`:
  - Body type becomes `CreateManualCvRequestDto`.
  - Add `@ApiResponse({ status: 400, description: 'Invalid request body' })`.
  - Still calls `createManualCv(body, user.id)`.
- New rename route:
  - Decorators: `@Patch(':id')`, `@HttpCode(HttpStatus.OK)`, `@ApiOperation({ summary: 'Rename a CV' })`, `@ApiBody({ type: RenameCvDto })`, and `@ApiResponse` for 200 (`CvDocumentDto`), 400, 401 and 404.
  - Handler: `renameCv(@Param('id') id: string, @Body() body: RenameCvDto, @CurrentUser() user: UserModel): Promise<CvDocument>` calls `this.cvService.renameCv(id, body.name, user.id)`.
- `getStructuredData`: the Swagger 200 type becomes `CvStructuredDataResponseDto`, and the return type becomes `Promise<CvStructuredDataResponse>`.
- Keep the existing convention that route ids are plain strings with no `ParseUUIDPipe`.

### 5. Authentication / Authorization
- The class-level `SupabaseGuard` covers the new `PATCH :id`.
- Ownership is enforced in the service and returns 404 when the user doesn't own the CV, the same pattern as `updateStructuredData` and `getStructuredData`.
- No RLS policy changes are needed, because the backend accesses the database through Prisma with the service connection.

### 6. Backend files

| File | Action | Purpose |
| --- | --- | --- |
| `apps/opticv-be/prisma/schema.prisma` | modify | Add `name String @db.VarChar(100)` to `CvDocument` |
| `apps/opticv-be/prisma/migrations/<ts>_cv_document_name/migration.sql` | create | Add the column, backfill with `LEFT(…,100)`, set NOT NULL |
| `packages/shared/datatypes/src/lib/datatypes.ts` | modify | `name` on CV types, `updatedAt` on the list item, `cvDocument.name` for job apps, 3 new types, 2 constants |
| `apps/opticv-be/src/app/cv/dto/cv-request.dto.ts` | modify | `CreateManualCvRequestDto`, `RenameCvDto`, `trimIfString` |
| `apps/opticv-be/src/app/cv/dto/cv-response.dto.ts` | modify | `name`/`updatedAt` fields, `CvStructuredDataResponseDto` |
| `apps/opticv-be/src/app/cv/cv.service.ts` | modify | Name helper, upload names, `createManualCv` split, `renameCv`, `name` in structured data, list select |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | modify | `PATCH :id`, manual-create DTO, structured-data Swagger and return type |
| `apps/opticv-be/src/app/job-application/job-application.service.ts` | modify | Select `name` instead of `fileName` (2 places) |
| `apps/opticv-be/src/app/job-application/dto/job-application-response.dto.ts` | modify | `CvDocumentSummaryDto.name` |
| `apps/opticv-be/src/app/cv/cv.service.spec.ts` | modify | Tests (see §7) |
| `apps/opticv-be/src/app/cv/cv.controller.spec.ts` | modify | Tests (see §7) |
| `apps/opticv-be/src/app/cv/dto/cv-request.dto.spec.ts` | modify | DTO validation tests |
| `apps/opticv-be/src/app/job-application/job-application.service.spec.ts` | modify | Fixtures and select assertions use `name` |
| `apps/opticv-be/src/app/job-application/job-application.controller.spec.ts` | modify | Fixture L38 uses `name` instead of `fileName` |
| `cv-extraction.service.ts`, `openai.service.ts`, `prisma/seed.ts` | **no change** | These use the real file name; the seed creates no CV documents |

### 7. Backend test plan (Jest)

**`cv.service.spec.ts`**
- Add `name` to `mockDoc`.
- Upload:
  - The PDF `create` call includes the stripped `name`, and the response includes `name`.
  - The DOCX path sets the stripped name.
  - `a.b.c.pdf` → `a.b.c`.
  - `.pdf` → `Untitled CV`.
  - A 150-char base name → a 100-char name.
- `createManualCv`:
  - Without `name`: `name: 'Untitled CV'`, and `structuredData` equals the input.
  - With `name: 'My CV'`: the name is used, and `expect(arg.data.structuredData).not.toHaveProperty('name')`.
  - The existing quota tests still pass.
- `renameCv`:
  - Success: `findUnique` is called with `select: { userId: true }`, `update` is called with `{ where: { id }, data: { name } }`, and the document is returned.
  - Missing CV: `NotFoundException`, and `update` is not called.
  - Another user's CV: `NotFoundException`, and `update` is not called.
- `getStructuredData`: the select includes `name: true`, and the method returns `{ data, name }`.
- `getUserCvs`: the select includes `name` and `updatedAt`.

**`cv.controller.spec.ts`**
- Add `renameCv` to `mockCvService`.
- `createManualCv` passes the whole body, including `name`, plus the user id.
- `renameCv('cv-id', { name: 'New' }, mockUser)` delegates to the service and returns its result. Errors propagate.
- `getStructuredData` returns `{ data: {}, name: 'x' }`.

**`cv-request.dto.spec.ts`** (`plainToInstance` + `validate`)
- `RenameCvDto`:
  - missing name → error
  - `''` → error
  - `'   '` → error
  - 101 chars → error
  - `123` → `isString` error, not a thrown exception
  - `'  Foo  '` → valid, and the value becomes `'Foo'`
  - exactly 100 chars → valid
- `CreateManualCvRequestDto`:
  - no `name` → valid
  - `'  Foo '` → valid and trimmed
  - `''` or whitespace only → error
  - 101 chars → error
  - the structured fields are still validated

**Job-application specs**
- Mocks and expected selects use `cvDocument: { id, name }`.

### 8. Backend implementation order
1. Shared types and constants, then `npm exec nx build datatypes`.
2. Edit `schema.prisma`, write the migration by hand, then run `migrate deploy` and `generate`.
3. Request and response DTOs.
4. `cv.service.ts`, then `cv.controller.ts`.
5. `job-application.service.ts` and its DTO.
6. Specs, then typecheck, lint, test and format check.
7. Frontend. It must land in the same change, because the shared-type updates break frontend typecheck and fixtures.

### Backend risks
- **Deploy and migration order:** run `prisma:migrate:staging` / `prisma:migrate:production` before or together with the backend deploy. Old code against the migrated schema fails, because its `create` calls leave out the NOT NULL `name`.
- **Breaking job-application change:** `cvDocument.fileName` → `name` breaks clients that aren't updated. The spec accepts this; the frontend must ship in the same release.
- **Rename vs. delete race:** a row deleted between `findUnique` and `update` produces Prisma P2025 → 500. `updateStructuredData` has the same race today, so no extra handling is added.
- **Non-ASCII upload names:** multer decodes `originalname` as latin1, so non-ASCII file names may produce garbled default names. This is existing `fileName` behavior and out of scope.
- **Renaming to the same name** still bumps `updatedAt`. The spec accepts this.

---

## Frontend Plan

`plan-frontend.md` is written for React (`.tsx`, hooks, TanStack Query, `useState`). This repo is Angular 21, so the steps are adapted:
- "Hooks" become `CvApiService` methods.
- `useState` and React Query become signals plus the NgRx Signals `CvStore`.

### 1. Requirements summary
- **Routes:** none new.
- **New component:** `RenameCvDialog`.
- **Modified:** `cv-file-list`, `dashboard`, `cv-builder`, `job-upload`, `optimization-list`, `job-info-banner`, `CvApiService`, `shared/utils.ts`.
- **Data:**
  - Read `name`/`updatedAt` on list items.
  - Read `{ data, name }` from structured-data.
  - Rename a CV.
  - Send an optional `name` when creating a CV manually.
  - Change the analytics payload.
- **Explicitly unchanged:**
  - `upload-cv.html`, plus the `cv_file_uploaded` event in `upload-cv.ts`, which keeps the file name.
  - `features/cv-optimization/services/cv-optimization-api.service.ts`. It has its own `getStructuredData` typed `{ data }`, so it needs no change (review Non-critical #3).
  - All PostHog events outside `dashboard.ts`.

### 2. API Contract (expected by the frontend)

| Method | Route | Request body | Response | Used by |
|---|---|---|---|---|
| GET | `/api/cv` | — | `CvDocumentListItem[]` (now incl. `name: string`, `updatedAt: Date \| string`) | `CvStore.loadUserCVs` (code unchanged) |
| GET | `/api/cv/:id/structured-data` | — | `CvStructuredDataResponse` = `{ data: CvStructuredData; name: string }` | `CvApiService.getStructuredData` → `CvBuilder.loadExistingCv` |
| POST | `/api/cv/manual` | `CreateManualCvRequest` = `CvStructuredData & { name?: string }` (flat) | `CvDocument` (incl. `name`) | `CvBuilder.save` (new CV) |
| PATCH | `/api/cv/:id/structured-data` | `CvStructuredData` (unchanged, no `name`) | `CvDocument` | `CvBuilder.save` (existing CV, step 1) |
| PATCH | `/api/cv/:id` **(new)** | `RenameCvRequest` = `{ name: string }` | `CvDocument` (incl. `name`, `updatedAt`) | `Dashboard.renameCv`; `CvBuilder.save` (existing CV, step 2, only if the name changed) |
| POST | `/api/cv/upload` | multipart (unchanged) | `UploadCvResponse` (now incl. `name`) | upload-cv (type change only) |
| GET | job applications list/detail (existing) | — | `cvDocument: { id: string; name: string }` instead of `fileName` | optimization-list, job-info-banner |

Error contract the frontend relies on:
- `PATCH /cv/:id` returns 400 for an invalid name and 404 for a missing or not-owned CV.
- The error body has `message`. It is a string, or a string array for class-validator 400s; see Integration Check, gap 2.

Shared types: owned by the Backend Plan (§3). They are listed in both plans but implemented once.

### 3. Routing
No changes.

### 4. Components

#### 4.1 Critical #1 resolution: Rename dialog state ownership

**Decision:** `Dashboard` owns all rename state and makes the API call.
- A separate presentational `RenameCvDialog` is rendered in `dashboard.html`, not inside `cv-file-list`.
- `cv-file-list` only reports which row's Rename button was clicked.

Flow:
1. The Rename button in `cv-file-list` calls `renameCvFile.emit(file)`.
2. The dashboard's `openRenameDialog(file)` runs `renameTarget.set(file)`.
3. The dialog receives:
   - `visible = !!renameTarget()`
   - `cvName = renameTarget()?.name ?? ''`
   - `saving = renaming()`
4. Save or Enter makes the dialog emit `save(trimmedName)`, which calls `Dashboard.renameCv(name)`:
   - Set `renaming` to true, then call `CvApiService.renameCv(renameTarget().id, name)`.
   - **Success:** patch `cvStore`, show a success toast, run `renameTarget.set(null)` (this closes the dialog) and set `renaming` to false.
   - **Error:** show an error toast and set `renaming` to false. `renameTarget` is left as it is, so the dialog stays open with the entered value. The dialog only resets its control when `visible` goes from false to true.
5. Cancel, Esc or the close icon make the dialog emit `dismiss`, and `Dashboard.closeRenameDialog()` runs `renameTarget.set(null)`. The dialog can't be closed while `renaming()` is true.

**Deviation from the spec's wording:**
- The spec says `cv-file-list` emits `renameCv` with `{ file, name }`. Here `cv-file-list` emits `renameCvFile(file)` on click, and the trimmed name comes from `RenameCvDialog.save`.
- The spec lets the implementer decide where the dialog lives. This is the only design that gives the dashboard a clean way to close the dialog or keep it open.
- The spec's acceptance test "Rename emits trimmed name" moves to `rename-cv-dialog.spec.ts`.

#### 4.2 Component table

| Component | Type | File | Inputs / Outputs / State |
|---|---|---|---|
| `RenameCvDialog` **(new)** | molecule | `features/dashboard/components/rename-cv-dialog/rename-cv-dialog.ts` + `.html` | Details below |
| `CvFileList` (modify) | organism | `features/dashboard/components/cv-file-list/cv-file-list.ts/.html` | Existing inputs and outputs, plus a new output `renameCvFile = output<CvDocumentListItem>()` |
| `Dashboard` (modify) | page | `features/dashboard/dashboard.ts/.html` | New signals `renameTarget = signal<CvDocumentListItem \| null>(null)` and `renaming = signal(false)`. New methods `openRenameDialog(file)`, `closeRenameDialog()`, `renameCv(name: string)` |
| `CvBuilder` (modify) | page | `features/cv-builder/cv-builder.ts/.html/.css` | New signals `name`, `originalName`. New computeds `trimmedName`, `nameError`. Modified `save()` and `syncCvStore()` |

#### `RenameCvDialog` in detail

**Setup**
- Selector `app-rename-cv-dialog`, OnPush, no `standalone: true`.
- Imports: `DialogModule`, `ButtonModule`, `InputTextModule`, `ReactiveFormsModule`.

**Inputs and outputs**
- Inputs: `visible = input(false)`, `cvName = input('')`, `saving = input(false)`.
- Outputs: `save = output<string>()` and `dismiss = output<void>()`. The second one isn't called `cancel`, because `@angular-eslint/no-output-native` disallows that name.

**State**
- `nameControl = new FormControl('', { nonNullable: true, validators: [cvNameValidator] })`.
- A private `returnFocusTo: HTMLElement | null`.

**Behavior**
- An `effect` runs when `visible()` becomes true. It calls `nameControl.reset(cvName())`, which also clears touched and dirty. In the browser only (`isPlatformBrowser`), it records `inject(DOCUMENT).activeElement`, which is the Rename trigger button.
- `onHide()` focuses `returnFocusTo` if it is still connected. PrimeNG 21's `Dialog` focuses the first focusable element when it shows (`focusOnShow`), but it does not restore focus when it hides. This was verified in the source.
- `showError()` returns `nameControl.invalid && (touched || dirty)`.
- `errorMessage()` returns "Name is required." or "Name must be 100 characters or fewer."
- `submit()`:
  - If the control is invalid or `saving()` is true, mark the control as touched and return.
  - Otherwise call `save.emit(nameControl.value.trim())`.
- `onVisibleChange(false)` calls `dismiss.emit()`.

**Template**
- The dialog element:
  - `<p-dialog header="Rename CV" [modal]="true" [closable]="!saving()" [closeOnEscape]="!saving()" [draggable]="false" [resizable]="false" [style]="{ width: '480px', maxWidth: '95vw' }" (onHide)="onHide()">`
- Inside it, a `<form (ngSubmit)="submit()">` that contains:
  - `<label for="rename-cv-name">Name</label>`
  - `<input pInputText id="rename-cv-name" maxlength="100" [formControl]="nameControl" [invalid]="showError()" [attr.aria-invalid]="showError()" [attr.aria-describedby]="showError() ? 'rename-cv-name-error' : null">`
  - A conditional `<small id="rename-cv-name-error" role="alert">`.
- Enter submits through implicit form submission, since the form has a single text input.
- `#footer`:
  - Cancel: secondary, text, `[disabled]="saving()"`, emits `dismiss`.
  - Save: `[disabled]="nameControl.invalid || saving()"`, `[loading]="saving()"`, `(onClick)="submit()"`.

#### `CvFileList` template

**Columns:** Name | Source | Updated | Actions. The Size and Uploaded columns are removed.

**Name cell**
- `@switch (getCvSource(file))` picks the icon. All icons are `aria-hidden="true"`.

  | Source | Icon |
  | --- | --- |
  | `pdf` | `pi pi-file-pdf text-(--critical)` |
  | `docx` | `pi pi-file-word text-(--info)` |
  | `built` | `pi pi-hammer text-(--primary-700)` |

- The icon is followed by `{{ file.name }}`. The parse-status sub-line is unchanged.
- **Built icon choice (review "Unclear" item):** `pi pi-hammer`. It is not `pi-pencil` (the Edit action) or `pi-pen-to-square` (the Rename action), and it looks clearly different from the PDF and DOCX file icons.

**Source cell**
- The existing pill `<span>` shows `{{ getSourceLabel(file) }}`.
- It has `[attr.title]="file.mimeType && file.fileSize !== null ? formatFileSize(file.fileSize) : null"`, so built CVs get no title.

**Updated cell:** `{{ file.updatedAt | date: 'MMM d, yyyy' }}`.

**Search:** `[globalFilterFields]="['name']"`.

**Rename button**
- Placed after Edit.
- `icon="pi pi-pen-to-square"`, `severity="secondary"`, `size="small"`, `[text]="true"`, `styleClass="action-icon-btn"`, `title="Rename"`, `ariaLabel="Rename"`, `(onClick)="renameCv(file)"`.
- Never disabled.

**TS**
- Expose `getSourceLabel` and `getCvSource`.
- Drop the `getMimeLabel` field, since the template no longer uses it. Keep `formatFileSize`.
- Add `renameCv(file)`, which emits `renameCvFile`.

#### `Dashboard`

**Template (`dashboard.html`)**
- Import `RenameCvDialog`.
- `<app-cv-file-list … (renameCvFile)="openRenameDialog($event)" />`
- `<app-rename-cv-dialog [visible]="!!renameTarget()" [cvName]="renameTarget()?.name ?? ''" [saving]="renaming()" (save)="renameCv($event)" (dismiss)="closeRenameDialog()" />`

**`renameCv(name)`**
- Return early if there is no target or `renaming()` is true.
- Call the API with `takeUntilDestroyed(this.destroyRef)`.
- **Success:**
  - `cvStore.updateCvList(cvFiles().map(f => f.id === doc.id ? { ...f, name: doc.name, updatedAt: doc.updatedAt } : f))`.
  - Toast with severity `success`, summary `Success` and detail `CV renamed successfully.`
- **Error:** toast with severity `error`, summary `Rename failed` and detail `err?.error?.message ?? 'Renaming CV failed. Please try again.'`.

**`closeRenameDialog()`:** ignored while `renaming()` is true.

**Analytics**
- In `original_cv_downloaded` and `cv_deleted`, replace `file_name: file.fileName` with `cv_source: getCvSource(file)`.
- `file_id`, `page` and `button_icon` stay.

### 5. Data access (Angular services in place of hooks)

| Method | File | Endpoint | Notes |
|---|---|---|---|
| `renameCv(id: string, name: string): Observable<CvDocument>` **(new)** | `core/services/cv-api.service.ts` | `http.patch<CvDocument>(\`${apiUrl}/cv/${id}\`, body)`, body `RenameCvRequest = { name }` | |
| `createManualCv(data: CreateManualCvRequest): Observable<CvDocument>` | same | POST `/cv/manual` (flat body) | Signature type change only |
| `getStructuredData(id): Observable<CvStructuredDataResponse>` | same | GET `/cv/:id/structured-data` | Return type change only |

New helpers in `shared/utils.ts`:
- `export type CvSource = 'pdf' | 'docx' | 'built'`.
- `getCvSource(file: Pick<CvDocumentListItem, 'mimeType'>): CvSource`:
  - `null` → `'built'`
  - `getMimeLabel(...) === 'PDF'` → `'pdf'`
  - anything else → `'docx'`
- `getSourceLabel(file: Pick<CvDocumentListItem, 'mimeType'>): string`:
  - `null` → `'Built in app'`
  - anything else → `getMimeLabel(mimeType)`
- `validateCvName(value: string): 'required' | 'maxlength' | null`: trims first, returns `'required'` if empty and `'maxlength'` if longer than `CV_NAME_MAX_LENGTH`.
- `cvNameValidator: ValidatorFn`: wraps `validateCvName` and returns `{ [key]: true }` or `null`.

Constants: `CV_NAME_MAX_LENGTH` and `DEFAULT_CV_NAME` are imported from `@opticv/datatypes`. The frontend agent originally planned to add them to `shared/constants.ts`; that was changed to resolve Integration Check, gap 1. The builder and the dialog share the validation rules through these helpers.

### 6. State Management

| State | Where | Kind |
|---|---|---|
| CV list (`name`, `updatedAt`) | `CvStore.cvList` (existing) | Shared store; updated through `updateCvList` from the dashboard (rename) and the builder (`syncCvStore`) |
| `renameTarget`, `renaming` | `Dashboard` | Local signals; the single owner of dialog visibility and saving state |
| `nameControl`, `returnFocusTo` | `RenameCvDialog` | Local, presentational |
| `name`, `originalName`, `trimmedName`, `nameError` | `CvBuilder` | Local signals and computeds |

#### CvBuilder details

**State**
- `name = signal(DEFAULT_CV_NAME)`
- `originalName = signal<string | null>(null)`
- `trimmedName = computed(() => name().trim())`
- `nameError = computed(...)`, which maps `validateCvName(name())`:
  - `'required'` → "CV name is required."
  - `'maxlength'` → "CV name must be 100 characters or fewer."
  - otherwise → `null`

**Loading an existing CV:** `loadExistingCv` destructures `{ data, name }` and sets both `name` and `originalName`.

**Header template**
- Add a `.builder-name-field` between `.builder-heading` and the Save button. It contains:
  - `<label for="cv-name">CV name</label>`
  - `<input pInputText id="cv-name" type="text" maxlength="100" [ngModel]="name()" (ngModelChange)="name.set($event)" [invalid]="!!nameError()" [attr.aria-invalid]="!!nameError()" [attr.aria-describedby]="nameError() ? 'cv-name-error' : null" />`
  - A conditional `<small id="cv-name-error" role="alert">{{ nameError() }}</small>`
- Save: `[disabled]="saving() || !!nameError()"`.

**CSS (`cv-builder.css`)**
- `.builder-header` gets `flex-wrap: wrap`.
- `.builder-name-field`: flex column, `flex: 1`, `max-width: 28rem`, small gap.
- An error text style using `var(--critical)`.

**`save()` (Non-critical #2 resolution: sequential, rename last)**
- Return early if `nameError()` is set. Otherwise take `name = trimmedName()`.
- New CV: `createManualCv({ ...mergedCv(), name })`.
- Existing CV:
  - `updateStructuredData(id, payload).pipe(switchMap(doc => name !== originalName() ? cvApiService.renameCv(id, name) : of(doc)))`.
  - The subscriber receives exactly one final `CvDocument`: the rename response if a rename happened, otherwise the update response.
- The existing success and error handling is unchanged. If either call fails: error toast, `saving` reset, no navigation.

**`syncCvStore(doc)`:** add `name: doc.name` and `updatedAt: doc.updatedAt`.

### 7. Frontend files

Paths are relative to `apps/opticv-web/src/app/` unless a full path is given.

| File | Action | Purpose |
|---|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | (owned by backend §3) | Type changes |
| `shared/utils.ts` | modify | `CvSource`, `getCvSource`, `getSourceLabel`, `validateCvName`, `cvNameValidator` |
| `shared/utils.spec.ts` | modify | Helper tests |
| `core/services/cv-api.service.ts` | modify | `renameCv`; types for `createManualCv` and `getStructuredData` |
| `core/services/cv-api.service.spec.ts` | modify | Tests and fixtures |
| `features/dashboard/components/rename-cv-dialog/rename-cv-dialog.ts` | create | Dialog component |
| `features/dashboard/components/rename-cv-dialog/rename-cv-dialog.html` | create | Dialog template |
| `features/dashboard/components/rename-cv-dialog/rename-cv-dialog.spec.ts` | create | Dialog tests |
| `features/dashboard/components/cv-file-list/cv-file-list.ts` / `.html` / `.spec.ts` | modify | Table layout and Rename output |
| `features/dashboard/dashboard.ts` / `.html` / `.spec.ts` | modify | Rename state and handler, dialog wiring, analytics |
| `features/cv-builder/cv-builder.ts` / `.html` / `.css` / `.spec.ts` | modify | Name field and save flow |
| `features/cv-optimization/components/job-upload/job-upload.html` | modify | `optionLabel="name"` |
| `features/cv-optimization/components/job-upload/job-upload.spec.ts` | modify | Fixtures gain `name` and `updatedAt` |
| `features/dashboard/components/optimization-list/optimization-list.html` | modify | `item.cvDocument.name`; `globalFilterFields = ['jobTitle', 'companyName', 'cvDocument.name']` |
| `features/dashboard/components/optimization-list/optimization-list.spec.ts` | modify | Fixtures, rendering of the name, search by name |
| `features/cv-optimization/components/job-info-banner/job-info-banner.html` | modify | `cvDocument.name` in the `@if`, the `aria-label` and the link text |
| `features/cv-optimization/components/job-info-banner/job-info-banner.spec.ts` | modify | Fixtures; two test titles change from fileName to name |
| `features/cv-optimization/cv-optimization.spec.ts` | modify (fixtures) | `mockCv` gains `name` and `updatedAt`; `mockJobApplicationWithCv.cvDocument` gains `name` |
| `features/home/home.spec.ts` | modify (fixtures) | `name`, `updatedAt` |
| `core/services/job-application-api.service.spec.ts` | modify (fixtures) | `cvDocument: { id, name }` |
| `features/upload-cv/upload-cv.spec.ts`, `features/upload-cv/services/cv-upload-api.service.spec.ts` | modify (fixtures) | `UploadCvResponse` gains `name`. The template and its `.truncate` assertions keep using `fileName`. |

Not touched: `upload-cv.html`, `upload-cv.ts`, `cv-optimization-api.service.ts`, `cv.store.ts` (its spec uses `as` casts).

### 8. Frontend test plan

**`shared/utils.spec.ts`**
- `getSourceLabel`: null → "Built in app", PDF → "PDF", DOCX → "DOCX".
- `getCvSource`: returns `pdf`, `docx` and `built` for the matching inputs.
- `validateCvName`:
  - `''` and `'   '` → `required`
  - 101 chars → `maxlength`
  - 100 chars → `null`
  - `'  ok  '` → `null`
- `cvNameValidator`: maps each result to the right errors object.

**`cv-api.service.spec.ts`**
- `renameCv` sends a PATCH to `/api/cv/doc-id` with body `{ name }` and returns a `CvDocument`. A 404 propagates to the caller.
- `createManualCv` includes `name` in the body when one is given.
- `getStructuredData` flushes `{ data, name }`.
- Fixtures gain `name`.

**`rename-cv-dialog.spec.ts`** (new)
- Prefill:
  - Prefills from `cvName` when `visible` becomes true.
  - Reopening resets both the value and the touched state.
- Validation:
  - Save is disabled for an empty, whitespace-only or 101-char name.
  - The error is linked via `aria-describedby` and shown only after the field is touched or dirty.
- Submitting:
  - Save emits the trimmed name.
  - Submitting the form with Enter emits the name.
  - An invalid submit does not emit.
- Closing: Cancel and `visibleChange(false)` both emit `dismiss`.
- Saving state:
  - While `saving` is true, Save is disabled and shows loading, Cancel is disabled, and the dialog can't be closed.
  - When `saving` goes from true back to false while the dialog is still visible (the error path), the entered value is kept.

**`cv-file-list.spec.ts`**
- Fixtures:
  - Existing fixtures gain `name` and `updatedAt`.
  - Add a built CV with null `mimeType`, `fileSize`, `fileName` and `storageKey`.
- Table:
  - The headers are Name / Source / Updated / Actions.
  - Each row shows `name`.
- Source badge:
  - "Built in app" for the built CV, "PDF"/"DOCX" for uploads.
  - Uploads have a file-size `title`; the built CV has none.
- Icons and dates:
  - Each source has the right icon class (hammer for built).
  - The Updated date is formatted.
- Rename and search:
  - Clicking Rename emits `renameCvFile` with the file, even when `extractionStatus` is PENDING.
  - Searching by the new name filters the rows.

**`dashboard.spec.ts`**
- The `cvApiService` mock gains `renameCv`.
- `openRenameDialog` sets `renameTarget`.
- A successful rename:
  - updates `name` and `updatedAt` for that row only in `cvStore`
  - clears `renameTarget`
  - shows the success toast
  - resets `renaming`
- A failed rename:
  - shows a toast with the backend message, or the fallback text
  - keeps `renameTarget`
  - resets `renaming`
- `closeRenameDialog` is ignored while renaming.
- The PostHog download and delete events are captured with `cv_source: 'pdf'` and without `file_name`.
- Fixtures gain `name`, `updatedAt` and `cvDocument.name`.

**`cv-builder.spec.ts`**
- Mocks: `getStructuredData` returns `{ data, name: 'My CV' }`, and `renameCv` is added.
- New CV:
  - The name defaults to `'Untitled CV'`.
  - `createManualCv` is called with `{ ...merged, name: trimmed }`.
- Existing CV:
  - The name is prefilled from `getStructuredData`.
  - An unchanged name means no `renameCv` call.
  - A changed name calls `renameCv(id, trimmed)` after `updateStructuredData`; assert the call order.
  - When the rename fails: error toast, no navigation, `saving` is false.
  - The store item uses the renamed document's `name` and `updatedAt`.
- Validation:
  - For an empty or over-100-char name, Save is disabled and the error is shown and linked to the input.
  - `save()` does nothing while the name is invalid.

**`optimization-list.spec.ts`**
- Renders `cvDocument.name`.
- Global search matches on the CV name.

**`job-info-banner.spec.ts`**
- The button shows the name and its `aria-label` is "Open <name>".
- An empty name hides the button.

**`job-upload.spec.ts` and the fixture-only specs**
- Fixtures are type-correct.
- Where `job-upload.spec.ts` asserts option labels, it asserts on `name`.

### 9. Frontend implementation order
1. Shared datatypes. The backend does this first.
2. `shared/utils.ts` and its tests.
3. `CvApiService` and its spec.
4. The label swaps (job-upload, optimization-list, job-info-banner) and all fixture updates. Typecheck should be clean after this step.
5. `RenameCvDialog` and its spec.
6. `CvFileList` and its spec.
7. `Dashboard` (wiring, rename handler, analytics) and its spec.
8. `CvBuilder` (TS, HTML, CSS) and its spec.
9. Run `npm exec nx run-many -t typecheck lint test` and `npm exec nx format:check`, then do the manual and AXE checks from the spec's acceptance list.

### Frontend risks
1. **Deviation from the spec's wording.** The spec has `cv-file-list` emit `renameCv { file, name }`. This plan replaces it with `renameCvFile(file)` plus `RenameCvDialog.save(name)`, with the dashboard owning `renameTarget` and `renaming`. This is the resolution of review Critical #1.
2. **400 messages may be arrays.** class-validator 400s return `message: string[]`, and the existing code puts `err.error.message` straight into the toast detail. See Integration Check, gap 2.
3. **Partial builder failure.** If the structured-data save succeeds and the rename fails, there is no transaction to roll it back. The spec accepts this; the user retries with Save.
4. **Manual focus return.** PrimeNG 21's `Dialog` doesn't restore focus on hide. The trigger is captured from `document.activeElement` in the browser only. This is SSR-safe because the dialog is never visible on the server.
5. **Uppercase pill.** The existing pill has the `uppercase` class, so "Built in app" shows as "BUILT IN APP". The text content and the tests stay "Built in app".
6. **Deploy order.** The frontend needs `name` in the API responses. Without it, labels are blank and the builder's name field is empty, which blocks Save. The backend and frontend must deploy together.
7. **Type cascade.** Adding `name` and `updatedAt` as required shared fields breaks about 10 spec fixtures at once. Update them all in one step (step 4).
8. **Dashboard always calls the API on rename.** It calls PATCH even when the name is unchanged, which bumps `updatedAt`. This is per the spec; the builder skips the call when the name is unchanged.

---

## API Contract

| Method | Route | Request | Response | Status | Backend | Frontend consumer |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/cv/upload` | multipart `file` | `UploadCvResponse` (+ `name`) | 201/400/401/403/422/500 | `CvController.uploadCv` | upload-cv (types only) |
| POST | `/api/cv/manual` | `CreateManualCvRequestDto` ≙ `CreateManualCvRequest` (flat, optional `name`) | `CvDocument` (+ `name`) | 201/400/401/403 | `CvController.createManualCv` | `CvApiService.createManualCv` ← `CvBuilder.save` (new) |
| **PATCH** | **`/api/cv/:id`** | `RenameCvDto` ≙ `RenameCvRequest { name }` | `CvDocument` | 200/400/401/404 | `CvController.renameCv` (new) | `CvApiService.renameCv` ← `Dashboard.renameCv`, `CvBuilder.save` (edit, if the name changed) |
| GET | `/api/cv` | — | `CvDocumentListItem[]` (+ `name`, `updatedAt`) | 200/401 | `CvController.getUserCvs` | `CvStore.loadUserCVs` |
| GET | `/api/cv/:id/structured-data` | — | `CvStructuredDataResponse { data, name }` | 200/401/404 | `CvController.getStructuredData` | `CvApiService.getStructuredData` ← `CvBuilder` (cv-optimization's own service is unaffected) |
| PATCH | `/api/cv/:id/structured-data` | `CvStructuredData` (unchanged) | `CvDocument` (+ `name`) | unchanged | `CvController.updateStructuredData` | `CvBuilder.save` (edit, step 1) |
| POST | `/api/cv/:id/extract` | — | `{ data }` (unchanged) | unchanged | `CvController.extractCv` | unchanged |
| GET | `/api/job-applications`, `/api/job-applications/:id` | unchanged | `cvDocument: { id, name }` | unchanged | `JobApplicationService.findAll/findOne` | optimization-list, job-info-banner, cv-optimization |

## Integration Check

Every frontend call has a matching backend endpoint, and the methods, routes and DTO shapes match. The frontend's `CreateManualCvRequest`, `RenameCvRequest` and `CvStructuredDataResponse` match the backend DTOs field for field. The only gaps are below:

| Frontend expects | Backend provides | Gap |
|-----------------|-----------------|-----|
| `CV_NAME_MAX_LENGTH` and `DEFAULT_CV_NAME` in `apps/opticv-web/src/app/shared/constants.ts` (frontend agent's original plan) | The same constants exported from `@opticv/datatypes` | The constants would be defined twice. **Resolved in this plan:** the frontend imports them from `@opticv/datatypes`, and `shared/constants.ts` is not modified. |
| Error toast detail = `err.error.message` (treated as a string) | class-validator 400s return `message: string[]`; 404s return a string | An array would show up raw in the toast. **Resolution:** where the rename and builder-save error handlers read `err.error.message`, join it with `', '` if it's an array. This is a small change limited to those two error paths. In practice the frontend's own validation should stop these 400s from happening. |
| The shared datatypes changes are listed in both plans | — | **Coordination only:** they are implemented once, as backend step 1, before any frontend work starts. |

## Unified Implementation Order

The template's steps that mention `Modules.Contracts` and `pnpm lerna run contract` are adapted to this repo: shared DTO types live in `@opticv/datatypes` and are rebuilt with `npm exec nx build datatypes`.

1. **DB migration:**
   - Add `name` to `CvDocument` in `schema.prisma`.
   - Write the `<ts>_cv_document_name/migration.sql` migration by hand, with the `LEFT(…, 100)` backfill.
   - From `apps/opticv-be`, run `npm exec prisma migrate deploy`, then `npm exec prisma generate`.
2. **Domain entities:** the Prisma client is regenerated as part of step 1. There are no other entity classes.
3. **Shared contracts:** update `packages/shared/datatypes/src/lib/datatypes.ts` (types and constants), then run `npm exec nx build datatypes`.
4. **Backend DTOs and services:**
   - `cv-request.dto.ts` and `cv-response.dto.ts`, and `job-application-response.dto.ts`.
   - `cv.service.ts` (name helper, `createManualCv`, `renameCv`, `getStructuredData`, `getUserCvs`) and `job-application.service.ts`.
5. **API endpoints:**
   - `cv.controller.ts`: add `PATCH :id`, change the manual-create DTO, and update the structured-data response type.
   - Backend specs, then `npm exec nx test opticv-be`.
6. **Contract sync:** confirm `datatypes` builds and `npm exec nx typecheck opticv-be` passes.
7. **Frontend atoms and molecules:**
   - `shared/utils.ts` helpers and validator, and `CvApiService`, each with its spec.
   - The label swaps in job-upload, optimization-list and job-info-banner.
   - All fixture updates. `npm exec nx typecheck opticv-web` should be clean after this.
   - `RenameCvDialog` and its spec.
8. **Frontend organisms and pages:** `CvFileList`, then `Dashboard` (rename wiring and analytics), then `CvBuilder` (name field and sequential save), each with its spec.
9. **Route registration:** none. No new routes.
10. **API wiring and end-to-end check in the browser:**
    - Run `npm exec nx run-many -t typecheck lint test` and `npm exec nx format:check`.
    - Start `npm run start-be:dev` and `npm exec nx serve opticv-web`.
    - Go through the spec's manual verification list: the unified table, renaming and its persistence, search, a builder name showing up in all four places, `Foo Bar.pdf` → "Foo Bar", a 404 for another user's CV, and AXE checks on the dialog and the builder name field.
    - **Deploy:** run the migration before, or together with, the backend deploy, and release the frontend and backend together.
