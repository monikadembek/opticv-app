# Implementation Plan — Task 9-cv-file-parsing

---

## Backend Plan

### 1. Entities & Business Rules

**Entities involved:** `CvDocument` (Prisma model), shared `CvDocumentListItem` and `UploadCvResponse` types.

**Business rules:**
- Parsing is synchronous — the upload endpoint awaits the parse result before returning a response.
- Parse success → `parsedText` set, `parseStatus = COMPLETED` returned in response.
- Parse failure (exception thrown by library, unsupported MIME type, or empty/null result) → throw HTTP 422 Unprocessable Entity with a descriptive message; the DB record is deleted (or not committed) so no orphaned records remain.
- An empty string from DOCX (`mammoth` returning no text) is valid — `COMPLETED` with `parsedText: ''`.
- No retry mechanism, no job queue.

**External integrations:** `pdf-parse` (PDF text extraction), `mammoth` (DOCX text extraction) — both operate on a `Buffer` already in memory (multer `memoryStorage`).

---

### 2. API Contract

No new endpoints. Two existing endpoints gain a new field in their response shape.

| Method | Route | Request DTO | Response DTO | Auth required | Change |
|--------|-------|-------------|--------------|---------------|--------|
| `POST` | `/api/cv/upload` | `multipart/form-data` (unchanged) | `UploadCvResponse` | Yes (SupabaseGuard) | Adds `parseStatus: 'COMPLETED'` (parse runs synchronously; returns 422 on failure) |
| `GET` | `/api/cv` | — (unchanged) | `CvDocumentListItem[]` | Yes (SupabaseGuard) | Adds `parseStatus` per item |
| `GET` | `/api/cv/:id/download-url` | — | `{ url: string }` | Yes | No change |
| `DELETE` | `/api/cv/:id` | — | `204` | Yes | No change |

---

### 3. Database Changes

**Schema change — `apps/opticv-be/prisma/schema.prisma`:**

Add enum and field:

```prisma
enum ParseStatus {
  PENDING
  COMPLETED
  FAILED
}

model CvDocument {
  // existing fields …
  parseStatus  ParseStatus  @default(PENDING)
}
```

**Migration command:**
```bash
npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma --name add_parse_status_to_cv_documents
```

Generated migration creates the PostgreSQL enum type and adds `parse_status` column with default `'PENDING'`. All existing rows receive `PENDING` automatically.

**Client regeneration:**
```bash
npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma
```

---

### 4. Domain Logic

#### `CvParserService` — new file

Location: `apps/opticv-be/src/app/cv/cv-parser.service.ts`

- `parse(buffer: Buffer, mimeType: string): Promise<string>`
  - `'application/pdf'` → call `pdf-parse(buffer)`, return `result.text`
  - `'application/vnd.openxmlformats-officedocument.wordprocessingml.document'` → call `mammoth.extractRawText({ buffer })`, return `result.value`
  - Any other MIME type → throw `UnsupportedMimeTypeError` (defined in the same file)
  - Library exceptions propagate — the caller (`CvService`) catches them
- `UnsupportedMimeTypeError extends Error` — lightweight class defined in the same file

#### `CvService` changes

**`uploadCv` method:**
1. Upload file to R2 and create DB record with `parseStatus: 'PENDING'` as initial state.
2. `await this.cvParser.parse(file.buffer, file.mimetype)`:
   - On success: `prisma.cvDocument.update({ parsedText: text, parseStatus: 'COMPLETED' })`, then build and return `UploadCvResponse` with `parseStatus: 'COMPLETED'`.
   - On parse failure (catch): delete the DB record and the R2 object, then throw `UnprocessableEntityException` with a descriptive message so the client receives HTTP 422.

**`getUserCvs` method:**
- Add `parseStatus: true` to the `select` object in `prisma.cvDocument.findMany`.

#### Error handling matrix

| Scenario | Result |
|---|---|
| `pdf-parse` throws (corrupted/protected PDF) | Caught → DB record + R2 object deleted → HTTP 422 returned to client |
| `mammoth` returns empty string | Not an error → `parseStatus: COMPLETED`, `parsedText: ''` |
| Unsupported MIME type | `UnsupportedMimeTypeError` thrown → caught → DB record + R2 object deleted → HTTP 422 |
| DB update after parse succeeds fails | Log error; rethrow as HTTP 500 |
| Cleanup (delete) after parse failure fails | Log error; still return HTTP 422 to client |

---

### 5. Authentication & Authorization

No changes. All endpoints are already protected by `SupabaseGuard` at the controller level. `CvParserService` has no auth concerns.

---

### 6. Backend Files

