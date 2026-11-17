# Preserve optimizations when a CV is deleted (archive instead of hard delete)

## Context

Pro accounts can store up to 10 CVs (`TIER_LIMITS[tier].maxStoredCvs`). To upload more, a user has to delete one. Right now `CvService.deleteCv` hard-deletes the `cv_documents` row. Postgres then cascades the delete (`ON DELETE CASCADE`) to every `job_applications` row that used that CV, and from there to every `optimization_results` row. Users lose their optimization history just to free a slot.

Goal: when a user deletes a CV, free the slot and remove the original file, but keep past job applications and optimizations. Users must still be able to view, edit and re-run them (the user chose this option).

Two things already in the code make this a small change:

- `CvDocument.isActive` already exists, and **the limit already counts only active CVs**: `cv.service.ts:101` and `users.service.ts:221` use `where: { userId, isActive: true }`. Nothing ever sets the flag to `false` yet.
- Past optimizations still need the CV's data. The optimization page calls `GET /cv/:id/structured-data` (`cv-optimization.ts:962`), and re-runs read `cvDocument.parsedText` and `structuredData` (`optimization.service.ts:391-410`). So the row and its parsed data must stay. Only the binary file is removed.

**No schema change or migration is needed.**

## Approach: "delete" = archive

### Backend (`apps/opticv-be`)

1. **`src/app/cv/cv.service.ts` → `deleteCv`**
   - Keep the current ownership checks.
   - Run `prisma.cvDocument.update({ where: { id }, data: { isActive: false, storageKey: null } })` instead of `delete`.
   - Then delete the R2 object with `this.r2.delete(oldStorageKey)`. Wrap it in try/catch and log failures with the existing `Logger` pattern from `users.service.ts` `deleteAccount`. Doing the database update first fixes the current problem where the file is deleted before the database delete is known to succeed.
   - Keep `parsedText`, `structuredData` and `fileName`. The UI uses `fileName` to label old applications.
   - If the CV is already archived, return without doing anything.
2. **`getUserCvs`**: add `isActive: true` to `where` so archived CVs disappear from the dashboard list and the job-upload CV picker.
3. **`updateStructuredData`**, **`getDownloadUrl`** and the extract endpoint (`cv-extraction.service.ts`, `POST :id/extract`): throw `NotFoundException` when the CV is archived. `getDownloadUrl` already returns 404 once `storageKey` is null. **`getStructuredData` must keep working** for archived CVs, because the optimization page needs it.
4. **`src/app/job-application/job-application.service.ts` → `assertCvOwnership`**: also reject `!cv.isActive`, so new applications can't be created with an archived CV and existing ones can't be switched to one. Existing applications are unaffected.
5. **Job application responses**: add `isActive` to the `cvDocument` select in `findAll` and `findOne` (`{ id, fileName, isActive }`). Update `CvDocumentSummaryDto` in `dto/job-application-response.dto.ts`.
6. `optimization.service.ts` `loadAndValidateApplication` needs **no change**. `parseStatus` stays `COMPLETED` and `parsedText` stays, so re-runs keep working.
7. `UsersService.deleteAccount` stays as it is. It deletes all of the user's CV rows (archived ones included), and the cascade still cleans up everything when the whole account is deleted.

### Shared types (`packages/shared/datatypes/src/lib/datatypes.ts`)

- Change `cvDocument: { id: string; fileName: string | null }` to `{ id: string; fileName: string | null; isActive: boolean }` in `JobApplicationListItem` and `JobApplicationWithCv`.

### Frontend (`apps/opticv-web`)

1. **`features/dashboard/dashboard.ts:133`**: change the confirm message to say the original file is removed and the slot freed, while past optimizations made with this CV are kept.
2. **`features/dashboard/components/optimization-list/optimization-list.html:71`**: when `!item.cvDocument.isActive`, show the file name muted with a "(deleted)" tag.
3. **`features/cv-optimization/components/job-info-banner/job-info-banner.html`**: when the CV is archived, show the file name as plain text marked "(deleted)" instead of the "open CV" button, since there is no file to download.
4. **`cv-optimization.ts` `openOriginalCv`**: return early if `!cvDocument.isActive`.
5. After a delete, the dashboard already reloads the CV list and usage. Make sure the optimizations list is **not** cleared or reloaded as if items were removed. If the current code removes optimizations for the deleted CV from `optimizationsItems`, change that so it updates `cvDocument.isActive` on those items, or reloads the list.

### Docs

- Update `docs/subscription-tier-limits.md` if it describes deletion behaviour.

## Tests

- `cv.service.spec.ts`:
  - `deleteCv` updates the row (not delete) with `isActive: false` and `storageKey: null`, then calls `r2.delete`.
  - An R2 failure is logged, not thrown.
  - `getUserCvs` filters on `isActive: true`.
  - `updateStructuredData` and extract reject archived CVs.
  - `getStructuredData` still works for archived CVs.
- `job-application.service.spec.ts`: `create` and `update` reject an archived CV, and `findAll` and `findOne` return `cvDocument.isActive`.
- Frontend specs: `optimization-list` and `job-info-banner` show the "(deleted)" state, and the dashboard shows the new confirm message.

## Verification

1. `npm exec nx run-many -t typecheck lint test -p opticv-be opticv-web datatypes`
2. Manual check with `npm run start-be:dev` and `npm exec nx serve opticv-web`:
   - Upload a CV and create a job application, then run optimizations.
   - Delete the CV from the dashboard. It disappears from the CV list, and the stored-CVs meter drops by 1.
   - The optimization still appears in the dashboard list with "(deleted)" next to the CV name. Opening it shows all results, and re-running a prompt works.
   - The job-upload CV picker no longer offers the deleted CV.
   - In Prisma Studio, the `cv_documents` row has `isActive=false` and `storageKey=null`, and the R2 object is gone.
   - Upload a new CV: when the user was at the limit, it now succeeds.
