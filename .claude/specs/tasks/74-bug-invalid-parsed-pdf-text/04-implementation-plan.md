# Implementation Plan: 74-bug-invalid-parsed-pdf-text

## Source

- Specification: `02-spec.md`
- Specification review: `03-spec-review.md` (PASS WITH ISSUES)

## Clarifications Resolved Before Implementation

These resolve the non-critical issues flagged in `03-spec-review.md`, using existing repo conventions (no new requirements invented):

1. **Model constant naming** — add a new named constant `CV_EXTRACTION_FILE_OPENAI_MODEL = 'gpt-4o'` to `apps/opticv-be/src/app/constants.ts`, alongside the existing `CV_EXTRACTION_OPENAI_MODEL`. `OpenAiService.extractCvDataFromFile` uses this constant, not an inline string literal.
2. **Responses API shape risk** — confirmed against the installed `openai` SDK type declarations (`node_modules/openai/resources/responses/responses.d.ts`): `client.responses.create` accepts `input: ResponseInputItem[]`, where a user message item's `content` array can contain a `ResponseInputFile` object (`{ type: 'input_file', file_data, filename }`) alongside a `ResponseInputText` object (`{ type: 'input_text', text }`). JSON output mode is requested via `text: { format: { type: 'json_object' } }` (per `ResponseTextConfig`). The response's plain-text output is available at `response.output_text: string`. No fallback needed — shape is verified, not assumed.
3. **`CvExtractionService` control flow** — confirmed ordering below (see Step 4).

## Files to Modify

1. `apps/opticv-be/src/app/constants.ts`
2. `apps/opticv-be/src/app/storage/r2.service.ts`
3. `apps/opticv-be/src/app/ai/services/openai.service.ts`
4. `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts`
5. `apps/opticv-be/src/app/cv/services/cv-parser.service.ts`
6. `apps/opticv-be/src/app/cv/cv.service.ts`
7. `package.json` (root)

## Files to Modify (tests)

8. `apps/opticv-be/src/app/cv/services/cv-parser.service.spec.ts`
9. `apps/opticv-be/src/app/cv/cv.service.spec.ts`
10. `apps/opticv-be/src/app/cv/services/cv-extraction.service.spec.ts`
11. `apps/opticv-be/src/app/ai/services/openai.service.spec.ts`

No new files are created. No Prisma schema changes. No frontend changes.

---

## Step 1 — Add new model constant

**File:** `apps/opticv-be/src/app/constants.ts`

- Add `export const CV_EXTRACTION_FILE_OPENAI_MODEL = 'gpt-4o';` below the existing `CV_EXTRACTION_OPENAI_MODEL` export.
- Do not modify or remove `CV_EXTRACTION_OPENAI_MODEL` (still used by the DOCX/text path).

---

## Step 2 — Add `R2Service.download`

**File:** `apps/opticv-be/src/app/storage/r2.service.ts`

- Add method `download(key: string): Promise<Buffer>`.
- Implementation follows the exact pattern of `upload`/`delete`/`getPresignedUrl`: wrap in `try/catch`, log via `this.logger.error(error)` on failure, throw `InternalServerErrorException('File download failed.')` (message consistent with the existing style, e.g. `'File storage failed.'` / `'File deletion failed.'`).
- Inside the `try`: send a `GetObjectCommand({ Bucket: this.bucket, Key: key })` via `this.client.send(...)`, then read the returned `Body` (a Node.js `Readable` stream in the SDK's Node runtime) fully into a `Buffer` by collecting chunks and concatenating (e.g. accumulate `Buffer[]` from stream `data` events or use the stream's async iterator, then `Buffer.concat(...)`).
- No new imports needed beyond `GetObjectCommand`, which is already imported in this file.

---

## Step 3 — Add `OpenAiService.extractCvDataFromFile` and shared validation helper

**File:** `apps/opticv-be/src/app/ai/services/openai.service.ts`

- Import `CV_EXTRACTION_FILE_OPENAI_MODEL` alongside the existing `CV_EXTRACTION_OPENAI_MODEL` import.
- Extract the existing validation logic in `extractCvData` (empty-response check, `JSON.parse` try/catch, non-object check) into a new private method, e.g. `private parseExtractionResponse(content: string | null | undefined): CvStructuredData`, containing:
  - Throw `Error('OpenAI returned an empty response')` if `!content`.
  - `try { JSON.parse(content) } catch { throw new Error('OpenAI returned non-JSON content') }`.
  - Throw `Error('OpenAI returned a non-object JSON value')` if `typeof parsed !== 'object' || parsed === null`.
  - Return `parsed as CvStructuredData`.
