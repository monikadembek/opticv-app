# Implementation Done — Task 7-file-upload

## Summary

CV file upload feature delivered. The backend exposes `POST /api/cv/upload` (multipart/form-data, protected by `SupabaseGuard`) which validates the file, uploads it to Cloudflare R2 via `@aws-sdk/client-s3`, persists a `CvDocument` record in Postgres, and returns the record projection. The frontend adds a lazy-loaded, auth-guarded `/upload-cv` route with a drag-and-drop zone component, client-side validation, and success/error toast feedback. Shared types `CvDocument` and `UploadCvResponse` were added to `@opticv/datatypes`. Unit tests were added for all new backend and frontend files.

---

## Specification Coverage

| # | Requirement | Status | Note |
|---|-------------|--------|------|
| **Frontend** | | | |
| F1 | Dedicated `/upload-cv` Angular route, lazy-loaded, protected by `authGuard` | Implemented | `app.routes.ts` |
| F2 | Drag-and-drop zone labeled "Drag & drop your CV here" with icon | Implemented | `cv-dropzone.html` |
| F3 | "Browse files" button inside zone opens OS file picker | Implemented | `cv-dropzone.html` — `<label>` wrapping hidden `<input type="file">` |
| F4 | Helper text "Accepted formats: PDF, DOCX · Max size: 5 MB" | Implemented | Shown in `upload-cv.html` page template (not inside dropzone) |
| F5 | Client-side validation — wrong MIME type → inline error "Only PDF and DOCX files are accepted." | Implemented | `cv-dropzone.ts` `validateFile()` |
| F6 | Client-side validation — size > 5 MB → inline error "File must be smaller than 5 MB." | Implemented | `cv-dropzone.ts` `validateFile()` |
| F7 | File preview strip with icon, name, size, remove button after valid selection | Implemented | `cv-dropzone.html` |
| F8 | "Upload CV" button with loading state (disabled + spinner) | Implemented | `cv-dropzone.html` `<p-button [loading]="isLoading()">` |
| F9 | File POSTed to `/api/cv/upload` as multipart/form-data | Implemented | `cv-upload-api.service.ts` |
| F10 | Success (201): PrimeNG success toast "CV uploaded successfully." | Implemented | `upload-cv.ts` `onFileSelected()` |
| F11 | Success (201): upload zone replaced with uploaded-file card (name, size, upload date) | Implemented | `upload-cv.html` — `@if (uploadedFile())` card |
| F12 | "Upload another" link resets component back to empty upload zone | Not implemented | No "Upload another" button/link in `upload-cv.html` |
| F13 | Error: PrimeNG error toast with API message or generic fallback | Implemented | `upload-cv.ts` error handler |
| F14 | Error: re-enable upload button | Implemented | `isLoading.set(false)` on error; button bound to `isLoading()` |
| F15 | Multiple files dropped → show info "Only one file can be uploaded at a time." | Implemented | `cv-dropzone.ts` `onDrop()` |
| F16 | State resets cleanly after remove + new file selection | Implemented | `removeFile()` clears signals |
| **Backend** | | | |
| B1 | `POST /api/cv/upload` endpoint accepts `multipart/form-data` with field `file` | Implemented | `cv.controller.ts` `FileInterceptor('file', { storage: memoryStorage() })` |
| B2 | `SupabaseGuard` validates Bearer token; internal DB user ID attached to request | Implemented | Guard via `AuthModule`; `CurrentUser` decorator extracts `UserModel` |
| B3 | Backend validation — invalid MIME type → 400 with message | Implemented | `cv.service.ts` |
| B4 | Backend validation — file > 5 242 880 bytes → 400 with message | Implemented | `cv.service.ts` `MAX_FILE_SIZE = 5 * 1024 * 1024` |
| B5 | Backend validation — no file provided → 400 | Implemented | `cv.service.ts` |
| B6 | Storage key generated: `uploads/{userId}/{uuid}.{ext}` | Implemented | `cv.service.ts` using `crypto.randomUUID()` |
| B7 | File uploaded to Cloudflare R2 via `@aws-sdk/client-s3` | Implemented | `r2.service.ts` `PutObjectCommand` |
| B8 | `CvDocument` record created (userId, fileName, fileSize, mimeType, storageKey, parsedText=null, isActive=true) | Implemented | `cv.service.ts` Prisma `cvDocument.create` |
| B9 | Return 201 with `{ id, fileName, fileSize, mimeType, storageKey, createdAt }` | Implemented | `cv.controller.ts` `@HttpCode(HttpStatus.CREATED)` |
| B10 | R2 or DB error → 500 Internal Server Error | Implemented | `r2.service.ts` and `cv.service.ts` throw `InternalServerErrorException` |
| B11 | No auth → 401 | Implemented | `SupabaseGuard` |
| **Shared types** | | | |
| S1 | `CvDocument` type added to `@opticv/datatypes` | Implemented | `datatypes.ts` |
| S2 | `UploadCvResponse` type added to `@opticv/datatypes` | Implemented | `datatypes.ts` |
| **Config / env** | | | |
| C1 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` added to `development.env` and `production.env` | Implemented | Keys and values present in `development.env`; `production.env` has keys |
| C2 | Joi validation rules for R2 env vars added to `config/validation.ts` | Implemented | All five vars added as `required()` |

---

## Files

### Created

| File | Purpose |
|------|---------|
| `apps/opticv-be/src/app/cv/cv.module.ts` | NestJS feature module |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | `POST /cv/upload` endpoint |
| `apps/opticv-be/src/app/cv/cv.service.ts` | File validation, storage key generation, R2 upload, DB write |
| `apps/opticv-be/src/app/cv/r2.service.ts` | Cloudflare R2 S3-compatible client wrapper |
| `apps/opticv-be/src/app/cv/cv.controller.spec.ts` | Unit tests for `CvController` |
| `apps/opticv-be/src/app/cv/cv.service.spec.ts` | Unit tests for `CvService` |
| `apps/opticv-be/src/app/cv/r2.service.spec.ts` | Unit tests for `R2Service` |
| `apps/opticv-be/src/app/auth/decorators/current-user.decorator.ts` | `@CurrentUser()` param decorator |
| `apps/opticv-web/src/app/features/upload-cv/upload-cv.ts` | Page component |
| `apps/opticv-web/src/app/features/upload-cv/upload-cv.html` | Page template |
| `apps/opticv-web/src/app/features/upload-cv/upload-cv.spec.ts` | Unit tests for `UploadCv` page |
| `apps/opticv-web/src/app/features/upload-cv/components/cv-dropzone/cv-dropzone.ts` | Drag-and-drop zone component |
| `apps/opticv-web/src/app/features/upload-cv/components/cv-dropzone/cv-dropzone.html` | Dropzone template |
| `apps/opticv-web/src/app/features/upload-cv/components/cv-dropzone/cv-dropzone.spec.ts` | Unit tests for `CvDropzone` |
| `apps/opticv-web/src/app/features/upload-cv/services/cv-upload-api.service.ts` | HTTP service for upload |
| `apps/opticv-web/src/app/features/upload-cv/services/cv-upload-api.service.spec.ts` | Unit tests for `CvUploadApiService` |
| `apps/opticv-web/src/app/shared/utils.ts` | `formatFileSize` utility |
| `apps/opticv-web/src/app/shared/utils.spec.ts` | Unit tests for `formatFileSize` |

### Modified

| File | Change |
|------|--------|
| `apps/opticv-be/src/app/app.module.ts` | Added `CvModule` to imports |
| `apps/opticv-be/config/validation.ts` | Added Joi rules for 5 R2 env vars |
| `apps/opticv-be/config/env/development.env` | Added R2 env var keys and values |
| `apps/opticv-be/config/env/production.env` | Added R2 env var keys |
| `apps/opticv-web/src/app/app.routes.ts` | Added lazy `upload-cv` route with `authGuard` |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added `CvDocument` and `UploadCvResponse` types |

---

## Components

| Component | Plan | Status |
|-----------|------|--------|
| `UploadCv` (page) | `apps/opticv-web/src/app/features/upload-cv/upload-cv.ts` | Exist |
| `CvDropzone` (organism) | `apps/opticv-web/src/app/features/upload-cv/components/cv-dropzone/cv-dropzone.ts` | Exist |

---

## Stores

No NgRx Signal Store was planned for this task. Local signals used instead.

| Store | Plan | Status |
|-------|------|--------|
| — | None planned | N/A |

---

## Deviations from Plan

| # | Deviation |
|---|-----------|
| 1 | Plan specified `dto/upload-cv-response.dto.ts` as a separate file; no such DTO file was created. The `UploadCvResponse` type from `@opticv/datatypes` is used directly as the return type in `CvService` and `CvController`. |
| 2 | Plan named the frontend service `cv-upload.service.ts`; the file was created as `cv-upload-api.service.ts` (class name `CvUploadApiService`). |
| 3 | `R2Service` constructor uses `R2_PUBLIC_URL` as the S3 client `endpoint` (not `R2_ACCOUNT_ID` to build the endpoint as described in plan step 4.3). The env var is used but its role differs from what the plan described. |
| 4 | Plan described `R2_PUBLIC_URL` as optional; Joi validation registers it as `required()`. |
| 5 | Plan edge case stated an orphan R2 object on DB failure is acceptable (no rollback). Implementation actually deletes the R2 object on DB failure (`r2.delete(storageKey)` called in the catch block). This is a more complete implementation than specified. |

---

## Additional Implementation

- `R2Service.delete()` method: not in the plan, added to support R2 cleanup on DB write failure.
- `formatFileSize()` shared utility (`apps/opticv-web/src/app/shared/utils.ts`): not in the plan, used by both `UploadCv` and `CvDropzone` for human-readable file size display.
- `viewChild.required<CvDropzone>()` in `UploadCv` page: used to imperatively reset `selectedFile` on the dropzone after upload success/failure. Not explicitly specified in the plan.
- Unit tests were added for all new files (backend: `cv.controller.spec.ts`, `cv.service.spec.ts`, `r2.service.spec.ts`; frontend: `upload-cv.spec.ts`, `cv-dropzone.spec.ts`, `cv-upload-api.service.spec.ts`, `utils.spec.ts`). Test files were not listed in the implementation plan.
