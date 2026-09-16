# Task Specification

## Source

Azure DevOps Task: 74

## Goal

Fix invalid/scrambled CV structured-data extraction for multi-column or graphically complex PDF CVs by bypassing `pdf-parse` for PDF uploads entirely and sending the PDF file directly to the OpenAI model (via the Responses API with `input_file`/`file_data`) at extraction time, letting the model perform layout-aware text reading instead of relying on `pdf-parse`'s content-stream order.

## Context

CV structured-data extraction currently runs in two independent steps:

1. **Upload time** (`CvService.uploadCv`, `apps/opticv-be/src/app/cv/cv.service.ts:38-129`): `CvParserService.parse()` (`apps/opticv-be/src/app/cv/services/cv-parser.service.ts`) runs `pdf-parse` (v2, `new PDFParse({ data }).getText()`) on PDF buffers and stores the raw text in `CvDocument.parsedText`.
2. **Extraction time** (`CvExtractionService.extractStructuredData`, `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts`): the stored `parsedText` is sent as a plain-text user message to `OpenAiService.extractCvData()` (`apps/opticv-be/src/app/ai/services/openai.service.ts:19-48`), which calls `gpt-4o-mini` via `chat.completions.create` with `response_format: json_object` and casts the JSON response straight to `CvStructuredData` (no runtime schema validation).

**Problem:** `pdf-parse` reads text in the PDF's internal content-stream order, not visual reading order. For multi-column CVs or CVs with graphical/floating elements, this scrambles the text (e.g. interleaving the left and right column line-by-line), so `parsedText` looks like a shuffled document. Since the model only ever sees this scrambled text, the structured JSON it returns is wrong — not because the extraction prompt is bad, but because its input is already corrupted.

The `openai` SDK is already at v6.37 in this repo but only `chat.completions.create()` with plain-text messages is used anywhere. Nothing currently uploads a file or sends a PDF as multimodal content, even though the SDK supports it. Bypassing `pdf-parse` for PDFs and sending the file itself to the model removes the broken intermediate step and lets the model use its own (layout-aware) PDF reading, which handles columns/graphics correctly.

## Scope

### In scope

- Stop running `pdf-parse` on PDF uploads; DOCX continues to use `mammoth` unchanged (DOCX has no column-ordering failure mode).
- PDF `CvDocument` rows are stored with `parsedText: null` and `parseStatus: 'COMPLETED'` at upload time — no parse step is invoked for PDFs.
- Add `R2Service.download(key)` to fetch the raw file buffer from R2 server-side.
- Add `OpenAiService.extractCvDataFromFile(buffer, fileName)` using the OpenAI Responses API (`client.responses.create`) with an `input_file` content part (inline base64 `file_data`), requesting JSON output, reusing `EXTRACTION_SYSTEM_PROMPT`.
- `CvExtractionService.extractStructuredData()` branches on `doc.mimeType`:
  - `application/pdf`: fetch the file from R2 via `R2Service.download`, call `OpenAiService.extractCvDataFromFile`. No `parsedText` presence check for this branch.
  - DOCX: unchanged — require non-empty `parsedText`, call `extractCvData(doc.parsedText)`.
- Switch the extraction model used for the PDF file-input path to `gpt-4o` (per clarification — `gpt-4o-mini` reliability for file/PDF input via the Responses API was not confirmed). The existing `chat.completions.create` + `extractCvData(text)` path for DOCX keeps using the current `CV_EXTRACTION_OPENAI_MODEL` (`gpt-4o-mini`) unchanged.
- Remove the `pdf-parse` PDF branch from `CvParserService`; remove `pdf-parse` from `package.json` once nothing references it (confirm via `grep -r pdf-parse apps/` first).
- Update/add backend unit tests for all touched services (see Acceptance).

### Out of scope

- No `pdf-parse` fallback/hybrid logic — PDFs always go straight to the model.
- No data migration for existing `CvDocument` rows with stale PDF `parsedText` — existing rows are left as-is; the extraction branch is keyed on `mimeType`, not on whether `parsedText` is populated, so re-running extraction on old PDF rows automatically uses the new file-based path.
- No change to `MAX_FILE_SIZE` (5 MB) — base64 encoding overhead on a 5 MB PDF is within OpenAI request limits; out of scope for this bug fix.
- No frontend changes — `parsedText` is not rendered anywhere in `apps/opticv-web` (only referenced as `null` in test mocks), so no UI adjustment is needed.
- No change to `CvDocument.parsedText` type in `@opticv/datatypes` — stays `string | null`, since DOCX still populates it.
- No runtime schema validation added beyond what already exists (empty-response check, `JSON.parse` try/catch, object-type check).

## Behavior

