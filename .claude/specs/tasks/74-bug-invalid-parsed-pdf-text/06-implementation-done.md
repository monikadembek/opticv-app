# Implementation Done: 74-bug-invalid-parsed-pdf-text

## Summary

PDF CV uploads no longer run through `pdf-parse`. At upload time, PDF `CvDocument` rows are created directly with `parsedText: null` and `parseStatus: 'COMPLETED'`, skipping the parse step entirely; DOCX uploads keep the existing `mammoth`-based parse flow unchanged. At extraction time, `CvExtractionService.extractStructuredData` branches on `doc.mimeType`: PDFs download the raw file buffer from R2 via a new `R2Service.download(key)` method and send it directly to OpenAI's Responses API (`client.responses.create` with an `input_file` content part carrying inline base64 `file_data`) through a new `OpenAiService.extractCvDataFromFile(buffer, fileName)` method using the `gpt-4o` model; DOCX documents continue through the existing `extractCvData(text)` text path using `gpt-4o-mini`. Response validation logic (empty-response check, `JSON.parse` try/catch, non-object check) was factored into a shared private helper (`parseExtractionResponse`) reused by both extraction methods. The `pdf-parse` dependency was removed from `package.json`, and the PDF branch was removed from `CvParserService`. All touched backend services have updated/added unit test coverage.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Stop running `pdf-parse` on PDF uploads; DOCX continues via `mammoth` | Implemented | `cv-parser.service.ts` only handles DOCX mime type; PDF falls through to `UnsupportedMimeTypeError` (unreachable in practice since `CvService` no longer calls `parse()` for PDFs) |
| PDF `CvDocument` rows stored with `parsedText: null`, `parseStatus: 'COMPLETED'` at upload; no parse step invoked | Implemented | `cv.service.ts` `uploadCv`, PDF branch creates the row directly with these values, no `cvParser.parse()` call |
| Add `R2Service.download(key)` | Implemented | `r2.service.ts`, follows existing `upload`/`delete`/`getPresignedUrl` try/catch pattern, throws `InternalServerErrorException('File download failed.')` |
| Add `OpenAiService.extractCvDataFromFile(buffer, fileName)` using Responses API with `input_file`/inline base64 `file_data` | Implemented | `openai.service.ts`, uses `client.responses.create`, reuses `EXTRACTION_SYSTEM_PROMPT` via `instructions` |
| `CvExtractionService.extractStructuredData` branches on `doc.mimeType` | Implemented | PDF branch skips `parsedText` check, fetches buffer via `R2Service.download`, calls `extractCvDataFromFile`; DOCX branch unchanged |
| Switch PDF file-input path to `gpt-4o`; DOCX/text path keeps `gpt-4o-mini` | Implemented | `constants.ts` adds `CV_EXTRACTION_FILE_OPENAI_MODEL = 'gpt-4o'`; `CV_EXTRACTION_OPENAI_MODEL` unchanged |
| Remove `pdf-parse` PDF branch from `CvParserService`; remove `pdf-parse` from `package.json` | Implemented | Import and branch removed from `cv-parser.service.ts`; dependency removed from `package.json`/`package-lock.json` |
| Update/add backend unit tests for all touched services | Implemented | `cv-parser.service.spec.ts`, `cv.service.spec.ts`, `cv-extraction.service.spec.ts`, `openai.service.spec.ts`, `r2.service.spec.ts` all updated with new/removed cases |
| No `pdf-parse` fallback/hybrid logic | Implemented | PDFs always go through the file-based path; no fallback code present |
| No data migration for existing PDF `CvDocument` rows | Implemented | Branch keyed on `mimeType`, not `parsedText` presence; no migration script added |
| No change to `MAX_FILE_SIZE` | Implemented | `cv.service.ts` `MAX_FILE_SIZE` constant unchanged (5 MB) |
| No frontend changes | Implemented | No files under `apps/opticv-web` modified |
| No change to `CvDocument.parsedText` type in `@opticv/datatypes` | Implemented | No changes to shared datatypes package |
| No runtime schema validation added beyond existing checks | Implemented | Shared `parseExtractionResponse` helper only performs the existing empty/JSON/object checks |
| Cache-hit behavior unchanged for both mime types | Implemented | `cv-extraction.service.ts`, cache-hit check runs identically before mime-type branching |
| R2 download failure surfaces as `BadGatewayException` via existing catch | Implemented | `cv-extraction.service.ts` try/catch wraps both the R2 download and OpenAI calls uniformly |
| Model extraction failure for PDF surfaces as `BadGatewayException` | Implemented | Same catch block covers both branches |

## Files

### Created

- `apps/opticv-be/src/app/storage/r2.service.spec.ts` (new spec file — `download` test cases added; other method tests carried over)
- `docs/74-bug-invalid-pdf-text-parsed.md`

### Modified

- `apps/opticv-be/src/app/ai/services/openai.service.ts`
- `apps/opticv-be/src/app/ai/services/openai.service.spec.ts`
- `apps/opticv-be/src/app/constants.ts`
- `apps/opticv-be/src/app/cv/cv.service.ts`
- `apps/opticv-be/src/app/cv/cv.service.spec.ts`
- `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts`
- `apps/opticv-be/src/app/cv/services/cv-extraction.service.spec.ts`
- `apps/opticv-be/src/app/cv/services/cv-parser.service.ts`
- `apps/opticv-be/src/app/cv/services/cv-parser.service.spec.ts`
- `apps/opticv-be/src/app/storage/r2.service.ts`
- `docs/tasks-list.md`
- `package.json`
- `package-lock.json`

## Components

Not applicable — this task is backend-only; no frontend components were planned or touched.

## Stores

Not applicable — no NgRx signal stores were planned or touched for this task.

## Deviations from Plan

- Plan Step 3 specified the shared validation helper signature as `private parseExtractionResponse(content: string | null | undefined): CvStructuredData` — implemented exactly as specified.
- During the code-review pass following initial implementation, two additional changes were made beyond the original plan's steps:
  - `CvExtractionService` constructor parameter `openAiService` changed from `readonly` to `private readonly` (plan and spec did not specify field visibility for this parameter).
  - `CvService.uploadCv`'s two identical `UploadCvResponse` object-literal returns (PDF branch and DOCX/shared-path branch) were factored into a new private method `toUploadCvResponse(doc)`, not present in the original plan.

## Additional Implementation

- `apps/opticv-be/src/app/storage/r2.service.spec.ts` was created as a new file; the plan's "Files to Modify (tests)" list did not include this file (it only listed modifications to `cv-parser.service.spec.ts`, `cv.service.spec.ts`, `cv-extraction.service.spec.ts`, and `openai.service.spec.ts`). Test coverage for `R2Service.download` (and the pre-existing `upload`/`delete`/`getPresignedUrl` methods) was added in this new spec file.
- `docs/74-bug-invalid-pdf-text-parsed.md` and updates to `docs/tasks-list.md` were added, not called out as deliverables in the specification or implementation plan.
