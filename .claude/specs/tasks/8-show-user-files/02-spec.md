# Task Specification

## Source

Task 8 — Show list of user uploaded files in dashboard

## Goal

Add a `/dashboard` page to the frontend that lists the CV documents uploaded by the currently logged-in user. Add a backend endpoint to retrieve those documents. Add a "Dashboard" navigation item visible only when logged in.

## Context

The CV upload feature (task 7) is already in place. The `CvDocument` DB model, Prisma schema, R2 storage, and the `POST /api/cv/upload` endpoint all exist. The shared `CvDocument` type is defined in `@opticv/datatypes`. The top-header navigation already supports conditional (auth-gated) menu items.

## Scope

### In scope

- New backend endpoint: `GET /api/cv` — returns all CV documents for the authenticated user
- New backend endpoint: `GET /api/cv/:id/download` — returns a signed/pre-signed download URL for a specific file from R2 storage
- New backend endpoint: `DELETE /api/cv/:id` — deletes a CV document (DB record + R2 object) for the authenticated user
- New frontend route: `/dashboard` protected by `authGuard`
- New dashboard feature component at `apps/opticv-web/src/app/features/dashboard/`
- A file list component displaying: file name, file size (human-readable), upload date, file type (MIME label)
- Per-file actions: Delete, Download, View details (opens a modal/panel with parsed text and full metadata)
- Empty state: message + link to `/upload-cv` when no files are present
- "Dashboard" menu item in top-header, added to the auth-gated `loggedInMenuItems` array
- New shared response type `CvDocumentListItem` in `@opticv/datatypes`
- Unit tests for new backend service methods and frontend components/services

### Out of scope

- Renaming or editing file metadata
- Setting a file as "active" (the `isActive` field is not surfaced)
- Pagination or filtering of the list
- Real-time updates on the list

## Behavior

### Backend

1. `GET /api/cv`
   - Guard: `SupabaseGuard` (same as upload)
   - Reads `userId` from `@CurrentUser()` decorator
   - Returns array of `CvDocumentListItem` (see Data/API section), ordered by `createdAt` descending
   - Returns `[]` (empty array) when no records found — no 404

2. `GET /api/cv/:id/download`
   - Guard: `SupabaseGuard`
   - Verifies the document belongs to the authenticated user — returns `403 Forbidden` if not
   - Returns a pre-signed download URL from R2 (via `R2Service`) — or, if R2 does not support pre-signing with the current adapter, streams the file directly
   - Returns `404 Not Found` if the document ID does not exist

3. `DELETE /api/cv/:id`
   - Guard: `SupabaseGuard`
   - Verifies the document belongs to the authenticated user — returns `403 Forbidden` if not
   - Deletes the R2 object via `R2Service.deleteObject(storageKey)`
   - Deletes the DB record via Prisma
   - Returns `204 No Content` on success
   - Returns `404 Not Found` if the document ID does not exist

### Frontend — Dashboard page

1. On load: component dispatches a call to `GET /api/cv` and displays the result
2. Loading state: show a loading indicator while the request is in flight
3. Error state: show an error message if the request fails
4. Empty state: show a friendly message ("You haven't uploaded any CVs yet") and a button/link navigating to `/upload-cv`
5. File list: each row shows — file name, human-readable file size (e.g. `245 KB`), formatted upload date (e.g. `14 May 2026`), MIME label (`PDF` / `DOCX`)
6. Per-file actions:
   - **Download** — calls `GET /api/cv/:id/download`, then opens the returned URL in a new tab
   - **View details** — opens a PrimeNG Dialog (or Drawer) showing full metadata + `parsedText` (with a fallback "No parsed text available" if null)
   - **Delete** — shows a PrimeNG ConfirmDialog ("Are you sure you want to delete this file?"); on confirm calls `DELETE /api/cv/:id`; on success removes the item from the local list without re-fetching

### Frontend — Navigation

- Add `{ label: 'Dashboard', route: '/dashboard' }` to the `loggedInMenuItems` array in `top-header.ts`

## Edge Cases

- Delete: if the R2 deletion fails, the DB record must NOT be deleted (R2 first, then DB)
- Download: if the document `storageKey` is missing or the R2 object no longer exists, return a descriptive error to the client
- View details: `parsedText` may be `null` — display a placeholder string, do not crash
- List: if the user has many files, all are returned in a single response (no pagination in scope)
- Auth: all three new endpoints must return `401` if the JWT is missing or invalid (handled by `SupabaseGuard`)

## Data / API

### New shared type (`@opticv/datatypes`)

```ts
export type CvDocumentListItem = Pick<
  CvDocument,
  'id' | 'fileName' | 'fileSize' | 'mimeType' | 'createdAt' | 'parsedText'
>;
```

### GET /api/cv

Response: `CvDocumentListItem[]`

### GET /api/cv/:id/download

Response: `{ url: string }` (pre-signed URL, valid for a short TTL, e.g. 15 minutes)

### DELETE /api/cv/:id

Response: `204 No Content`

### Frontend service

Add methods to the existing `CvUploadApiService` (or create a new `CvApiService`):

```ts
getUserCvs(): Observable<CvDocumentListItem[]>
downloadCv(id: string): Observable<{ url: string }>
deleteCv(id: string): Observable<void>
```

### Frontend state

Use local component signals (not NgRx store) — the list is scoped to this single page:

```ts
cvFiles = signal<CvDocumentListItem[]>([]);
isLoading = signal(false);
error = signal<string | null>(null);
```

## Acceptance (DEV)

- Build passes (`npm exec nx run-many -t build`)
- Lint and typecheck pass
- `GET /api/cv` returns only documents belonging to the authenticated user
- `DELETE /api/cv/:id` rejects requests for documents owned by other users (403)
- `GET /api/cv/:id/download` rejects requests for documents owned by other users (403)
- Dashboard route is accessible only when logged in (redirects to `/login` otherwise)
- Empty state is shown when the user has no uploaded CVs
- Delete confirmation dialog appears before deletion
- After deletion, the item is removed from the list without a full page reload
- Unit tests added for:
  - `CvService` new methods (backend)
  - Dashboard component (frontend): loading, error, empty, and populated states
  - `CvApiService` new methods (frontend)