- Update `extractCvData(text: string)` to call `this.client.chat.completions.create(...)` as today, then delegate validation to `this.parseExtractionResponse(response.choices[0]?.message?.content)` and return its result. Behavior must be unchanged.
- Add new method `extractCvDataFromFile(buffer: Buffer, fileName: string): Promise<CvStructuredData>`:
  - Log via `this.logger.log('Calling OpenAI gpt-4o for CV file extraction')` (mirrors the existing log style in `extractCvData`).
  - Encode `buffer` as inline base64: `` `data:application/pdf;base64,${buffer.toString('base64')}` `` for the `file_data` field (matches OpenAI's documented inline-file-data URI format).
  - Call `this.client.responses.create({...})` with:
    - `model: CV_EXTRACTION_FILE_OPENAI_MODEL`
    - `instructions: EXTRACTION_SYSTEM_PROMPT` (Responses API's top-level system/developer instructions field — equivalent role to the `system` chat message used in `extractCvData`)
    - `input`: a single user message item whose `content` array contains, in order: an `input_file` part (`{ type: 'input_file', file_data: <data-uri>, filename: fileName }`) and an `input_text` part (`{ type: 'input_text', text: 'Extract structured CV data as JSON.' }` — a short instruction prompting extraction, since the file itself carries no accompanying text)
    - `text: { format: { type: 'json_object' } }` to request JSON output, mirroring the `response_format: { type: 'json_object' }` behavior used in `extractCvData`.
  - Delegate validation to the shared helper: `return this.parseExtractionResponse(response.output_text);`.
  - Do not add a fallback path or hybrid logic — matches Out of Scope.

---

## Step 4 — Update `CvExtractionService.extractStructuredData` to branch on mime type

**File:** `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts`

- Inject `R2Service` in the constructor alongside `PrismaService` and `OpenAiService` (already exported by `StorageModule`, which `CvModule` already imports — confirmed, no module changes needed).
- Resulting control flow inside `extractStructuredData`, in order (clarifying spec review issue #3):
  1. Fetch `doc` via `prisma.cvDocument.findUnique`; `NotFoundException` checks unchanged (missing doc / wrong `userId`).
  2. Cache-hit check unchanged (`extractionStatus === 'COMPLETED' && structuredData !== null` → return early). This check runs identically for both mime types, before any mime branching.
  3. Mime-type branch for the `parsedText` guard: if `doc.mimeType === 'application/pdf'`, skip the `parsedText` empty check entirely. If not PDF (i.e. DOCX), keep the existing guard unchanged (`BadRequestException` when `parsedText` is missing/blank).
  4. `extractionStatus !== 'PENDING'` → set to `'PENDING'` — this status-update step is unchanged and applies identically regardless of mime type; it stays positioned after the guard check and before the extraction call, exactly as today.
  5. Inside the existing `try` block, branch on mime type to select the extraction call:
     - `application/pdf`: `const buffer = await this.r2.download(doc.storageKey); const result = await this.openAiService.extractCvDataFromFile(buffer, doc.fileName);`
     - else (DOCX): `const result = await this.openAiService.extractCvData(doc.parsedText);` (unchanged; `doc.parsedText` is guaranteed non-null here by the guard in step 3).
  6. Success path (`prisma.cvDocument.update` with `structuredData`/`COMPLETED`, logging, return) unchanged for both branches.
  7. `catch` block (log error, set `extractionStatus: 'FAILED'`, throw `BadGatewayException`) unchanged — this already covers `R2Service.download` failures (which throw `InternalServerErrorException`, caught here) and `OpenAiService.extractCvDataFromFile` failures identically to the existing DOCX error path.
- No change to the cache-hit return type or the final return type (`CvStructuredData`).

---

## Step 5 — Remove PDF branch from `CvParserService`

**File:** `apps/opticv-be/src/app/cv/services/cv-parser.service.ts`

- Remove the `application/pdf` branch (the `PDFParse` import and its usage).
- Remove the `import { PDFParse } from 'pdf-parse';` import line.
- `parse(buffer: Buffer, mimeType: string)` now only handles the DOCX mime type via `mammoth.extractRawText`, falling through to `throw new UnsupportedMimeTypeError(mimeType)` for anything else (including `application/pdf`, since `CvService.uploadCv` will no longer call `parse()` for PDFs — see Step 6 — this throw path is now unreachable for PDFs in practice but the method itself no longer special-cases them).
- `UnsupportedMimeTypeError` class stays unchanged.

---

## Step 6 — Update `CvService.uploadCv` to skip parsing for PDFs

**File:** `apps/opticv-be/src/app/cv/cv.service.ts`

- After `await this.r2.upload(storageKey, file.buffer, file.mimetype);`, branch on `file.mimetype`:
  - **PDF (`application/pdf`):** create the `CvDocument` row directly with `parsedText: null` and `parseStatus: 'COMPLETED'` in the initial `prisma.cvDocument.create` call (i.e. skip the two-step create-then-update-after-parse flow entirely for PDFs — no call to `this.cvParser.parse()`, no follow-up `prisma.cvDocument.update` for `parsedText`/`parseStatus`). Return `UploadCvResponse` with `parseStatus: 'COMPLETED'` immediately, same shape as today.
  - **DOCX:** unchanged — keep the existing flow exactly as today: create row with `parseStatus: 'PENDING'`, call `this.cvParser.parse(file.buffer, file.mimetype)`, on failure clean up (delete DB record + R2 object, throw `UnprocessableEntityException`), on success update the row with `parsedText`/`parseStatus: 'COMPLETED'`.
- The outer `try/catch` (DB-create failure → R2 cleanup → `InternalServerErrorException`) wraps both branches unchanged.
- No change to `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE`, `MIME_TO_EXT`, or any other method in this file.

---

## Step 7 — Remove `pdf-parse` dependency

**File:** `package.json` (root)

- Run `grep -r pdf-parse apps/` first to confirm no remaining references (expected: none, after Steps 5 and 9).
- Remove the `"pdf-parse": "^2.4.5"` line from `dependencies`.
- Run the workspace's package manager install step to update the lockfile (per Rules: install dependencies as part of the same change, not left dangling).

---

## Step 8 — Update `cv-parser.service.spec.ts`

**File:** `apps/opticv-be/src/app/cv/services/cv-parser.service.spec.ts`

- Remove the `jest.mock('pdf-parse', ...)` block and the `mockGetText` variable.
- Remove the `'PDF success — returns extracted text'` test case.
- Keep the DOCX success test, empty-DOCX test, and unsupported-mime-type test unchanged.
- Note: `'application/pdf'` is no longer a supported mime type at the parser level — the existing unsupported-mime-type test already covers "throws `UnsupportedMimeTypeError`" for an arbitrary unsupported type (`image/png`); no new PDF-specific unsupported-type case is required, since the spec's Acceptance section only calls for removing PDF cases, not adding a new one asserting PDF is now unsupported by the parser.

---

## Step 9 — Update `cv.service.spec.ts`

**File:** `apps/opticv-be/src/app/cv/cv.service.spec.ts`

- Update the existing test `'accepts PDF files, parses synchronously and returns UploadCvResponse with COMPLETED status'`:
  - Rename to reflect new behavior (e.g. `'accepts PDF files, skips parsing, and returns UploadCvResponse with COMPLETED status immediately'`).
  - Assert `mockPrisma.cvDocument.create` is called with `parsedText: null` and `parseStatus: 'COMPLETED'` directly (not `'PENDING'`).
  - Assert `mockPrisma.cvDocument.update` is **not** called for the PDF path (since no follow-up update is needed).
  - Assert the injected `CvParserService.parse` mock is **not** called for PDFs.
  - Keep the `result` shape assertion (`UploadCvResponse` with `parseStatus: 'COMPLETED'`) unchanged.
- Keep the `'accepts DOCX files'` test unchanged (still goes through `cvParser.parse` + update flow).
- Keep the `'storage key encodes the userId and uses the correct extension'` test unchanged (mime-agnostic).
- Re-examine `'throws UnprocessableEntityException and cleans up when parsing fails'`: this test uses `makeFile()` which defaults to `mimetype: 'application/pdf'`. Since PDFs no longer call `cvParser.parse()`, this test must be changed to use a DOCX file (`mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'`) so the parse-failure path is still exercised (parse failures are now only reachable via DOCX).
- Keep the DB-create-failure tests (`'deletes the R2 object and throws InternalServerErrorException when DB create fails'`, `'still throws InternalServerErrorException even when R2 delete also fails'`) unchanged — these fail before any mime-type branching is reached.
- Other `describe` blocks (`getUserCvs`, `getDownloadUrl`, `getStructuredData`, `deleteCv`) are unaffected — no changes needed.

---

## Step 10 — Update `cv-extraction.service.spec.ts`

**File:** `apps/opticv-be/src/app/cv/services/cv-extraction.service.spec.ts`

- Add a `mockR2Service` object with `download: jest.fn()`, and provide it via `{ provide: R2Service, useValue: mockR2Service }` in the `Test.createTestingModule` providers list (import `R2Service` from `'../../storage/r2.service'`).
- Add `extractCvDataFromFile: jest.fn().mockResolvedValue(mockStructuredData)` to `mockOpenAiService`.
- Update `makeDoc` to include a `mimeType` field, defaulting to a DOCX mime type (`'application/vnd.openxmlformats-officedocument.wordprocessingml.document'`) so all existing DOCX-path tests keep passing without per-test changes, plus a `fileName` field (e.g. `'cv.docx'`) and `storageKey` field (e.g. `'uploads/user-id/uuid.docx'') for completeness.
- Reset `mockR2Service.download` in the `jest.clearAllMocks()` / `beforeEach` block alongside existing mocks.
- Existing tests (`NotFoundException` cases, cache-hit, calls-AI-and-saves, PENDING status transitions, `BadRequestException` for missing/blank `parsedText`, `BadGatewayException` on AI failure) all continue to exercise the DOCX branch given the updated `makeDoc` default — no behavioral change expected, but assertions referencing `mockOpenAiService.extractCvData` stay as-is.
- Add new test cases for the PDF branch:
  - `'skips the parsedText check and calls extractCvDataFromFile for PDF documents'`: `makeDoc({ mimeType: 'application/pdf', parsedText: null, storageKey: 'uploads/user-id/uuid.pdf', fileName: 'cv.pdf' })`; mock `mockR2Service.download.mockResolvedValueOnce(Buffer.from('pdf bytes'))`; assert `mockR2Service.download` called with the doc's `storageKey`; assert `mockOpenAiService.extractCvDataFromFile` called with the buffer and `fileName`; assert result equals `mockStructuredData` and `prisma.cvDocument.update` is called with `structuredData`/`COMPLETED`.
  - `'sets extractionStatus to FAILED and throws BadGatewayException when R2 download fails for a PDF'`: `mockR2Service.download.mockRejectedValueOnce(new Error('R2 error'))`; assert `BadGatewayException` thrown and `extractionStatus: 'FAILED'` update call made (mirrors the existing AI-failure test).
  - `'sets extractionStatus to FAILED and throws BadGatewayException when extractCvDataFromFile fails for a PDF'`: `mockR2Service.download` resolves; `mockOpenAiService.extractCvDataFromFile.mockRejectedValueOnce(new Error('OpenAI error'))`; assert `BadGatewayException` thrown and `FAILED` status update.
  - `'does not throw BadRequestException for a PDF with null parsedText'`: confirms the guard is skipped — `makeDoc({ mimeType: 'application/pdf', parsedText: null, ... })` with successful mocks resolves without throwing `BadRequestException`.

---

## Step 11 — Update `openai.service.spec.ts`

**File:** `apps/opticv-be/src/app/ai/services/openai.service.spec.ts`

- Add a `mockResponsesCreate = jest.fn()` and extend `mockOpenAIClient` with `responses: { create: mockResponsesCreate }` alongside the existing `chat.completions.create` mock.
- Add a `describe('extractCvDataFromFile', ...)` block, mirroring the structure of the existing `describe('generateCompletion', ...)` block:
  - Helper `makeResponsesResult = (outputText: string) => ({ output_text: outputText })`.
  - `'calls responses.create with the file as input_file and requests json_object format'`: mock `mockResponsesCreate.mockResolvedValue(makeResponsesResult('{"contact":{}}'))`; call `service.extractCvDataFromFile(Buffer.from('pdf bytes'), 'cv.pdf')`; assert `mockResponsesCreate` was called with an object containing `model: 'gpt-4o'`, `text: { format: { type: 'json_object' } }`, and an `input` array whose message content includes an object with `type: 'input_file'` and `filename: 'cv.pdf'`.
  - `'returns parsed JSON object on success'`: asserts the resolved value equals the parsed JSON.
  - `'throws when OpenAI returns an empty output_text'`: `mockResponsesCreate.mockResolvedValue({ output_text: '' })` (or `null`) → expect rejection with `'OpenAI returned an empty response'`.
  - `'throws when OpenAI returns non-JSON content'`: `mockResponsesCreate.mockResolvedValue(makeResponsesResult('not json'))` → expect rejection with `'OpenAI returned non-JSON content'`.
  - `'throws when OpenAI returns a non-object JSON value'`: `mockResponsesCreate.mockResolvedValue(makeResponsesResult('"just a string"'))` → expect rejection with `'OpenAI returned a non-object JSON value'`.
- Existing `generateCompletion` tests are unaffected (no changes needed) — they exercise `chat.completions.create`, unrelated to this new method. If a shared-helper refactor of `extractCvData` changes its call surface, confirm no existing `extractCvData` tests exist in this spec file to update (none present today — `extractCvData` currently has no dedicated test block in this file); if a hidden `extractCvData` describe block is found during implementation, verify its assertions still pass unchanged since the extraction/validation behavior is preserved by the shared helper.

---

## Verification Checklist

- `npm exec nx test opticv-be` passes.
- `npm exec nx typecheck opticv-be` passes.
- `grep -r pdf-parse apps/` returns no results after Steps 5, 8 (before removing the dependency in Step 7).
- Manual check per spec Acceptance: upload a multi-column PDF CV, run `POST /cv/:id/extract`, confirm correctly ordered structured data; upload a DOCX and confirm unchanged behavior (parsedText populated, `gpt-4o-mini` path).
- No changes to `POST /cv/:id/extract` response shape.
