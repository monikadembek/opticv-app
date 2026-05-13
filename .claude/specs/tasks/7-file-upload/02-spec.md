# Task Specification

## Source

Task #7 — Implement CV file upload

## Goal

Allow authenticated users to upload a PDF or DOCX CV file from a dedicated upload page. The file is stored in Cloudflare R2. File metadata is persisted in the `CvDocument` table. Multiple uploads are allowed; all versions are kept (history preserved).

## Context

This is a new feature in the OptiCV app. After login, users land on the home page. A dedicated `/upload-cv` route will be added where users can upload their CV. This is the entry point to the core app workflow (CV → AI optimization).

The `CvDocument` Prisma model already exists and has all required fields (`fileName`, `fileSize`, `mimeType`, `storageKey`, `parsedText`, `isActive`, `userId`).

No file upload infrastructure exists yet on the backend (no multer, no R2 client, no upload controller).

## Scope

### In scope

- Dedicated `/upload-cv` Angular route, lazy-loaded, protected by `authGuard`
- Frontend upload UI: drag-and-drop zone + file-picker button (PDF/DOCX only, max 5 MB)
- Client-side validation: file type, file size
- Frontend service to POST the file to the backend
- NestJS `POST /api/cv/upload` endpoint (multipart/form-data), protected by `SupabaseGuard`
- Cloudflare R2 integration on the backend: upload file, get public/signed URL
- `CvDocument` DB record creation (fileName, fileSize, mimeType, storageKey, userId)
- Success state on upload page (toast message + display of uploaded file info)
- Error handling: wrong file type, file too large, network/server error

### Out of scope

- CV text parsing / extraction (`parsedText` field left null for now)
- AI optimization trigger after upload
- Replacing previous CV (all uploads are kept; `isActive` management deferred)
- File download or preview from history
- Subscription tier / upload limits
- Backend JWT validation beyond what `SupabaseGuard` already provides

## Behavior

### Frontend

1. User navigates to `/upload-cv` (protected by `authGuard`; redirects to `/login` if unauthenticated).
2. Page renders an upload area with:
   - A drag-and-drop zone labeled "Drag & drop your CV here" with an icon
   - A "Browse files" button inside the zone that opens the OS file picker
   - Helper text: "Accepted formats: PDF, DOCX · Max size: 5 MB"
3. User selects or drops a file.
4. **Client-side validation (before upload):**
   - If MIME type is not `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`: show inline error "Only PDF and DOCX files are accepted."
   - If file size > 5 MB: show inline error "File must be smaller than 5 MB."
5. If validation passes, show a preview strip with: file icon, file name, file size (formatted), and a remove button (×) to deselect.
6. User clicks "Upload CV" button.
7. Button enters loading state (disabled, spinner).
8. File is sent to `POST /api/cv/upload` as `multipart/form-data`.
9. On success (201):
   - Show a PrimeNG success toast: "CV uploaded successfully."
   - Replace the upload zone with an uploaded-file card: file name, size, upload date.
   - "Upload another" link resets the component back to the empty upload zone.
10. On error:
    - Show a PrimeNG error toast with the message from the API response, or a generic "Upload failed. Please try again."
    - Re-enable the upload button.

### Backend

1. `POST /api/cv/upload` receives `multipart/form-data` with a single field `file`.
2. `SupabaseGuard` validates the Bearer token; attaches the user (with internal DB `id`) to the request.
3. File validation on backend:
   - MIME type must be `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - File size must be ≤ 5 242 880 bytes (5 MB)
   - If invalid: return `400 Bad Request` with descriptive message.
4. Generate a unique storage key: `uploads/{userId}/{uuid}.{ext}` (uuid v4, ext derived from MIME type).
5. Upload file buffer to Cloudflare R2 using the AWS S3-compatible SDK (`@aws-sdk/client-s3`).
6. On R2 success, insert a `CvDocument` record:
   ```
   userId       — internal DB user id from guard
   fileName     — original file name from upload
   fileSize     — file size in bytes
   mimeType     — file MIME type
   storageKey   — the R2 object key (uploads/{userId}/{uuid}.ext)
   parsedText   — null (not yet implemented)
   isActive     — true
   ```
7. Return `201 Created` with the created `CvDocument` record (id, fileName, fileSize, mimeType, storageKey, createdAt).
8. On any R2 or DB error: return `500 Internal Server Error`.

## Edge Cases

- User drops multiple files into the zone: only the first file is accepted; show info "Only one file can be uploaded at a time."
- User drops a valid file, then removes it (×), then drops another: state resets cleanly.
- Upload request fails mid-transfer (network): show error toast, re-enable button.
- R2 upload succeeds but DB insert fails: the orphan R2 object is acceptable for now (no rollback required in this task).
- File name contains special characters / spaces: preserve original name in `fileName` field; the R2 key uses only the UUID so no path issues.

## Data / API

### Endpoint

```
POST /api/cv/upload
Content-Type: multipart/form-data
Authorization: Bearer <supabase-jwt>

Form field: file  (binary)
```

**Success response — 201 Created:**
```json
{
  "id": "uuid",
  "fileName": "my-cv.pdf",
  "fileSize": 204800,
  "mimeType": "application/pdf",
  "storageKey": "uploads/user-uuid/random-uuid.pdf",
  "createdAt": "2026-05-13T10:00:00.000Z"
}
```

**Error response — 400 / 500:**
```json
{
  "statusCode": 400,
  "message": "Only PDF and DOCX files are accepted."
}
```

### Shared types (`@opticv/datatypes`)

Add:
```typescript
export type CvDocument = {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  parsedText: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type UploadCvResponse = Pick<CvDocument, 'id' | 'fileName' | 'fileSize' | 'mimeType' | 'storageKey' | 'createdAt'>;
```

### DB changes

No schema migration needed — `CvDocument` model already exists in `schema.prisma`.

### New backend files

| File | Purpose |
|------|---------|
| `apps/opticv-be/src/app/cv/cv.module.ts` | NestJS feature module |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | `POST /cv/upload` endpoint |
| `apps/opticv-be/src/app/cv/cv.service.ts` | Upload logic, R2 client, DB write |
| `apps/opticv-be/src/app/cv/dto/upload-cv-response.dto.ts` | Response DTO |

### New frontend files

| File | Purpose |
|------|---------|
| `apps/opticv-web/src/app/features/upload-cv/upload-cv.ts` | Page component (route entry point) |
| `apps/opticv-web/src/app/features/upload-cv/components/cv-dropzone/cv-dropzone.ts` | Drag-and-drop upload zone component |
| `apps/opticv-web/src/app/features/upload-cv/services/cv-upload.service.ts` | HTTP service for `POST /api/cv/upload` |

### Environment / config

Backend needs three new env vars (added to `development.env` and `production.env`):

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=   # optional: base URL for public access, if bucket is public
```

These must be added to the Joi validation schema in `config/validation.ts`.

## Acceptance (DEV)

- Build passes (`npm exec nx run-many -t build`)
- `POST /api/cv/upload` with valid PDF returns 201 and a `CvDocument` record in DB
- `POST /api/cv/upload` with invalid type returns 400
- `POST /api/cv/upload` without auth returns 401
- File appears in Cloudflare R2 bucket under `uploads/{userId}/{uuid}.ext`
- Frontend: selecting an invalid file type shows inline error without sending request
- Frontend: selecting a file > 5 MB shows inline error without sending request
- Frontend: successful upload shows success toast and uploaded-file card
- Frontend: failed upload shows error toast and re-enables button
- No TypeScript errors (`npm exec nx run-many -t typecheck`)
- No lint errors (`npm exec nx run-many -t lint`)
