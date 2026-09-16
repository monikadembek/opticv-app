# Plan: Send PDFs directly to the model instead of using pdf-parse

## Context

CV structured-data extraction currently runs in two independent steps:

1. **Upload time** (`CvService.uploadCv`, `apps/opticv-be/src/app/cv/cv.service.ts:38-129`): `CvParserService.parse()` (`apps/opticv-be/src/app/cv/services/cv-parser.service.ts`) runs `pdf-parse` (v2, `new PDFParse({ data }).getText()`) on PDF buffers and stores the raw text in `CvDocument.parsedText`.
2. **Extraction time** (`CvExtractionService.extractStructuredData`, `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts`): the stored `parsedText` is sent as a plain-text user message to `OpenAiService.extractCvData()` (`apps/opticv-be/src/app/ai/services/openai.service.ts:19-48`), which calls `gpt-4o-mini` via `chat.completions.create` with `response_format: json_object` and casts the JSON response straight to `CvStructuredData` (no runtime schema validation).

The problem: `pdf-parse` reads text in the PDF's internal content-stream order, not visual reading order. For multi-column CVs or CVs with graphical/floating elements, this scrambles the text (e.g. interleaving the left and right column line-by-line), so `parsedText` looks like a shuffled document. Since the model only ever sees this scrambled text, the structured JSON it returns is wrong — not because the extraction prompt is bad, but because its input is already corrupted.

The `openai` SDK is already at v6.37 in this repo but only `chat.completions.create()` with plain-text messages is used anywhere. Nothing currently uploads a file or sends a PDF as multimodal content, even though the SDK supports it. Bypassing `pdf-parse` for PDFs and sending the file itself to the model removes the broken intermediate step and lets the model use its own (layout-aware) PDF reading, which handles columns/graphics correctly.

**Decisions from clarification with the user:**
- PDFs always go straight to the model (no `pdf-parse` fallback/hybrid logic) — DOCX keeps using `mammoth` since it doesn't have this column-ordering failure mode.
- `parsedText` is no longer populated for PDFs at upload time. The PDF file is fetched from R2 and sent to the model at `/extract` time; `structuredData` is stored as today.

## Approach

### 1. Upload flow — stop parsing PDFs with `pdf-parse`

`CvParserService.parse()` (`apps/opticv-be/src/app/cv/services/cv-parser.service.ts`):
- For `application/pdf`, stop calling `pdf-parse`. Either remove the PDF branch from `CvParserService` entirely (if DOCX is the only thing it should still handle) or have it return `null`/skip, depending on how `CvService.uploadCv` is restructured (see next point). Given `mammoth` still needs this service for DOCX, keep the class but drop the PDF branch and the `pdf-parse` import/dependency.
- Remove `pdf-parse` from `package.json` once nothing references it.

`CvService.uploadCv()` (`apps/opticv-be/src/app/cv/cv.service.ts:38-129`):
- For PDF uploads: skip the parse step entirely. Store the `CvDocument` with `parsedText: null` and `parseStatus: 'COMPLETED'` (parsing PDFs is no longer a concept — the upload succeeded, that's all that's tracked) immediately after the R2 upload, without invoking `CvParserService`.
- For DOCX uploads: keep the existing `CvParserService.parse()` call and behavior unchanged (mammoth, try/catch, cleanup-on-failure).
- This means the parse-failure cleanup path (lines 78-99) only applies to DOCX going forward.

### 2. Storage — add a way to fetch the raw file back from R2

`R2Service` (`apps/opticv-be/src/app/storage/r2.service.ts`) currently only supports `upload`, `delete`, and `getPresignedUrl` — there's no method to read the object body server-side. Add a `download(key: string): Promise<Buffer>` method using `GetObjectCommand` (already imported) + reading the returned stream into a buffer, following the same try/catch-and-wrap-in-`InternalServerErrorException` pattern as the other methods.

### 3. AI extraction — send the PDF file to the model

