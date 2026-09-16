# Implementation Plan — Task 8: Show User Files (Dashboard)

---

## Backend Plan

### Step 1 — Spec Summary

**Entities:** `CvDocument` (existing Prisma model, no schema changes needed)

**Business rules:**
- `GET /api/cv` — list all documents for the authenticated user, ordered by `createdAt` descending
- `GET /api/cv/:id/download` — return a pre-signed R2 URL; verify ownership before generating URL
- `DELETE /api/cv/:id` — verify ownership, delete R2 object first, then delete DB record

**Auth:** All three endpoints require `SupabaseGuard` (already applied at controller class level)

**External integrations:** R2 via `@aws-sdk/s3-request-presigner` (new dependency needed for `getSignedUrl`)

---

### Step 2 — API Contract (Backend)

| Method | Route | Request | Response DTO | Auth |
|--------|-------|---------|--------------|------|
| GET | `/api/cv` | — | `CvDocumentListItem[]` | `SupabaseGuard` |
| GET | `/api/cv/:id/download` | `id` param | `{ url: string }` | `SupabaseGuard` |
| DELETE | `/api/cv/:id` | `id` param | `204 No Content` | `SupabaseGuard` |

---

### Step 3 — Database Changes

**None.** The `CvDocument` model already has all required fields (`id`, `fileName`, `fileSize`, `mimeType`, `createdAt`, `parsedText`, `storageKey`, `userId`). No migration needed.

---

### Step 4 — Domain Logic

#### 4.1 — New shared type in `@opticv/datatypes`

Add `CvDocumentListItem` to `packages/shared/datatypes/src/lib/datatypes.ts`:

```ts
export type CvDocumentListItem = Pick<
  CvDocument,
  'id' | 'fileName' | 'fileSize' | 'mimeType' | 'createdAt' | 'parsedText'
>;
```

#### 4.2 — `R2Service.getPresignedUrl(key: string, ttlSeconds: number): Promise<string>`

- Add a new method to the existing `R2Service`
- Use `getSignedUrl` from `@aws-sdk/s3-request-presigner` with a `GetObjectCommand`
- TTL: 900 seconds (15 minutes) as per spec
- Throws `InternalServerErrorException` on failure (consistent with existing pattern)
- Requires installing `@aws-sdk/s3-request-presigner`

#### 4.3 — `CvService.getUserCvs(userId: string): Promise<CvDocumentListItem[]>`

- Queries `prisma.cvDocument.findMany` with `where: { userId }`, `orderBy: { createdAt: 'desc' }`
- Selects only the fields in `CvDocumentListItem` via `select: { id, fileName, fileSize, mimeType, createdAt, parsedText }`
- Returns `[]` when no records exist (Prisma returns empty array naturally)

#### 4.4 — `CvService.getDownloadUrl(id: string, userId: string): Promise<{ url: string }>`

- Fetches the document by `id` using `prisma.cvDocument.findUnique`
- Throws `NotFoundException` if document does not exist
- Throws `ForbiddenException` if `doc.userId !== userId`
- If `storageKey` is falsy, throws a descriptive `InternalServerErrorException`
- Calls `this.r2.getPresignedUrl(doc.storageKey, 900)` and returns `{ url }`

#### 4.5 — `CvService.deleteCv(id: string, userId: string): Promise<void>`

- Fetches the document by `id` using `prisma.cvDocument.findUnique`
- Throws `NotFoundException` if document does not exist
- Throws `ForbiddenException` if `doc.userId !== userId`
- Calls `this.r2.delete(doc.storageKey)` — if this throws, exception propagates and DB record is NOT deleted (satisfies "R2 first" rule)
- On R2 success, calls `prisma.cvDocument.delete({ where: { id } })`

#### 4.6 — Controller additions to `CvController`

- `GET /` → calls `cvService.getUserCvs(user.id)`, returns array (200 OK)
- `GET /:id/download` → calls `cvService.getDownloadUrl(id, user.id)`, returns `{ url }`
- `DELETE /:id` → calls `cvService.deleteCv(id, user.id)`, decorated with `@HttpCode(HttpStatus.NO_CONTENT)`, returns `void`

