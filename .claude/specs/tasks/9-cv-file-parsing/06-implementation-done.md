# Implementation Done — Task 9-cv-file-parsing

## Summary

CV file parsing was implemented for the upload flow. After a user uploads a PDF or DOCX file, the backend now synchronously parses the text content using `pdf-parse` (PDF) and `mammoth` (DOCX), stores the result in `parsedText`, and sets `parseStatus` to `COMPLETED`. On parse failure the DB record and R2 object are deleted and HTTP 422 is returned. The `ParseStatus` type is shared via `@opticv/datatypes` and the frontend displays a status indicator per CV file in the dashboard list.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Install `pdf-parse` (PDF parsing) | Implemented | Added to `package.json` dependencies |
| Install `mammoth` (DOCX parsing) | Implemented | Added to `package.json` dependencies |
| Install `@types/pdf-parse` and `@types/mammoth` | Implemented | Added to `package.json` devDependencies |
| `CvParserService` — `parse(buffer, mimeType): Promise<string>` | Implemented | `cv-parser.service.ts` |
| `parse` handles `application/pdf` via `pdf-parse` | Implemented | `cv-parser.service.ts` lines 15–19 |
| `parse` handles DOCX MIME type via `mammoth` | Implemented | `cv-parser.service.ts` lines 21–27 |
| `parse` throws `UnsupportedMimeTypeError` for unsupported MIME | Implemented | `cv-parser.service.ts` line 29 |
| `UnsupportedMimeTypeError` class defined | Implemented | `cv-parser.service.ts` lines 5–9 |
| `ParseStatus` enum added to Prisma schema (`PENDING`, `COMPLETED`, `FAILED`) | Implemented | `schema.prisma` lines 46–50 |
| `parseStatus ParseStatus @default(PENDING)` added to `CvDocument` model | Implemented | `schema.prisma` line 107 |
| Database migration generated and applied | Implemented | `migrations/20260515000000_.../migration.sql` |
| `ParseStatus` type added to shared datatypes | Implemented | `datatypes.ts` line 1 |
| `parseStatus` added to `UploadCvResponse` shared type | Implemented | `datatypes.ts` lines 27–30 |
| `parseStatus` added to `CvDocumentListItem` shared type | Implemented | `datatypes.ts` lines 32–35 |
| `CvParserService` added to `CvModule.providers` | Implemented | `cv.module.ts` line 12 |
| `CvParserService` injected into `CvService` | Implemented | `cv.service.ts` line 33 |
| `uploadCv` creates DB record with `parseStatus: 'PENDING'` | Implemented | `cv.service.ts` line 69 |
| Parse runs synchronously before returning response | Implemented | `cv.service.ts` lines 76–88 (plan deviation from spec's async approach) |
| On parse success: `parsedText` updated, `parseStatus` set to `COMPLETED` | Implemented | `cv.service.ts` lines 91–94 |
| On parse failure: DB record deleted | Implemented | `cv.service.ts` line 81–82 |
| On parse failure: R2 object deleted | Implemented | `cv.service.ts` lines 83–85 |
| On parse failure: HTTP 422 returned | Implemented | `cv.service.ts` line 86–88 |
| Parse failure error logged via NestJS Logger | Implemented | `cv.service.ts` line 79 |
| `getUserCvs` returns `parseStatus` per item | Implemented | `cv.service.ts` line 132 |
| Unit tests for `CvParserService` — PDF success | Implemented | `cv-parser.service.spec.ts` |
| Unit tests for `CvParserService` — DOCX success | Implemented | `cv-parser.service.spec.ts` |
| Unit tests for `CvParserService` — unsupported MIME type | Implemented | `cv-parser.service.spec.ts` |
| Unit tests for `CvParserService` — empty DOCX content | Implemented | `cv-parser.service.spec.ts` |
| Frontend: `@switch (file().parseStatus)` block in `CvFileListItem` template | Implemented | `cv-file-list-item.html` lines 12–26 |
| Frontend: PENDING — spinner icon + "Parsing…" text | Implemented | `cv-file-list-item.html` lines 13–16 |
| Frontend: COMPLETED — check-circle icon + "Parsed" text | Implemented | `cv-file-list-item.html` lines 17–20 |
| Frontend: FAILED — exclamation-triangle icon + "Parsing failed" text | Implemented | `cv-file-list-item.html` lines 21–24 |
| Frontend: icons have `aria-hidden="true"` | Implemented | All three status icon elements |
| Frontend: accessible text label per status (WCAG AA) | Implemented | Visible `<span>` text alongside each icon |
| Spec fixture: `parseStatus` added to `CvFileListItem` spec fixture | Implemented | `cv-file-list-item.spec.ts` |
| Spec fixture: `parseStatus` added to `CvFileList` spec fixture | Implemented | `cv-file-list.spec.ts` |
| Spec fixture: `parseStatus` added to `Dashboard` spec fixture | Implemented | `dashboard.spec.ts` |
| Spec fixture: `parseStatus` added to `CvApiService` spec fixture | Implemented | `cv-api.service.spec.ts` |
| Spec fixture: `parseStatus` added to `CvUploadApiService` spec fixture | Implemented | `cv-upload-api.service.spec.ts` |
| Frontend: post-upload confirmation updated | Implemented | `upload-cv.html` — success message "CV uploaded and parsed successfully." shown after upload |
| Spec async fire-and-forget flow | Not implemented | Plan intentionally changed to synchronous; `parseStatus: 'PENDING'` never returned to client on successful upload |
| `parseStatus: FAILED` written to DB on failure | Not implemented | Plan changed: parse failure deletes record and returns 422; `FAILED` status is defined but never persisted |

---

## Files

### Created

| File | Purpose |
|---|---|
| `apps/opticv-be/src/app/cv/cv-parser.service.ts` | `CvParserService` with `parse()` method and `UnsupportedMimeTypeError` |
| `apps/opticv-be/src/app/cv/cv-parser.service.spec.ts` | Unit tests for `CvParserService` (4 test cases) |
| `apps/opticv-be/prisma/migrations/20260515000000_add_parse_status_to_cv_documents/migration.sql` | Migration: `CREATE TYPE ParseStatus`, `ALTER TABLE cv_documents ADD COLUMN parse_status` |

### Modified

| File | Change |
|---|---|
| `apps/opticv-be/prisma/schema.prisma` | Added `ParseStatus` enum; added `parseStatus` field to `CvDocument` |
| `apps/opticv-be/src/app/cv/cv.service.ts` | Injected `CvParserService`; updated `uploadCv` (parse + update/cleanup); updated `getUserCvs` select |
| `apps/opticv-be/src/app/cv/cv.service.spec.ts` | Added `parseStatus` to mock fixture; added parse failure and DOCX test cases |
| `apps/opticv-be/src/app/cv/cv.module.ts` | Added `CvParserService` to `providers` |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added `ParseStatus` type; added `parseStatus` to `UploadCvResponse` and `CvDocumentListItem` |
| `packages/shared/datatypes/src/lib/datatypes.spec.ts` | Added `parseStatus` to `UploadCvResponse` fixture |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.html` | Added `@switch (file().parseStatus)` status block |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.spec.ts` | Added `parseStatus` to fixture; added 3 status rendering test cases |
| `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.spec.ts` | Added `parseStatus` to mock fixtures |
| `apps/opticv-web/src/app/features/dashboard/dashboard.spec.ts` | Added `parseStatus` to mock fixture |
| `apps/opticv-web/src/app/features/dashboard/services/cv-api.service.spec.ts` | Added `parseStatus` to mock fixture |
| `apps/opticv-web/src/app/features/upload-cv/services/cv-upload-api.service.spec.ts` | Added `parseStatus` to mock response fixture |
| `apps/opticv-web/src/app/features/upload-cv/upload-cv.html` | Added post-upload success message referencing parse completion |
| `apps/opticv-web/src/app/features/upload-cv/upload-cv.spec.ts` | Added `parseStatus` to mock response fixture |
| `package.json` | Added `pdf-parse`, `mammoth` to dependencies; `@types/pdf-parse`, `@types/mammoth` to devDependencies |
| `package-lock.json` | Updated lockfile |

---

## Components

| Component | Plan Reference | Status |
|---|---|---|
| `CvParserService` | Backend plan §4 | Exist |
| `CvFileListItem` (template updated) | Frontend plan §4 | Exist |
| `UploadCv` (template updated) | Frontend plan §4 | Exist |

---

## Stores

No new NgRx Signal Store state was planned or implemented. `parseStatus` is carried within existing list item data.

| Store | Plan Reference | Status |
|---|---|---|
| (none planned) | — | — |

---

## Deviations

1. **Parsing strategy: async fire-and-forget (spec) → synchronous blocking (plan)**
   The implementation plan changed the upload flow from fire-and-forget (spec §Behavior steps 3–6) to synchronous. The code implements the plan's synchronous approach. As a result, `parseStatus: 'PENDING'` is never returned in the upload response on success; `'COMPLETED'` is always returned on a successful parse.

2. **Parse failure outcome: `FAILED` status (spec) → record deletion + HTTP 422 (plan)**
   The spec states parse failure should set `parseStatus: FAILED` and surface that status to the frontend. The plan changed this to delete the DB record and R2 object and return HTTP 422. The code implements the plan. `ParseStatus.FAILED` exists in the schema and shared types but is never written to the DB.

3. **`CvService.spec.ts` scope expanded**
   The plan listed `cv.service.spec.ts` as a file to modify (add `parseStatus` to fixture). The actual implementation also added new test cases covering: parse failure cleanup (`UnprocessableEntityException` + DB/R2 cleanup), DOCX file upload, storage key format validation, and DB create failure with R2 cleanup. These were not listed individually in the plan.

---

## Additional Implementation

- `packages/shared/datatypes/src/lib/datatypes.ts` uses `Pick<CvDocument, ...>` to derive `UploadCvResponse` and `CvDocumentListItem` from the base `CvDocument` type, rather than defining separate interfaces as shown in the spec. The resulting type shape is equivalent.
- `apps/opticv-web/src/app/features/upload-cv/upload-cv.spec.ts` was also updated with `parseStatus` in the mock response fixture. This file was not listed in the plan's §Frontend 7 file table but was required to compile after the type change.