1. **PDF upload** (`CvService.uploadCv`): file is uploaded to R2, then the `CvDocument` row is created directly with `parsedText: null` and `parseStatus: 'COMPLETED'`. `CvParserService.parse()` is not called for PDFs. Upload failure/cleanup handling for the R2 upload and DB insert stays as today.
2. **DOCX upload**: unchanged — `CvParserService.parse()` runs `mammoth`, `parsedText` is populated, and the existing parse-failure cleanup path (delete DB record + R2 object, throw `UnprocessableEntityException`) still applies.
3. **Extraction request** (`POST /cv/:id/extract` → `CvExtractionService.extractStructuredData`):
   - Cache hit (`extractionStatus === 'COMPLETED'` and `structuredData` present) returns stored data unchanged, regardless of mime type.
   - If `doc.mimeType === 'application/pdf'`: skip the `parsedText` empty check; download the file buffer from R2 via `R2Service.download(doc.storageKey)`; call `OpenAiService.extractCvDataFromFile(buffer, doc.fileName)` using `gpt-4o`.
   - If DOCX: unchanged — require non-empty `parsedText`, call `OpenAiService.extractCvData(doc.parsedText)` using `gpt-4o-mini`.
   - Success/failure status updates (`extractionStatus: 'COMPLETED'`/`'FAILED'`) and error responses (`BadGatewayException`) stay the same for both branches.
4. **`OpenAiService.extractCvDataFromFile`**: encodes the PDF buffer as inline base64 `file_data`, sends it via `client.responses.create` with an `input_file` content part alongside `EXTRACTION_SYSTEM_PROMPT`, requests JSON output, and validates the response using the same logic as `extractCvData` (empty-response check, `JSON.parse` try/catch, object-type check) — factor this into a shared private helper to avoid duplication.

## Edge Cases

- **PDF that the model cannot read/extract from** (corrupted, password-protected, scanned image with no embedded text): `extractCvDataFromFile` should surface a clear error; `CvExtractionService` catches it the same way as any other extraction failure (`extractionStatus: 'FAILED'`, `BadGatewayException`).
- **R2 download failure** (object missing, network error): `R2Service.download` throws `InternalServerErrorException` following the existing pattern in `upload`/`delete`/`getPresignedUrl`; this propagates through `CvExtractionService`'s existing try/catch, which sets `extractionStatus: 'FAILED'` and returns `BadGatewayException`.
- **Existing PDF rows with stale non-null `parsedText`** (uploaded before this change): ignored for PDFs — the branch is keyed on `mimeType`, not on `parsedText` presence, so these rows go through the new file-based path on next extraction.
- **DOCX extraction**: entirely unaffected — same guard, same model, same code path as today.
- **Empty/non-JSON/non-object model response** for the file-based path: same validation and error behavior as the existing text-based path (shared helper).

## Data / API

- No new endpoints — `POST /cv/:id/extract` behavior changes internally only (still returns `CvStructuredData`).
- No Prisma schema changes — `CvDocument.parsedText` remains nullable; PDFs simply never populate it going forward.
- `R2Service`: new method `download(key: string): Promise<Buffer>` using `GetObjectCommand` (already imported) + reading the stream into a buffer, wrapped in `InternalServerErrorException` per existing pattern.
- `OpenAiService`: new method `extractCvDataFromFile(buffer: Buffer, fileName: string): Promise<CvStructuredData>` using `client.responses.create` with `gpt-4o` and inline `file_data`.
- `CvExtractionService`: constructor now also injects `R2Service` (already exported from `StorageModule`, which `CvModule` imports — no module wiring changes needed beyond confirming the export).
- `CvParserService`: PDF branch removed; only handles DOCX (`mammoth`) going forward. Throws `UnsupportedMimeTypeError` for anything else, as today.
- `package.json`: `pdf-parse` dependency removed once no references remain.

## Acceptance (DEV)

- `npm exec nx test opticv-be` passes, including:
  - `cv-parser.service.spec.ts`: PDF-related test cases (mocked `PDFParse`) removed; DOCX cases kept.
  - `cv.service.spec.ts`: upload tests updated to reflect PDFs skipping the parse step (`parsedText: null`, `parseStatus: 'COMPLETED'` immediately after R2 upload, no `CvParserService.parse` call for PDFs).
  - `cv-extraction.service.spec.ts`: new cases for the PDF branch (mocking `R2Service.download` and `OpenAiService.extractCvDataFromFile`), existing DOCX branch coverage kept.
  - `openai.service.spec.ts`: new coverage for `extractCvDataFromFile`, mirroring existing `extractCvData` error-path tests (empty response, non-JSON, non-object).
- `npm exec nx typecheck opticv-be` passes with no type breakage from the `R2Service`/`OpenAiService`/`CvExtractionService` signature changes.
- Manual end-to-end check: upload a real multi-column PDF CV that previously produced scrambled/invalid structured data; confirm `POST /cv/:id/extract` now returns correctly ordered, complete structured data. Verify a DOCX upload still works unchanged (parsedText populated, extraction via text path, `gpt-4o-mini`).
- `grep -r pdf-parse apps/` returns no results before removing the dependency from `package.json`.
- No breaking changes to `POST /cv/:id/extract` response shape or existing DOCX behavior.