`OpenAiService` (`apps/opticv-be/src/app/ai/services/openai.service.ts`):
- Add a new method, e.g. `extractCvDataFromFile(buffer: Buffer, fileName: string): Promise<CvStructuredData>`, that sends the PDF as a file input instead of plain text.
- Use the OpenAI Responses API (`client.responses.create`) with an `input_file` content part (base64-encoded PDF via `file_data`, or upload via `client.files.create` + `file_id` — prefer inline `file_data` to avoid managing/cleaning up uploaded Files API objects for a one-shot extraction) alongside the same instructions used today (reuse `EXTRACTION_SYSTEM_PROMPT` content), requesting JSON output.
- Keep the same response validation as `extractCvData` (empty-response check, `JSON.parse` try/catch, object-type check) — factor this validation into a shared private helper if it's identical logic, to avoid duplicating it between the text and file methods.
- `extractCvData(text)` stays as-is and continues to be used for DOCX (whose `parsedText` is still populated via mammoth).

### 4. Extraction service — branch on mime type

`CvExtractionService.extractStructuredData()` (`apps/opticv-be/src/app/cv/services/cv-extraction.service.ts`):
- Currently guards on `doc.parsedText` being non-empty (lines 40-44) before calling `openAiService.extractCvData(doc.parsedText)`.
- Change the guard/branch based on `doc.mimeType`:
  - `application/pdf`: no `parsedText` check; instead fetch the file from R2 via `this.r2.download(doc.storageKey)` and call `this.openAiService.extractCvDataFromFile(buffer, doc.fileName)`.
  - DOCX: unchanged — require non-empty `parsedText`, call `extractCvData(doc.parsedText)`.
- Needs `R2Service` injected into `CvExtractionService` (currently only `PrismaService` and `OpenAiService`).
- Cache-hit and failure-handling logic (lines 33-38, 61-69) stays the same regardless of branch.

### 5. Module wiring

`CvModule` (`apps/opticv-be/src/app/cv/cv.module.ts`) already imports `StorageModule` (used by `CvService`) — confirm `R2Service` is exported from `StorageModule` so `CvExtractionService` can inject it too (it's in the same module, so this should already work).

### 6. Frontend / types touch points

- `CvDocument.parsedText` in `@opticv/datatypes` (`packages/shared/datatypes/src/lib/datatypes.ts`) stays typed as `string | null` — no type change needed, since it's already nullable and DOCX still populates it.
- Check any frontend code that reads `parsedText` for display (e.g. a "preview extracted text" UI) — if such a UI exists, PDFs will now always show empty/null there. Search for `parsedText` usage in `apps/opticv-web` to confirm whether this needs a UI adjustment (e.g. hide the preview for PDFs, or show "preview not available for PDF").

### 7. Tests

- `cv-parser.service.spec.ts`: update/remove PDF-related test cases (mocked `PDFParse`), keep DOCX cases.
- `cv.service.spec.ts` (if it exists): update upload tests to reflect PDFs skipping the parse step.
- `cv-extraction.service.spec.ts` (if it exists): add cases for the PDF branch (mocking `R2Service.download` and `OpenAiService.extractCvDataFromFile`), keep DOCX branch coverage.
- `openai.service.spec.ts` (if it exists): add coverage for `extractCvDataFromFile`, mirroring existing `extractCvData` error-path tests (empty response, non-JSON, non-object).

## Verification

- `npm exec nx test opticv-be` — run backend unit tests for the touched services.
- `npm exec nx typecheck opticv-be` — confirm no type breakage from the `R2Service`/`OpenAiService`/`CvExtractionService` signature changes.
- Manual end-to-end check: upload a real multi-column PDF CV that previously produced scrambled/invalid structured data, confirm `POST /cv/:id/extract` now returns correctly ordered, complete structured data. Also verify a DOCX upload still works unchanged (parsedText populated, extraction via text path).
- Confirm `pdf-parse` removal doesn't break anything else in the codebase (`grep -r pdf-parse apps/` before deleting the dependency from `package.json`).
