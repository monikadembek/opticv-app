# Code Review — Task #7: CV File Upload

Reviewer: Claude Code (automated peer review)
Date: 2026-05-14
Branch: feature/7-file-upload-and-parsing

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The feature is substantially complete and correct. Both backend and frontend paths are implemented as specified, type-sharing via `@opticv/datatypes` is in place, tests cover the main branches, and conventions are largely followed. Two non-blocking but notable issues exist: (1) `R2Service` uses `R2_PUBLIC_URL` as the S3 endpoint instead of the intended `R2_ACCOUNT_ID`-derived URL, which is a configuration bug that will cause R2 uploads to fail in production; (2) a commented-out `uploadAnother()` method was left in the page component, violating the no-leftover-code rule. No critical convention violations were found.

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **Commented-out dead code** — `apps/opticv-web/src/app/features/upload-cv/upload-cv.ts`, lines 66–68: the `uploadAnother()` method is commented out. The rules state: "Never leave TODO comments when performing a task. Every task must be completed fully." Commented-out code is equivalent. Either implement the "Upload another" reset flow or remove the block entirely.

2. **Missing `<p-toast>` in page template** — `apps/opticv-web/src/app/features/upload-cv/upload-cv.html`: the `MessageService` is used to add toasts but no `<p-toast>` element is present in the page template. If no parent layout renders `<p-toast>`, toasts will be silently swallowed. The implementation plan noted this risk (Frontend Risk #3) but it was not resolved. Verify a `<p-toast>` exists in the parent layout; if not, add it to `upload-cv.html`.

3. **`filesize` computed null-check uses redundant cast** — `apps/opticv-web/src/app/features/upload-cv/upload-cv.ts`, line 34: `(this.uploadedFile() as UploadCvResponse).fileSize` is redundant — the `if (this.uploadedFile())` guard already narrows the type. The same pattern appears in `cv-dropzone.ts` line 45. Use the non-null assertion `this.uploadedFile()!.fileSize` (consistent with how the template uses `uploadedFile()!.fileName`), or use optional chaining.

4. **`Logger.error` used as static method** — `apps/opticv-be/src/app/cv/cv.service.ts`, lines 74–78; `apps/opticv-be/src/app/cv/r2.service.ts`, lines 44, 57: NestJS best practice is to instantiate a named logger (`private readonly logger = new Logger(CvService.name)`) and call `this.logger.error(...)`. The static `Logger.error` works but does not include the class context, making log filtering harder in production.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Dedicated `/upload-cv` Angular route, lazy-loaded, protected by `authGuard` | Covered | `app.routes.ts` lines 23–27 |
| Drag-and-drop zone + file-picker button (PDF/DOCX only, max 5 MB) | Covered | `cv-dropzone.ts` and `cv-dropzone.html` |
| Client-side validation: file type and file size | Covered | `cv-dropzone.ts` lines 98–112 |
| File preview strip with name, size, remove button | Covered | `cv-dropzone.html` lines 7–23 |
| Multiple files dropped → accept first, show info message | Covered | `cv-dropzone.ts` lines 69–72 |
| "Upload CV" button with loading state | Covered | `cv-dropzone.html` lines 25–31 |
| Frontend service `POST /api/cv/upload` | Covered | `cv-upload-api.service.ts` |
| On success: toast + uploaded-file card | Partial | Toast works if `<p-toast>` is mounted in layout (unverified — see Non-Critical #2) |
| "Upload another" link resets component | Missing | Spec §Frontend step 9 requires this; `uploadAnother()` is commented out and no link appears in template |
| On error: toast with API message or fallback | Covered | `upload-cv.ts` lines 54–61 |
| Re-enable upload button on error | Covered | `isLoading` reset in error handler |
| `POST /api/cv/upload` with `SupabaseGuard` | Covered | `cv.controller.ts` lines 19, 25 |
| Backend file validation (MIME type, size, missing file) | Covered | `cv.service.ts` lines 35–45 |
| R2 upload with `@aws-sdk/client-s3` | Covered | `r2.service.ts` |
| Storage key `uploads/{userId}/{uuid}.{ext}` | Covered | `cv.service.ts` line 48 |
| `CvDocument` DB record creation with correct fields | Covered | `cv.service.ts` lines 53–63 |
| Return 201 with `UploadCvResponse` shape | Covered | `cv.controller.ts` `@HttpCode(HttpStatus.CREATED)` |
| Return 400 for invalid type/size | Covered | `BadRequestException` in `cv.service.ts` |
| Return 500 on R2 or DB error | Covered | `InternalServerErrorException` |
| Orphan R2 cleanup on DB failure | Covered (bonus — beyond spec) | `cv.service.ts` lines 75–79 |
| `CvDocument` and `UploadCvResponse` types in `@opticv/datatypes` | Covered | `datatypes.ts` lines 11–27 |
| R2 env vars added to validation schema | Covered | `config/validation.ts` lines 9–13 |
| `CvModule` registered in `AppModule` | Covered | `app.module.ts` line 10 |
| `@CurrentUser()` param decorator | Covered | `auth/decorators/current-user.decorator.ts` |

---

### Plan Deviations

1. **`R2Service` uses `R2_PUBLIC_URL` as the S3 endpoint, not `R2_ACCOUNT_ID`** — The implementation plan (Step 4.3) specifies the endpoint as `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`. The actual `r2.service.ts` constructor (line 18) reads `R2_PUBLIC_URL` for the S3Client endpoint instead. `R2_PUBLIC_URL` is described in the spec as an optional base URL for public file access, not the S3-compatible API endpoint. The validation schema marks `R2_ACCOUNT_ID` as required but it is never read by `R2Service`. This will cause upload requests to be sent to the wrong host.

2. **"Upload another" flow not implemented** — The plan (Frontend Step 13) and spec (§Frontend step 9) require an "Upload another" link that resets the component back to the empty upload zone. The method is stubbed out as a comment in `upload-cv.ts` and no corresponding link exists in `upload-cv.html`.

3. **`R2Service` added `delete` method beyond plan scope** — The plan did not include a `delete` method on `R2Service`. It was added to support rollback on DB failure (itself an improvement beyond the spec). This is acceptable and well-tested, but is a deviation from the plan.

4. **`@CurrentUser()` decorator placed in `auth/decorators/` not `cv/decorators/`** — The plan specified `apps/opticv-be/src/app/cv/decorators/current-user.decorator.ts`. The actual file is at `apps/opticv-be/src/app/auth/decorators/current-user.decorator.ts`. This is a better location (auth-related, reusable across modules) and is not a problem, but it differs from the plan.

5. **`dto/upload-cv-response.dto.ts` not created** — The plan specified a DTO class file. Instead, the `UploadCvResponse` shape is returned directly using the shared type from `@opticv/datatypes` with an inline cast. No separate DTO file exists. This is acceptable — the return type is correct and the shared type serves the same purpose.

---

### Null Safety Issues

1. **`file` parameter typed as `Express.Multer.File | undefined` with guard** — `cv.service.ts` line 32: the undefined guard is present and correct. No issue.

2. **`event.dataTransfer?.files` in `onDrop`** — `cv-dropzone.ts` line 66: optional chaining is used correctly; early return handles `undefined`. No issue.

3. **`err?.error?.message` in error handler** — `upload-cv.ts` line 56: optional chaining used correctly with nullish coalescing fallback. No issue.

---

### Code Smells

1. **`ALLOWED_MIME_TYPES` duplicated across backend and frontend** — The same array literal appears in `cv.service.ts` (lines 11–14) and `cv-dropzone.ts` (lines 15–18). This is expected for this stage (shared validation constants in `@opticv/datatypes` are out of scope per spec), but worth noting for future cleanup.

2. **`formatFileSize` utility duplicated invocation in two places** — Both `UploadCv` (page) and `CvDropzone` each independently format file sizes. This is intentional separation but creates duplication. No action needed within this task.

3. **`(this.uploadedFile() as UploadCvResponse)` cast is redundant** — See Non-Critical #3 above.

4. **`validationError` not cleared on successful drop in multi-file scenario** — `cv-dropzone.ts` `onDrop`, lines 68–73: when `files.length > 1`, `validationError` is set but the previous `selectedFile` is NOT cleared. Conversely, if a user previously had a valid file selected and then drops multiple files, the `selectedFile` signal still holds the old file while `validationError` shows a new error. `validateFile` at line 99 does `validationError.set(null)` at the start, so the single-file path is fine. The multi-file guard path at line 70 should also clear `selectedFile` to ensure consistent state:

   ```
   // Lines 69–72
   if (files.length > 1) {
     this.validationError.set('Only one file can be uploaded at a time.');
     return;  // selectedFile may still hold previous valid file
   }
   ```

   This is a minor state consistency issue, not a data-loss bug, but could cause the "Upload CV" button to remain visible with a stale file while showing the multi-file error.

---

### Recommendation

**Fix critical issues before merge.**

The two items that require action before this is production-ready:

1. **Fix `R2Service` endpoint** (`r2.service.ts` line 18): use `R2_ACCOUNT_ID` to construct `https://${accountId}.r2.cloudflarestorage.com` as the S3Client endpoint, not `R2_PUBLIC_URL`. Without this fix, all file uploads will fail at runtime.

2. **Implement or remove the "Upload another" flow** (`upload-cv.ts` lines 66–68, `upload-cv.html`): either add the "Upload another" link that calls `uploadedFile.set(null)`, or confirm the feature is intentionally deferred and remove the commented-out code.

All other findings are non-blocking style and polish items.