| File path | Action | Purpose |
|-----------|--------|---------|
| `apps/opticv-be/prisma/schema.prisma` | Modify | Add `ParseStatus` enum; add `parseStatus` field to `CvDocument` |
| `apps/opticv-be/prisma/migrations/<timestamp>_.../migration.sql` | Auto-generated | Prisma migration — CREATE TYPE + ALTER TABLE |
| `apps/opticv-be/src/app/cv/cv-parser.service.ts` | Create | `CvParserService.parse()` + `UnsupportedMimeTypeError` |
| `apps/opticv-be/src/app/cv/cv-parser.service.spec.ts` | Create | Unit tests: PDF success, DOCX success, unsupported MIME, empty DOCX |
| `apps/opticv-be/src/app/cv/cv.service.ts` | Modify | Inject `CvParserService`; update `uploadCv` (create record, await parse, update DB with result or clean up on failure); update `getUserCvs` select |
| `apps/opticv-be/src/app/cv/cv.module.ts` | Modify | Add `CvParserService` to `providers` array |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Modify | Add `ParseStatus` type; add `parseStatus` to `UploadCvResponse` and `CvDocumentListItem` |

#### Dependencies to install (before code changes)

```bash
npm install pdf-parse mammoth
npm install --save-dev @types/pdf-parse @types/mammoth
```

---

### 7. Unit Test Plan — `cv-parser.service.spec.ts`

Four test cases (plain instantiation, no NestJS test module needed):

1. **PDF success** — mock `pdf-parse` to resolve `{ text: 'hello pdf' }`; assert resolves to `'hello pdf'`
2. **DOCX success** — mock `mammoth.extractRawText` to resolve `{ value: 'hello docx' }`; assert resolves to `'hello docx'`
3. **Empty DOCX** — mock `mammoth.extractRawText` to resolve `{ value: '' }`; assert resolves to `''` (not an error)
4. **Unsupported MIME type** — call `parse(buffer, 'image/png')`; assert rejects with `UnsupportedMimeTypeError`

---

## Frontend Plan

### 1. Understanding the Spec (Frontend)

The backend adds `parseStatus: 'PENDING' | 'COMPLETED' | 'FAILED'` to `CvDocumentListItem` and `UploadCvResponse`. The frontend surfaces this status per CV row in the existing dashboard list. No new routes, no polling — status shown at page load and after upload triggers a list refresh.

---

### 2. Expected API Contract (Frontend)

| Method | Endpoint | Type change | Used by |
|--------|----------|-------------|---------|
| `GET` | `/api/cv` | Response items gain `parseStatus` | `CvApiService.getUserCvs()` → Dashboard |
| `POST` | `/api/cv/upload` | Response gains `parseStatus: 'PENDING'` | `CvUploadApiService.uploadCv()` → UploadCv page |

No new API calls. No HTTP-level changes in the service classes — type propagation handles it.

---

### 3. Routing

No route changes.

---

### 4. Components

| Component | Action | File path | Change |
|-----------|--------|-----------|--------|
| `CvFileListItem` | Modify | `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.ts` | Import `TooltipModule` if using `pTooltip` |
| `CvFileListItem` template | Modify | `...cv-file-list-item/cv-file-list-item.html` | Add `@switch (file().parseStatus)` block with icon + accessible label per status |
| `UploadCv` template | Modify | `apps/opticv-web/src/app/features/upload-cv/upload-cv.html` | Show parse outcome in post-upload confirmation (success or error message from API) |
| `CvFileList` | No change | `...cv-file-list/cv-file-list.ts` | Pure passthrough — type update propagates automatically |
| `Dashboard` | No change | `...dashboard/dashboard.ts` | Already calls `loadFiles()`; type update propagates |

**Status display mapping for `CvFileListItem`:**
- `PENDING` — `pi pi-spin pi-spinner` icon, `text-surface-400`, accessible label "Parsing…"
- `COMPLETED` — `pi pi-check-circle` icon, `text-green-500`, accessible label "Parsed"
- `FAILED` — `pi pi-exclamation-triangle` icon, `text-orange-500`, accessible label "Parsing failed"

All status indicators must include either visible text or `aria-label` to meet WCAG AA.

---

### 5. Services / Data Fetching

| Service | Action | Change |
|---------|--------|--------|
| `CvApiService` | No change | `getUserCvs()` returns `Observable<CvDocumentListItem[]>` — type update propagates automatically |
| `CvUploadApiService` | No change | `uploadCv()` returns `Observable<UploadCvResponse>` — type update propagates |

---

### 6. State Management

`parseStatus` is display-only, carried within each list item. No new NgRx Signal Store state needed.

- `cvFiles = signal<CvDocumentListItem[]>([])` in Dashboard — each item carries `parseStatus` from the API
- `uploadedFile = signal<UploadCvResponse | null>(null)` in UploadCv — `parseStatus` will be `'COMPLETED'` on success; on parse failure the API returns HTTP 422, which the component's error handler should surface to the user

---

### 7. Frontend Files

