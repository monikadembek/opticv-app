# Task Specification

## Source

Azure DevOps Task: 9 — CV file parsing

## Goal

After a user successfully uploads a CV file (PDF or DOCX), parse its text content asynchronously and store it in the `parsedText` field of the `CvDocument` database record. If parsing fails, store `null` and surface a parse-failed status so the frontend can inform the user.

## Context

This task extends the existing `POST /api/cv/upload` flow in `apps/opticv-be/src/app/cv/`. The upload endpoint already creates a `CvDocument` record with `parsedText: null`. This task adds a background parsing step that runs after the DB record is created.

Parsing is scoped to new uploads only — every call to `uploadCv` triggers parsing for the newly created document. Users can have multiple CV files; there is no concept of "replacing" a CV.

## Scope

### In scope

- Install `pdf-parse` (PDF) and `mammoth` (DOCX) parsing libraries
- `CvParserService` — extracts plain text from a `Buffer` given a MIME type
- Asynchronous post-upload parsing triggered from `CvService.uploadCv` (fire-and-forget after DB record is created)
- On parse success: update `parsedText` and set `parseStatus` to `COMPLETED`
- On parse failure: keep `parsedText` as `null`, set `parseStatus` to `FAILED`, log the error
- Add `parseStatus` enum field to `CvDocument` Prisma model (`PENDING` | `COMPLETED` | `FAILED`)
- Expose `parseStatus` in existing list/upload responses so the frontend can show parse state
- Unit tests for `CvParserService`

### Out of scope

- Job queues / message brokers (BullMQ, etc.) — fire-and-forget `Promise` is sufficient for now
- Structured CV parsing (sections, skills, work experience) — plain text only
- Re-parsing existing documents via a dedicated endpoint
- Frontend UI changes (the spec covers backend only; frontend will read `parseStatus` from existing list response)

## Behavior

1. User calls `POST /api/cv/upload` with a PDF or DOCX file.
2. `CvService.uploadCv` validates the file, uploads to R2, and creates a `CvDocument` DB record with `parsedText: null` and `parseStatus: PENDING`.
3. The upload response is returned immediately (with the new `parseStatus: 'PENDING'` field).
4. In the background (non-blocking), `CvService` calls `CvParserService.parse(buffer, mimeType)`.
5. **Parse success path:**
   - `CvParserService` returns extracted plain text string.
   - `CvService` updates the DB record: `parsedText = <text>`, `parseStatus = COMPLETED`.
6. **Parse failure path:**
   - `CvParserService` throws or returns empty/null.
   - `CvService` updates the DB record: `parsedText = null`, `parseStatus = FAILED`.
   - Error is logged via NestJS `Logger`.
7. `GET /api/cv` (list) returns `parseStatus` alongside existing fields so the frontend can display a parse-in-progress or parse-failed indicator.

## Edge Cases

- **Corrupted / password-protected PDF:** `pdf-parse` will throw — caught, `parseStatus` set to `FAILED`.
- **Empty DOCX (no text content):** `mammoth` returns empty string — treat as `COMPLETED` with `parsedText: ''` (empty string is valid parsed output).
- **Very large file (near 5 MB limit):** Parsing runs in-process; acceptable for current scale. No timeout is enforced at this stage.
- **DB update fails during parse result write:** Log the error; do not crash the background task. The `parseStatus` will remain `PENDING` — acceptable degraded state.
- **Unsupported MIME type slips through:** `CvParserService.parse` throws `UnsupportedMimeTypeError`; treat as parse failure.

## Data / API

### Prisma schema change — `CvDocument`

Add a new enum and field:

```prisma
enum ParseStatus {
  PENDING
  COMPLETED
  FAILED
}

model CvDocument {
  // existing fields …
  parseStatus  ParseStatus @default(PENDING)
}
```

Run `prisma migrate dev` to generate and apply the migration.

### Updated `UploadCvResponse` (shared datatypes)

Add `parseStatus` field:

```typescript
export interface UploadCvResponse {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  createdAt: Date;
  parseStatus: 'PENDING' | 'COMPLETED' | 'FAILED'; // new
}
```

### Updated `CvDocumentListItem` (shared datatypes)

Add `parseStatus` field:

```typescript
export interface CvDocumentListItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  parsedText: string | null;
  parseStatus: 'PENDING' | 'COMPLETED' | 'FAILED'; // new
}
```

### New service: `CvParserService`

Location: `apps/opticv-be/src/app/cv/cv-parser.service.ts`

```typescript
// Signature only — no implementation here
parse(buffer: Buffer, mimeType: string): Promise<string>
// Throws on unrecognised MIME type or unrecoverable parse error
```

### Libraries to install

```bash
npm install pdf-parse mammoth
npm install --save-dev @types/pdf-parse @types/mammoth
```

## Assumptions

- Parsing happens in-process (no worker threads or queues) — acceptable for v1 scale.
- `PENDING` is a valid long-term state only if the background task never ran (e.g. server crashed mid-flight); this is acceptable without a retry mechanism at this stage.
- The frontend is responsible for showing parse state; no push notification or WebSocket is needed.

## Acceptance (DEV)

- `npm exec nx build opticv-be` passes with no errors
- `npm exec nx typecheck opticv-be` passes
- `npm exec nx typecheck opticv-web` passes (shared types updated)
- `npm exec nx test opticv-be` passes; unit tests for `CvParserService` cover: PDF success, DOCX success, unsupported MIME type error, empty DOCX content
- Upload a PDF → DB record has `parseStatus: COMPLETED` and non-empty `parsedText`
- Upload a password-protected PDF → DB record has `parseStatus: FAILED`, `parsedText: null`
- `GET /api/cv` returns `parseStatus` on each list item
- No breaking changes to existing endpoints (all existing fields still present)
