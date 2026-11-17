# CV names + unified "My CVs" table

## Context

CVs created with the CV builder have no `fileName`, `mimeType` or `fileSize`, so the dashboard
"My CVs" row looks empty. `fileName` is also the CV's display label elsewhere, so builder CVs show
blank in:

- the CV dropdown on job upload (`job-upload.html`, `optionLabel="fileName"`)
- the CV column of the optimization list (`optimization-list.html`)
- the CV link in the job info banner (`job-info-banner.html`)

Decision:

- Add a **`name`** column to `CvDocument` as the single display label for **all** CVs.
- Uploads default to the file name without its extension. Builder CVs default to `"Untitled CV"`.
  Users can rename any CV.
- Keep **one table** with a **Source** badge (PDF / DOCX / Built), not two tables.

## 1. Database (Prisma)

`apps/opticv-be/prisma/schema.prisma` → `CvDocument`: add `name String @db.VarChar(100)`.

Migration `…_cv_document_name`, written by hand (the dev DB has drift, so **do not** use `migrate dev`):

```sql
ALTER TABLE "cv_documents" ADD COLUMN "name" VARCHAR(100);
UPDATE "cv_documents"
  SET "name" = COALESCE(NULLIF(regexp_replace("fileName", '\.[^.]+$', ''), ''), 'Untitled CV');
ALTER TABLE "cv_documents" ALTER COLUMN "name" SET NOT NULL;
```

Apply it from `apps/opticv-be`: `npm exec prisma migrate deploy` then `npm exec prisma generate`.

## 2. Shared types — `packages/shared/datatypes/src/lib/datatypes.ts`

- `CvDocument`: add `name: string`.
- Add `name` to `UploadCvResponse` and `CvDocumentListItem`. Also add `updatedAt` to `CvDocumentListItem` for the "Updated" column.
- `JobApplicationListItem` / `JobApplicationWithCv`: `cvDocument: { id; name }` replaces `fileName`.
- New `RenameCvRequest = { name: string }`.
- Rebuild the lib (`npm exec nx build datatypes`) so `dist` picks it up.

## 3. Backend — `apps/opticv-be/src/app/cv/`

- `cv.service.ts`
  - `uploadCv()` (both create branches): `name: stripExtension(file.originalname).slice(0, 100)`. Fall back to `'Untitled CV'` if the result is empty.
  - `createManualCv()`: accept an optional `name`, default `'Untitled CV'`.
  - `toUploadCvResponse()` / `getUserCvs()` select: add `name` and `updatedAt`.
  - New `renameCv(id, name, userId)`: return 404 when the CV is missing or belongs to another user (same pattern as `updateStructuredData`), then update `name`.
- `cv.controller.ts`: new `@Patch(':id')` taking a `RenameCvDto` (`@IsString @Trim @IsNotEmpty @MaxLength(100)`) → `renameCv`. Optional `name` on the existing `POST manual` DTO.
- `dto/cv-response.dto.ts`: add `name` to the response DTOs (Swagger).
- `job-application/job-application.service.ts` + `dto/job-application-response.dto.ts`: select `name` instead of `fileName`.
- Specs: update `cv.service.spec.ts`, `cv.controller.spec.ts` and `job-application*.spec.ts`. Add tests for the rename endpoint (success, 404 for another user's CV, validation).

## 4. Frontend — `apps/opticv-web/src/app/`

- `core/services/cv-api.service.ts`: `renameCv(id, name)`.
- **Dashboard table** `features/dashboard/components/cv-file-list/cv-file-list.html`:
  - Columns become **Name | Source | Updated | Actions**.
  - Name: icon by source (pdf / word / "built" icon) + `file.name`, keeping the parse-status sub-line.
  - Source: badge `PDF` / `DOCX` / `Built in app`. Add a `getSourceLabel(file)` helper that returns built when `mimeType` is null; reuse the existing `getMimeLabel`.
  - Updated: `updatedAt`. Show file size as a `title` tooltip on the badge for uploads; drop the Size column.
  - `globalFilterFields` → `['name']`.
  - Add a **Rename** action. It opens a small PrimeNG `Dialog` with one input (required, max 100) and emits `renameCv` to `dashboard.ts`, which calls the API and updates `cvStore`.
- `features/dashboard/dashboard.ts` (analytics events): send `cv_name`/source instead of `file_name`.
- **CV builder** `features/cv-builder/cv-builder.ts/.html`:
  - Editable name field in the builder header, prefilled from the doc (or `"Untitled CV"` for a new CV).
  - On first save, send the name with `POST manual`. Later changes call `renameCv`, either on blur or bundled with save; use whichever matches the builder's existing save flow.
  - `fileName` mapping → `name`.
- Change `fileName` → `name` as the label in: `cv-optimization/components/job-upload/job-upload.html` (`optionLabel="name"`), `job-info-banner.html` and `optimization-list.html` (display + `globalFilterFields`). `upload-cv.html` can keep `fileName`, since it shows the actual uploaded file.
- Update the affected `*.spec.ts` fixtures (add `name`). Follow `docs/angular-best-practices.md` (signals, no `standalone: true`).

## Out of scope / follow-ups

- Unique-name enforcement (duplicates are allowed).
- Defaulting builder names from the person's name in `structuredData` (possible later improvement).

## Verification

1. `npm exec nx run-many -t typecheck lint test` — all green.
2. Apply the migration to dev. In Prisma Studio, check that existing uploads now have names without the extension and builder CVs have "Untitled CV".
3. `npm run start-be:dev` + `npm exec nx serve opticv-web`, then:
   - Dashboard: uploaded and built CVs sit in one table, every row has a name and a Source badge, and nothing is empty.
   - Rename a CV from the dashboard; it persists after reload, and search finds it by its new name.
   - Create a CV in the builder with a custom name, then check it in the dashboard, the job-upload dropdown, the optimization list and the job-info banner.
   - Upload `Foo Bar.pdf`; it appears as "Foo Bar".
4. Rename someone else's CV id via the API: expect 404.
