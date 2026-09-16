### Summary

- Overall result: PASS WITH ISSUES
- Implementation matches the specification and plan closely: `pdf-parse` is fully removed, PDFs bypass parsing at upload time, `R2Service.download` and `OpenAiService.extractCvDataFromFile` are implemented per the confirmed Responses API shape, and `CvExtractionService` branches on `mimeType` as specified. Only minor, non-critical style issues were found — no correctness, null-safety, or spec-coverage defects.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

- `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts:19` — `openAiService` is declared `readonly` without `private`, while the adjacent constructor params (`private readonly prisma`, `private readonly r2`) are both `private readonly`. Inconsistent visibility on sibling dependencies in the same constructor; should be `private readonly openAiService` for consistency (conventions.md service conventions imply consistent encapsulation).
- `apps/opticv-be/src/app/cv/cv.service.ts:78-86` and `:134-142` — the `UploadCvResponse` object literal is duplicated verbatim between the PDF branch's early return and the shared DOCX-path return. This is a code-duplication smell (rules.md "High quality" / conventions favor DRY); could be a small local helper or shared variable, though the plan (Step 6) did not explicitly call for de-duplication so this is non-critical.

### Specification Coverage

| Requirement | Status | Note |
| ----------- | ------ | ---- |
| Stop running `pdf-parse` on PDF uploads; DOCX unchanged | Covered | `cv-parser.service.ts` only handles DOCX; PDF branch removed |
| PDF `CvDocument` created with `parsedText: null`, `parseStatus: 'COMPLETED'` at upload, no parse call | Covered | `cv.service.ts:63-87`, verified by `cv.service.spec.ts:101-139` (asserts `update` and `parse` not called) |
| `R2Service.download(key)` added | Covered | `r2.service.ts:70-85`, matches `upload`/`delete` try/catch + `InternalServerErrorException` pattern |
| `OpenAiService.extractCvDataFromFile(buffer, fileName)` via Responses API with `input_file`/`file_data` | Covered | `openai.service.ts:37-68` |
| `CvExtractionService` branches on `doc.mimeType`; PDF skips `parsedText` check | Covered | `cv-extraction.service.ts:42-63` |
| PDF path uses `gpt-4o`; DOCX path keeps `gpt-4o-mini` | Covered | `constants.ts`, `openai.service.ts:26,46` |
| Remove `pdf-parse` PDF branch from `CvParserService`; remove dependency from `package.json` | Covered | No `pdf-parse` references found in `apps/` or `package.json` (grep confirmed) |
| Shared validation helper to avoid duplication between text/file paths | Covered | `parseExtractionResponse` in `openai.service.ts:70-89`, used by both `extractCvData` and `extractCvDataFromFile` |
| Backend unit tests updated for all touched services | Covered | `cv-parser.service.spec.ts`, `cv.service.spec.ts`, `cv-extraction.service.spec.ts`, `openai.service.spec.ts`, `r2.service.spec.ts` all updated with matching new cases |
| No breaking change to `POST /cv/:id/extract` response shape | Covered | Return type still `CvStructuredData` in both branches |
| Edge case: R2 download failure → `FAILED` + `BadGatewayException` | Covered | `cv-extraction.service.spec.ts:231-244` |
| Edge case: model extraction failure for PDF → `FAILED` + `BadGatewayException` | Covered | `cv-extraction.service.spec.ts:246-262` |

### Plan Deviations

None. All 11 implementation steps were followed as written, including the exact control-flow ordering specified in Step 4 and the shared-helper extraction specified in Step 3.

### Null Safety Issues

None. `CvDocument.fileName`, `storageKey`, and `mimeType` are non-nullable in the Prisma schema, so the PDF branch's use of `doc.fileName`/`doc.storageKey` in `cv-extraction.service.ts:59-61` requires no additional guarding. The DOCX branch's `doc.parsedText as string` cast at line 63 is safe because the preceding guard (lines 44-48) already ensures non-empty `parsedText` for non-PDF documents.

### Code Smells

- Minor duplication of the `UploadCvResponse` return object in `cv.service.ts` (see Non-Critical above) — same shape constructed twice instead of factored once.
- `openai.service.ts:43` hardcodes the `data:application/pdf;base64,` MIME prefix inside `extractCvDataFromFile`, which is fine given the spec restricts this method to PDF-only callers, but ties the method name/signature (`fileName` param, generic-sounding) to a PDF-only assumption not otherwise enforced by a type constraint. Not a defect — matches spec exactly — noting only as a soft coupling for future maintainers.

### Recommendation

- Merge as-is