| File path | Action | Purpose |
|-----------|--------|---------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Modify | Add `ParseStatus` type; add `parseStatus` to `CvDocumentListItem` and `UploadCvResponse` |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.ts` | Modify | Import `TooltipModule` (if pTooltip used) |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.html` | Modify | Add `@switch` block for parse status icon + label |
| `apps/opticv-web/src/app/features/upload-cv/upload-cv.html` | Modify | Add "Parsing in progress…" note in post-upload confirmation |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.spec.ts` | Modify | Add `parseStatus` to mock fixture; add 3 status rendering test cases |
| `apps/opticv-web/src/app/features/dashboard/services/cv-api.service.spec.ts` | Modify | Add `parseStatus` to mock fixture |
| `apps/opticv-web/src/app/features/dashboard/dashboard.spec.ts` | Modify | Add `parseStatus` to mock fixture |
| `apps/opticv-web/src/app/features/upload-cv/services/cv-upload-api.service.spec.ts` | Modify | Add `parseStatus` to mock response fixture |

---

## API Contract (Unified)

| Method | Route | Auth | Request | Response | Change |
|--------|-------|------|---------|----------|--------|
| `POST` | `/api/cv/upload` | Yes | `multipart/form-data` (file) | `UploadCvResponse` (200) or `422` on parse failure | + `parseStatus: 'COMPLETED'`; parse is synchronous |
| `GET` | `/api/cv` | Yes | — | `CvDocumentListItem[]` | + `parseStatus` per item |
| `GET` | `/api/cv/:id/download-url` | Yes | — | `{ url: string }` | No change |
| `DELETE` | `/api/cv/:id` | Yes | — | `204` | No change |

**Shared type `ParseStatus`:** `'PENDING' | 'COMPLETED' | 'FAILED'` — string literal union in `@opticv/datatypes`; mirrors the Prisma `ParseStatus` enum on the backend.

---

## Integration Check

| Frontend expects | Backend provides | Gap |
|-----------------|-----------------|-----|
| `GET /api/cv` returns `parseStatus` on each item | `getUserCvs` select gains `parseStatus: true` | None |
| `POST /api/cv/upload` returns `parseStatus: 'COMPLETED'` on success | `uploadCv` awaits parse, updates DB, returns `COMPLETED` | None |
| `POST /api/cv/upload` returns HTTP 422 on parse failure | `uploadCv` catches parse error, cleans up, throws `UnprocessableEntityException` | None |
| `parseStatus` as string literal union `'PENDING' \| 'COMPLETED' \| 'FAILED'` | Shared type defined as string literal union; Prisma enum used internally | None |
| `parsedText` remains in `CvDocumentListItem` | Already in select; not removed | None |

**No integration gaps.**

---

## Unified Implementation Order

1. **Install dependencies** — `npm install pdf-parse mammoth` + dev types
2. **DB migration** — add `ParseStatus` enum and `parseStatus` column to `cv_documents`; run `prisma migrate dev`; regenerate Prisma client
3. **Shared types** — add `ParseStatus` + `parseStatus` field to `CvDocumentListItem` and `UploadCvResponse` in `packages/shared/datatypes/src/lib/datatypes.ts`; rebuild datatypes package
4. **`CvParserService`** — create `cv-parser.service.ts` with `parse()` method and `UnsupportedMimeTypeError`
5. **`CvParserService` unit tests** — create `cv-parser.service.spec.ts` (4 test cases)
6. **`CvService`** — inject `CvParserService`; update `uploadCv` (add `parseStatus` to create, fire background parse, return updated response); update `getUserCvs` select
7. **`CvModule`** — add `CvParserService` to providers
8. **Backend typecheck + tests** — `npm exec nx typecheck opticv-be` + `npm exec nx test opticv-be`
9. **Frontend: `CvFileListItem`** — add `@switch (file().parseStatus)` block in template; update `.ts` if `TooltipModule` needed
10. **Frontend: `UploadCv`** — add "Parsing in progress…" note in post-upload confirmation template
11. **Frontend test fixtures** — update `parseStatus` in all 4 spec files
12. **Frontend typecheck + tests** — `npm exec nx typecheck opticv-web` + `npm exec nx test opticv-web`
13. **End-to-end smoke test** — upload a PDF → verify list shows PENDING then COMPLETED after reload; upload password-protected PDF → verify FAILED state

---

## Risks (Combined)

| Risk | Severity | Notes |
|------|----------|-------|
| `pdf-parse` CJS/ESM interop with Webpack | Medium | Verify at build time early; may need `createRequire` workaround |
| `@types/mammoth` conflicts with bundled types | Low | Check after install; remove `@types` package if bundled types are sufficient |
| In-process parsing blocks event loop for large files | Medium | Accepted v1 trade-off; flag for future worker-thread migration |
| Orphaned DB records if cleanup after parse failure itself fails | Low | Log the cleanup error; record has no `parsedText` so it's inert — acceptable v1 trade-off |
| Nx build cache serving stale Prisma client after migration | Low | Run `npm exec nx reset` if typecheck errors reference missing `ParseStatus` |
| Shared type build order (`datatypes` must build before Angular) | Medium | Run `npm exec nx build datatypes` before serving web app in local dev |
| Existing mock fixtures break compilation | Low | 4 spec files need `parseStatus` added to fixtures in the same commit as the type change |
| Longer upload response time (parse blocks response) | Low | Accepted trade-off — user gets immediate, accurate feedback on parse outcome |