Existing `@UseGuards(SupabaseGuard)` on the class level covers all three new endpoints.

---

### Step 5 — Authentication & Authorization

| Endpoint | Guard | Ownership check |
|----------|-------|-----------------|
| `GET /api/cv` | `SupabaseGuard` (class-level) | Query scoped to `userId` |
| `GET /api/cv/:id/download` | `SupabaseGuard` (class-level) | Explicit `doc.userId !== userId` → `403` |
| `DELETE /api/cv/:id` | `SupabaseGuard` (class-level) | Explicit `doc.userId !== userId` → `403` |

All return `401` automatically when JWT is missing/invalid (handled by `SupabaseGuard`).

---

### Step 6 — Backend Files

| File path | Action | Purpose |
|-----------|--------|---------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | modify | Add `CvDocumentListItem` export |
| `apps/opticv-be/src/app/cv/r2.service.ts` | modify | Add `getPresignedUrl(key, ttl)` method using `@aws-sdk/s3-request-presigner` |
| `apps/opticv-be/src/app/cv/cv.service.ts` | modify | Add `getUserCvs`, `getDownloadUrl`, `deleteCv` methods |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | modify | Add `GET /`, `GET /:id/download`, `DELETE /:id` handlers |
| `apps/opticv-be/src/app/cv/r2.service.spec.ts` | modify | Add test for `getPresignedUrl` (success + failure) |
| `apps/opticv-be/src/app/cv/cv.service.spec.ts` | modify | Add tests for `getUserCvs`, `getDownloadUrl`, `deleteCv` |
| `apps/opticv-be/src/app/cv/cv.controller.spec.ts` | modify | Add tests for the three new controller handlers |

No new files need to be created on the backend. No changes to `cv.module.ts` or `schema.prisma`.

**Dependency to install before coding:**
```
npm install @aws-sdk/s3-request-presigner
```

---

### Backend Risks

1. **`@aws-sdk/s3-request-presigner` not installed** — must be installed before `R2Service` changes.
2. **R2 pre-signing endpoint** — `R2_PUBLIC_URL` must be the S3-compatible API URL (e.g., `https://<account-id>.r2.cloudflarestorage.com`), not a CDN URL. Verify env config before implementing.
3. **`r2.service.spec.ts` mock update** — adding `@aws-sdk/s3-request-presigner` requires an additional `jest.mock(...)` entry in the spec file, consistent with existing pattern.

---

## Frontend Plan

### Step 1 — Spec Analysis

**Pages / routes required:**
- `/dashboard` — protected by `authGuard`, lazy-loaded

**UI components needed:**
- `Dashboard` — page/organism (feature root)
- `CvFileList` — organism; renders the list of files
- `CvFileListItem` — molecule; one row with name, size, date, type, and action buttons
- `CvFileDetailsDialog` — molecule; PrimeNG Dialog showing full metadata + parsedText

**User interactions:**
- Load: fetch list on init, show loading/error/empty/populated states
- Download: call download endpoint, open URL in new tab
- View details: open details Dialog for selected file
- Delete: show PrimeNG ConfirmDialog, on confirm call delete, splice item from local signal list

---

### Step 2 — Expected API Contract (Frontend)

| Method | Route | Request shape | Response shape | Used by |
|--------|-------|---------------|----------------|---------|
| GET | `/api/cv` | — (auth header via interceptor) | `CvDocumentListItem[]` | `CvApiService.getUserCvs()` |
| GET | `/api/cv/:id/download` | — | `{ url: string }` | `CvApiService.downloadCv(id)` |
| DELETE | `/api/cv/:id` | — | `204 No Content` | `CvApiService.deleteCv(id)` |

---

### Step 3 — Routing

| Path | Page component | Auth guard |
|------|---------------|------------|
| `/dashboard` | `Dashboard` (`features/dashboard/dashboard.ts`) | `authGuard` |

Route added to `appRoutes` in `app.routes.ts` using `loadComponent` (lazy, matching `upload-cv` pattern).

---

### Step 4 — Components

