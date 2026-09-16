# Implementation Plan — Task 7-file-upload

## Backend Plan

### Backend Implementation Plan — Task #7: CV File Upload

---

### Step 1 — Architecture Understanding

Key findings from reading the existing code:

- **`SupabaseGuard`** validates the Bearer JWT via `supabase.auth.getUser()`, then calls `usersService.upsertUser()` and attaches the full `UserModel` (with internal DB `id`) to `request['user']`. The controller receives the internal DB `id` directly — no secondary lookup is needed.
- **`UsersModule`** pattern: imports `PrismaModule`, provides service and controller, exports the service. `CvModule` follows the same shape.
- **`AuthModule`** exports `SupabaseGuard` — `CvModule` must import `AuthModule` to use the guard.
- **`ConfigModule`** is global — `ConfigService` can be injected anywhere without re-importing `ConfigModule`.
- **`CvDocument` schema** is already complete. No migration needed. `fileSize` is `Int` (bytes). All required fields are present.
- **Env validation** uses Joi in `config/validation.ts`. New R2 vars must be added there.

---

### Step 2 — API Contract

| Method | Route | Request | Response | Auth |
|--------|-------|---------|----------|------|
| POST | `/api/cv/upload` | `multipart/form-data`, field `file` (binary) | `201 Created` — `UploadCvResponse` JSON | `SupabaseGuard` (Bearer JWT) |

**Success response body (201):**
```
{ id, fileName, fileSize, mimeType, storageKey, createdAt }
```

**Error response body (400 / 500):**
```
{ statusCode, message }
```

---

### Step 3 — Database Changes

No Prisma schema migration required. `CvDocument` model is fully defined with all needed fields. No `prisma migrate dev` step needed.

---

### Step 4 — Domain Logic

#### 4.1 — File Validation (backend)

**Where:** `CvService.uploadCv()` — executed before any R2 or DB call.

**Rules:**
- Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Maximum file size: 5 242 880 bytes (5 MB)

**Errors:**
- Invalid MIME type → `BadRequestException('Only PDF and DOCX files are accepted.')`
- File exceeds size limit → `BadRequestException('File must be smaller than 5 MB.')`
- `file` field missing → `BadRequestException('No file provided.')`

Note: Multer's `LIMIT_FILE_SIZE` error produces a `PayloadTooLargeException` (413), not the required 400. To produce consistent 400 errors, set multer `limits.fileSize` on the interceptor to `undefined` (or omit), and do all size validation inside `CvService` after the file is buffered.

#### 4.2 — Storage Key Generation

**Where:** `CvService.uploadCv()`

- Extension derived from MIME type: `application/pdf` → `.pdf`; DOCX MIME → `.docx`
- Key pattern: `uploads/{userId}/{crypto.randomUUID()}.{ext}`
- Uses Node's built-in `crypto.randomUUID()` — no extra dependency needed

#### 4.3 — R2 Upload

**Where:** `R2Service` (dedicated service injected into `CvService`)