| Component | Type | File path | Props / state |
|-----------|------|-----------|---------------|
| `Dashboard` | page / organism | `features/dashboard/dashboard.ts` + `.html` | Signals: `cvFiles`, `isLoading`, `error`, `selectedFile`, `detailsVisible`; methods: `loadFiles()`, `onDownload()`, `onDelete()`, `onViewDetails()` |
| `CvFileList` | organism | `features/dashboard/components/cv-file-list/cv-file-list.ts` + `.html` | `input: files: CvDocumentListItem[]`; `output: download`, `delete`, `viewDetails` |
| `CvFileListItem` | molecule | `features/dashboard/components/cv-file-list-item/cv-file-list-item.ts` + `.html` | `input: file: CvDocumentListItem`; `output: download`, `delete`, `viewDetails` |
| `CvFileDetailsDialog` | molecule | `features/dashboard/components/cv-file-details-dialog/cv-file-details-dialog.ts` + `.html` | `input: file: CvDocumentListItem \| null`, `input: visible: boolean`; `output: visibleChange` |

All components: `ChangeDetectionStrategy.OnPush`, `input()`/`output()` functions, `inject()` for DI.

**MIME label:** pure helper `getMimeLabel(mimeType: string): string` in `features/dashboard/utils/mime-label.ts` — maps `application/pdf` → `PDF`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → `DOCX`.

**Formatted date:** Angular `DatePipe` with format `'d MMM y'`.

**Human-readable file size:** reuse existing `formatFileSize` utility.

**ConfirmDialog:** PrimeNG `ConfirmDialogModule` + `ConfirmationService` provided in the `Dashboard` component's `providers` array.

---

### Step 5 — Service

| Service | File path | Methods | Dependencies |
|---------|-----------|---------|--------------|
| `CvApiService` | `features/dashboard/services/cv-api.service.ts` | `getUserCvs()`, `downloadCv(id)`, `deleteCv(id)` | `HttpClient` via `inject()` |

Method signatures:
- `getUserCvs(): Observable<CvDocumentListItem[]>`
- `downloadCv(id: string): Observable<{ url: string }>`
- `deleteCv(id: string): Observable<void>`

New standalone service — `CvUploadApiService` is NOT modified.

---

### Step 6 — State Management

All state is local to the `Dashboard` page component (no NgRx store):

```
cvFiles = signal<CvDocumentListItem[]>([]);
isLoading = signal(false);
error = signal<string | null>(null);
selectedFile = signal<CvDocumentListItem | null>(null);
detailsVisible = signal(false);
```

State transitions:
- **Load:** `isLoading.set(true)` → `getUserCvs()` → success: `cvFiles.set(result)`, `isLoading.set(false)` / error: `error.set(message)`, `isLoading.set(false)`
- **Download:** `downloadCv(id)` → success: `window.open(url, '_blank')` (guarded with `isPlatformBrowser`)
- **View details:** `selectedFile.set(file)`, `detailsVisible.set(true)`
- **Delete (confirm):** `ConfirmationService.confirm()` → accept: `deleteCv(id)` → success: `cvFiles.update(list => list.filter(f => f.id !== id))`

---

### Step 7 — Navigation Change

In `apps/opticv-web/src/app/layout/top-header/top-header.ts`, add `{ label: 'Dashboard', route: '/dashboard' }` to the `loggedInMenuItems` array inside the existing `effect()` block.

---

### Step 8 — Frontend Files