- `@aws-sdk/client-s3` — `S3Client` with `PutObjectCommand`
- Endpoint: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
- Region: `auto`
- Credentials from `ConfigService` (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
- Body: file buffer, with `ContentType` and `ContentLength`
- On SDK error → `InternalServerErrorException('File storage failed.')`

#### 4.4 — Database Write

**Where:** `CvService.uploadCv()` — after successful R2 upload

| Field | Value |
|-------|-------|
| `userId` | `request.user.id` (internal DB UUID from guard) |
| `fileName` | `file.originalname` |
| `fileSize` | `file.size` (bytes) |
| `mimeType` | `file.mimetype` |
| `storageKey` | generated R2 key |
| `parsedText` | `null` |
| `isActive` | `true` |

On Prisma error → `InternalServerErrorException('Failed to save file record.')`. Orphan R2 object acceptable per spec.

Return: `CvDocument` projected to `UploadCvResponse` shape.

---

### Step 5 — Authentication & Authorization

- `POST /api/cv/upload` decorated with `@UseGuards(SupabaseGuard)` at controller level.
- `SupabaseGuard` validates JWT and attaches full `UserModel` to `request['user']`.
- Controller uses a `@CurrentUser()` param decorator to extract and type the user.
- No valid Bearer token → guard throws `401 UnauthorizedException`.

---

### Step 6 — Backend Files

| File path | Action | Purpose |
|-----------|--------|---------|
| `apps/opticv-be/src/app/cv/cv.module.ts` | create | Feature module; imports `AuthModule`, `PrismaModule`; provides `CvController`, `CvService`, `R2Service` |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | create | `POST /cv/upload`; `SupabaseGuard`, `FileInterceptor('file')`, `memoryStorage()`; delegates to `CvService` |
| `apps/opticv-be/src/app/cv/cv.service.ts` | create | Validates file, generates storage key, calls `R2Service`, writes `CvDocument` via Prisma, returns DTO |
| `apps/opticv-be/src/app/cv/r2.service.ts` | create | Initialises `S3Client` with R2 credentials; exposes `upload(key, buffer, mimeType)` |
| `apps/opticv-be/src/app/cv/dto/upload-cv-response.dto.ts` | create | Plain TS class representing the 201 response shape matching `UploadCvResponse` |
| `apps/opticv-be/src/app/cv/decorators/current-user.decorator.ts` | create | `@CurrentUser()` param decorator extracting `request['user']` typed as `UserModel` |
| `apps/opticv-be/src/app/app.module.ts` | modify | Add `CvModule` to `imports` |
| `apps/opticv-be/config/validation.ts` | modify | Add Joi rules for `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` |
| `apps/opticv-be/config/env/development.env` | modify | Add R2 env var keys (values filled in by dev) |
| `apps/opticv-be/config/env/production.env` | modify | Add R2 env var keys (values filled in by ops) |
| `packages/shared/datatypes/src/lib/datatypes.ts` | modify | Add `CvDocument` and `UploadCvResponse` types |

**New dependency to install first:**
```
npm install @aws-sdk/client-s3
```
Verify `@types/multer` is already in `devDependencies`; add if missing.

---

### Backend Risks

1. **`@types/multer` availability** — `Express.Multer.File` type required. Must verify before implementing.
2. **Multer size error shape** — `LIMIT_FILE_SIZE` produces 413, not 400. Resolve by omitting multer `limits.fileSize` and validating in the service.
3. **R2 credentials not yet provisioned** — endpoint will fail at runtime until credentials are configured.
4. **`file.buffer` in memory** — `memoryStorage()` holds the entire file in heap. Acceptable for 5 MB at current scale.
5. **`UserModel` import path** — Verify exact export name in the generated Prisma client before implementing.

---

## Frontend Plan

### Frontend Implementation Plan — Task #7: CV File Upload

---

### Step 2 — Expected API Contract

| Method | Route | Request shape | Response shape | Used by |
|--------|-------|---------------|----------------|---------|
| POST | `/api/cv/upload` | `multipart/form-data` — field `file` (binary) | `UploadCvResponse` — `{ id, fileName, fileSize, mimeType, storageKey, createdAt }` | `CvUploadService.uploadCv()` |

`Authorization: Bearer <token>` attached automatically by existing `authInterceptor`.

---

### Step 3 — Routing

| Path | Page component | Auth guard |
|------|---------------|------------|
| `upload-cv` | `UploadCv` (`features/upload-cv/upload-cv.ts`) | `authGuard` |

Add a new lazy-loaded entry in `app.routes.ts` before the wildcard route.

---

### Step 4 — Components

| Component | Type | File path | Props / State |
|-----------|------|-----------|---------------|
| `UploadCv` | page | `apps/opticv-web/src/app/features/upload-cv/upload-cv.ts` | Local signals: `uploadedFile` (`UploadCvResponse \| null`), `isLoading` (`boolean`); injects `CvUploadService`, `MessageService` |
| `CvDropzone` | organism | `apps/opticv-web/src/app/features/upload-cv/components/cv-dropzone/cv-dropzone.ts` | `input<boolean>()`: `isLoading`; `output()`: `fileSelected`; local signals: `selectedFile`, `validationError`, `isDragOver` |

#### `UploadCv` (page)
- Shows `CvDropzone` when `uploadedFile()` is `null`; shows uploaded-file card otherwise.
- Uploaded-file card: file name, formatted size, upload date (from `createdAt`), "Upload another" link.
- Handles `fileSelected` output: calls `CvUploadService.uploadCv()`, sets `isLoading`, shows PrimeNG toast on success/error, sets `uploadedFile` on success.
- Imports: `CvDropzone`, `ToastModule`, `ButtonModule` from PrimeNG.
- `ChangeDetectionStrategy.OnPush`.
- Template: external `.html` file.

#### `CvDropzone` (organism)
- Renders drop zone, file-picker button, helper text, validation error, file preview strip, "Upload CV" button.
- Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- Max size: `5 * 1024 * 1024` bytes.
- Client-side validation on file selection/drop; sets `validationError` signal.
- Multiple files dropped: accept first only, show info message "Only one file can be uploaded at a time."
- Drag events handled via `host` object in `@Component` decorator (not `@HostListener`).
- File input reset after remove: use conditional `@if` on `selectedFile()` to destroy/recreate `<input type="file">`.
- Accessible: `role="region"` on drop zone, `aria-label` on input and remove button.
- `ChangeDetectionStrategy.OnPush`.
- Template: external `.html` file.

---

### Step 5 — Services

| Service / method | File path | HTTP call | Dependencies |
|-----------------|-----------|-----------|--------------|
| `CvUploadService.uploadCv(file: File)` | `apps/opticv-web/src/app/features/upload-cv/services/cv-upload.service.ts` | `POST /api/cv/upload` via `HttpClient.post<UploadCvResponse>()` with `FormData` | `HttpClient` (injected via `inject()`), `UploadCvResponse` from `@opticv/datatypes` |

- `providedIn: 'root'`.
- Returns `Observable<UploadCvResponse>`.

---

### Step 6 — State Management

Local state only — no NgRx Signal Store needed.

| State | Location | Mechanism |
|-------|----------|-----------|
| `selectedFile` | `CvDropzone` | `signal<File \| null>(null)` |
| `validationError` | `CvDropzone` | `signal<string \| null>(null)` |
| `isDragOver` | `CvDropzone` | `signal<boolean>(false)` |
| `isLoading` | `UploadCv` page (passed to `CvDropzone` as `input()`) | `signal<boolean>(false)` |
| `uploadedFile` | `UploadCv` page | `signal<UploadCvResponse \| null>(null)` |

---

### Step 7 — Frontend Files

| File path | Action | Purpose |
|-----------|--------|---------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | modify | Add `CvDocument` and `UploadCvResponse` types |
| `apps/opticv-web/src/app/app.routes.ts` | modify | Register `upload-cv` lazy route with `authGuard` |
| `apps/opticv-web/src/app/features/upload-cv/upload-cv.ts` | create | Page component — orchestrates upload flow, shows success card |
| `apps/opticv-web/src/app/features/upload-cv/upload-cv.html` | create | Template for page component |
| `apps/opticv-web/src/app/features/upload-cv/components/cv-dropzone/cv-dropzone.ts` | create | Drag-and-drop organism component |
| `apps/opticv-web/src/app/features/upload-cv/components/cv-dropzone/cv-dropzone.html` | create | Template for dropzone component |
| `apps/opticv-web/src/app/features/upload-cv/services/cv-upload.service.ts` | create | HTTP service — `POST /api/cv/upload` |

No changes needed to `app.config.ts` — `MessageService` already provided globally.

---

### Frontend Risks

1. **SSR + drag-and-drop**: Drag events and `File` API are browser-only. Guard with `isPlatformBrowser(PLATFORM_ID)` in `CvDropzone` before accessing browser APIs, despite the route being auth-guarded.
2. **`@opticv/datatypes` rebuild required**: After adding new types, run `npm exec nx build datatypes` locally before running the frontend.
3. **PrimeNG `ToastModule` placement**: `<p-toast>` added to `UploadCv` page template. Ensure no duplicate instances in parent layouts.
4. **File input reset**: Resetting the native `<input type="file">` value requires destroying and recreating the element; use `@if` on `selectedFile()` to achieve this without `ViewChild`.

---

## API Contract

| Method | Route | Request | Response DTO | Auth |
|--------|-------|---------|--------------|------|
| POST | `/api/cv/upload` | `multipart/form-data`, field `file` (binary) | `UploadCvResponse` — `{ id, fileName, fileSize, mimeType, storageKey, createdAt }` | Bearer JWT (`SupabaseGuard`) |

---

## Integration Check

No integration gaps.

| Frontend expects | Backend provides | Gap |
|-----------------|-----------------|-----|
| `POST /api/cv/upload` — field `file` | `FileInterceptor('file')` on `POST /cv/upload` | None |
| Response: `{ id, fileName, fileSize, mimeType, storageKey, createdAt }` | `UploadCvResponseDto` with same fields | None |
| Auth via global `authInterceptor` Bearer header | `SupabaseGuard` validates Bearer JWT | None |
| HTTP 201 success / 400 / 500 errors | `@HttpCode(201)`, `BadRequestException`, `InternalServerErrorException` | None |
| `UploadCvResponse` type from `@opticv/datatypes` | Same type from `@opticv/datatypes` | None |

---

## Unified Implementation Order

1. **Install dependencies** — `npm install @aws-sdk/client-s3`; verify `@types/multer` in devDependencies
2. **Shared types** — add `CvDocument` and `UploadCvResponse` to `packages/shared/datatypes/src/lib/datatypes.ts`; build datatypes library (`npm exec nx build datatypes`)
3. **Backend: env config** — add R2 env vars to `development.env` / `production.env`; update Joi validation in `config/validation.ts`
4. **Backend: R2Service** — create `r2.service.ts` (S3Client wrapper)
5. **Backend: CvService** — create `cv.service.ts` (validation, key generation, R2 upload, DB write)
6. **Backend: CurrentUser decorator** — create `decorators/current-user.decorator.ts`
7. **Backend: UploadCvResponse DTO** — create `dto/upload-cv-response.dto.ts`
8. **Backend: CvController** — create `cv.controller.ts` (`POST /cv/upload`, guards, interceptor)
9. **Backend: CvModule** — create `cv.module.ts`; register in `app.module.ts`
10. **Frontend: route registration** — add `upload-cv` route to `app.routes.ts`
11. **Frontend: CvUploadService** — create `cv-upload.service.ts`
12. **Frontend: CvDropzone component** — create component + template
13. **Frontend: UploadCv page** — create page component + template
14. **End-to-end verification** — run both servers, upload a valid PDF, verify R2 storage and DB record; test error cases (wrong type, oversized file, no auth)