| File path | Action | Purpose |
|-----------|--------|---------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | modify | Add `CvDocumentListItem` type export |
| `apps/opticv-web/src/app/app.routes.ts` | modify | Register `/dashboard` route with `authGuard` and lazy `loadComponent` |
| `apps/opticv-web/src/app/layout/top-header/top-header.ts` | modify | Add Dashboard item to `loggedInMenuItems` |
| `apps/opticv-web/src/app/features/dashboard/dashboard.ts` | create | Page component — orchestrates signals, calls service, handles all actions |
| `apps/opticv-web/src/app/features/dashboard/dashboard.html` | create | Page template — loading/error/empty/populated states using `@if`/`@for` |
| `apps/opticv-web/src/app/features/dashboard/services/cv-api.service.ts` | create | `CvApiService` with `getUserCvs`, `downloadCv`, `deleteCv` |
| `apps/opticv-web/src/app/features/dashboard/services/cv-api.service.spec.ts` | create | Unit tests for all three service methods |
| `apps/opticv-web/src/app/features/dashboard/utils/mime-label.ts` | create | Pure `getMimeLabel(mimeType)` helper |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.ts` | create | Organism: `@for` loop of `CvFileListItem`, emits actions upward |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html` | create | Template for file list |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.ts` | create | Molecule: one file row with formatted size/date/MIME and three action buttons |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.html` | create | Template for a single file row |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-details-dialog/cv-file-details-dialog.ts` | create | PrimeNG Dialog: metadata + parsedText |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-details-dialog/cv-file-details-dialog.html` | create | Dialog template |
| `apps/opticv-web/src/app/features/dashboard/dashboard.spec.ts` | create | Unit tests: loading, error, empty, populated, download, delete, view-details |

---

### Frontend Risks

1. **ConfirmDialog provider scope:** `ConfirmationService` must be added to the `Dashboard` component's own `providers` array (not just imported), since the component is lazy and standalone.
2. **`window.open` under SSR:** Must wrap with `isPlatformBrowser(inject(PLATFORM_ID))` check — same pattern as `authGuard`.
3. **`effect()` mutation in top-header:** Adding Dashboard to `loggedInMenuItems` is additive and safe; no structural change to the effect is required.
4. **`deleteCv` void response:** Use `http.delete<void>(url)` to match `Observable<void>` signature without body parsing.

---

## API Contract

| Method | Route | Request | Response | Auth |
|--------|-------|---------|----------|------|
| GET | `/api/cv` | — | `CvDocumentListItem[]` | Bearer JWT |
| GET | `/api/cv/:id/download` | id (param) | `{ url: string }` | Bearer JWT |
| DELETE | `/api/cv/:id` | id (param) | `204 No Content` | Bearer JWT |

**Shared type:**
```ts
export type CvDocumentListItem = Pick<
  CvDocument,
  'id' | 'fileName' | 'fileSize' | 'mimeType' | 'createdAt' | 'parsedText'
>;
```

---

## Integration Check

| Frontend expects | Backend provides | Gap |
|-----------------|-----------------|-----|
| `GET /api/cv` → `CvDocumentListItem[]` | `GET /api/cv` → `CvDocumentListItem[]` | None |
| `GET /api/cv/:id/download` → `{ url: string }` | `GET /api/cv/:id/download` → `{ url: string }` | None |
| `DELETE /api/cv/:id` → `204 No Content` | `DELETE /api/cv/:id` → `204 No Content` | None |
| `CvDocumentListItem` = Pick of 6 fields | Same Pick, identical fields | None |
| Auth via `Authorization: Bearer` (existing interceptor) | `SupabaseGuard` class-level on controller | None |

**No integration gaps.**

---

## Unified Implementation Order

1. Install `@aws-sdk/s3-request-presigner` dependency
2. Add `CvDocumentListItem` type to `packages/shared/datatypes/src/lib/datatypes.ts`
3. Add `R2Service.getPresignedUrl()` method
4. Add `CvService.getUserCvs()`, `CvService.getDownloadUrl()`, `CvService.deleteCv()` methods
5. Add `GET /`, `GET /:id/download`, `DELETE /:id` handlers to `CvController`
6. Add backend unit tests (`r2.service.spec.ts`, `cv.service.spec.ts`, `cv.controller.spec.ts`)
7. Create `CvApiService` (frontend)
8. Create `getMimeLabel` utility
9. Create `CvFileListItem` component
10. Create `CvFileList` component
11. Create `CvFileDetailsDialog` component
12. Create `Dashboard` page component + template
13. Register `/dashboard` route in `app.routes.ts`
14. Add Dashboard menu item to `top-header.ts`
15. Add frontend unit tests (`cv-api.service.spec.ts`, `dashboard.spec.ts`)
16. Verify build, lint, typecheck pass
