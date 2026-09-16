# Code Review — Task 9-cv-file-parsing

## Summary

- **Overall result: PASS WITH ISSUES**
- The implementation is well-structured and covers all spec requirements as scoped by the implementation plan. The plan deliberately changed the parsing strategy from fire-and-forget async (spec) to synchronous blocking (plan), and the code faithfully implements the plan. One critical bug exists in `cv-parser.service.ts` where the `PDFParse` constructor receives `{ data: new Uint8Array(buffer) }` but the correct `LoadParameters` field for binary data is `data` (a `Uint8Array` directly inside `DocumentInitParameters`, not a top-level `LoadParameters` field), which may cause the constructor to silently ignore the buffer and attempt a URL-based load — this needs verification. Additionally, there are accessibility gaps in the `upload-cv.html` template and a minor spec deviation in the `CvParserService` mock pattern.

---

## Conventions Violations

### Critical (must fix before merge)

**1. `cv-parser.service.ts` — line 16: Possible incorrect `PDFParse` constructor argument shape**

The code passes `{ data: new Uint8Array(buffer) }` to `new PDFParse(...)`. According to the `pdf-parse@2.4.5` type definitions, `LoadParameters` extends `DocumentInitParameters` from `pdfjs-dist`. The `data` field is defined on `DocumentInitParameters`, not as a direct field of the object shape shown in the call. The library JSDoc states "Converts Node.js Buffer data to Uint8Array automatically", implying a `Buffer` can be passed directly as `data`. Verify that the constructor accepts `{ data: Uint8Array }` and does not require `data` to be nested differently. If the buffer is silently ignored, PDF parsing will fail for all uploads or throw an unrecoverable error.

**Recommended fix:** Test against a real PDF buffer in dev. If parsing fails, change to the correct parameter form (e.g. `new PDFParse({ data: buffer })` passing the raw Buffer which the library auto-converts, per JSDoc).

---

**2. `upload-cv.html` — line 32: Parse success message is hard-coded; does not reflect actual parse failure path**

After a successful upload, the template shows: `"CV uploaded and parsed successfully."` — but the `UploadCvResponse` carries `parseStatus` (always `'COMPLETED'` on success since parse is synchronous). If a parse fails, the backend returns HTTP 422 which the component already surfaces as a toast error — so this confirmation section only appears on success. However, the message is accurate only coincidentally. If the implementation ever reverts to async parsing, this message will mislead users. More importantly, the spec's frontend plan specifies: "Add 'Parsing in progress…' note in post-upload confirmation" (Plan §Frontend 4, file plan line ~173). The current message says "parsed successfully" instead of indicating that parsing is complete. This is acceptable given the synchronous approach but should be noted.

This is a borderline issue. Keeping it as is is acceptable for the synchronous plan, but the label "CV uploaded and parsed successfully." is hard-coded rather than being driven by `uploadedFile().parseStatus`. If the plan intent was to show status from the response, consider binding it. Not blocking if intentional.

---

### Non-Critical (should fix)

**3. `cv-parser.service.spec.ts` — import ordering: `jest.mock` hoisting with post-hoist `import`**

Lines 4–8: `jest.mock('pdf-parse', ...)` is called before `import * as mammoth from 'mammoth'` (line 9). While Jest hoists `jest.mock()` calls to the top of the file, the `import * as mammoth` statement appearing after the mock block is a code smell that makes the hoisting order non-obvious to readers. Convention: place all imports at the top, then call `jest.mock(...)` — or use `vi.mock` patterns consistently (the frontend uses `vi` but the backend uses `jest`, which is correct for their respective test runners).

**4. `cv.service.ts` — line 79: Template literal string interpolation for error logging**

`this.logger.error(\`Failed to parse CV document ${doc.id}: ${parseError}\`)` — when `parseError` is an `Error` object, `${parseError}` calls `.toString()` which gives `Error: message` but loses the stack trace. Prefer: `this.logger.error('Failed to parse CV document', parseError)` or `this.logger.error(parseError instanceof Error ? parseError.message : String(parseError))`.

**5. `cv.service.ts` — line 80–85: Chained `.catch()` on `prisma.cvDocument.delete` and `r2.delete` during cleanup**

The cleanup calls `.catch()` and swallow the error (only log). This is the correct intent (per plan error-handling matrix) but the pattern is verbose. Using `void promise.catch(...)` would make the fire-and-forget intent explicit in TypeScript. No functional issue.

**6. `upload-cv.html` — line 6–8: `text-green-600` class alongside `text-surface-400`**

`<p class="mb-10 text-sm text-surface-400 font-semibold text-green-600">` — two conflicting text colour classes (`text-surface-400` and `text-green-600`) are applied. In Tailwind CSS 4, the last one wins in specificity only if they share the same property. `text-surface-400` is a CSS custom-property-based colour while `text-green-600` is a direct colour class. The rendered result is likely green, making `text-surface-400` dead code. This is a pre-existing issue (not introduced in this task's diff) but appears in a modified file.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Install `pdf-parse` and `mammoth` libraries | Covered | Both in `package.json` dependencies |
| `CvParserService.parse(buffer, mimeType)` | Covered | `cv-parser.service.ts` |
| Parse PDF files using `pdf-parse` | Covered | Lines 15–19 `cv-parser.service.ts` |
| Parse DOCX files using `mammoth` | Covered | Lines 21–27 `cv-parser.service.ts` |
| Throw `UnsupportedMimeTypeError` for unknown MIME | Covered | Line 29 `cv-parser.service.ts` |
| `ParseStatus` enum in Prisma schema | Covered | `schema.prisma` lines 46–50 |
| `parseStatus` field on `CvDocument` with `@default(PENDING)` | Covered | `schema.prisma` line 107 |
| Migration SQL | Covered | `migration.sql` |
| `parseStatus` in shared datatypes `UploadCvResponse` | Covered | `datatypes.ts` line 27–30 |
| `parseStatus` in shared datatypes `CvDocumentListItem` | Covered | `datatypes.ts` line 32–35 |
| `ParseStatus` type exported from `@opticv/datatypes` | Covered | `datatypes.ts` line 1 |
| `CvParserService` registered in `CvModule.providers` | Covered | `cv.module.ts` line 12 |
| `CvService.uploadCv` — create record with `parseStatus: PENDING` | Covered | `cv.service.ts` line 69 |
| On parse success: update `parsedText` and `parseStatus: COMPLETED` | Covered | `cv.service.ts` lines 91–94 |
| On parse failure: clean up DB record and R2 object, throw 422 | Covered | `cv.service.ts` lines 78–88 |
| Log parse failure error | Covered | `cv.service.ts` line 79 |
| `getUserCvs` returns `parseStatus` per item | Covered | `cv.service.ts` line 132 |
| Unit tests: PDF success, DOCX success, unsupported MIME, empty DOCX | Covered | `cv-parser.service.spec.ts` 4 test cases |
| Frontend: `@switch (file().parseStatus)` in `CvFileListItem` template | Covered | `cv-file-list-item.html` lines 12–26 |
| Frontend: PENDING status shows spinner icon + "Parsing…" | Covered | `cv-file-list-item.html` lines 13–16 |
| Frontend: COMPLETED status shows check icon + "Parsed" | Covered | `cv-file-list-item.html` lines 17–20 |
| Frontend: FAILED status shows warning icon + "Parsing failed" | Covered | `cv-file-list-item.html` lines 21–24 |
| Accessible labels for status indicators (WCAG AA) | Partial | Icons have `aria-hidden="true"` ✓; adjacent `<span>` provides visible text label ✓. However the outer `<span>` wrapping the status block has no `role` or `aria-label`. Status text is visually present but not semantically marked as a status region. Acceptable for AA but not ideal. |
| Frontend spec fixture updates (all 4 spec files) | Covered | All 4 spec files updated with `parseStatus` in mock fixtures |
| Spec deviation — async fire-and-forget (spec) vs synchronous parse (plan) | Partial | Plan intentionally changed to synchronous. No `parseStatus: PENDING` is ever returned to the client on success; all successful uploads return `COMPLETED`. This satisfies the spec's acceptance criteria (upload a PDF → DB has `COMPLETED`) even though the behavioral flow differs. |
| `PENDING` state as degraded state (spec §Edge Cases — DB update fails) | Missing | The plan changed this: parse failures now result in record deletion, not `FAILED` status. The spec's degraded-state scenario (DB update fails after parse, record remains `PENDING`) does not apply to the synchronous implementation. Not a bug — the plan explicitly supersedes this. |
| Empty DOCX treated as `COMPLETED` with `parsedText: ''` | Covered | `mammoth.extractRawText` returns `{ value: '' }` → returned as `''` → `parseStatus: COMPLETED` via `cv.service.ts` update path |
| Corrupted/password-protected PDF: `parseStatus: FAILED` | Not covered per plan | Plan changes behavior: parse failure → 422 + record deleted (no `FAILED` status persisted). Spec said set `FAILED` but plan supersedes. |

---

## Plan Deviations

**1. Parsing strategy changed from async fire-and-forget (spec) to synchronous blocking (plan)**

The spec (§Behavior steps 3–6) describes: upload response returned immediately with `PENDING`; background task updates DB to `COMPLETED` or `FAILED`. The implementation plan explicitly changed this to synchronous: parse runs before returning the response; success returns `COMPLETED`; failure deletes the record and returns HTTP 422. The code implements the plan correctly. This is a deliberate accepted deviation.

**2. `FAILED` parse status is never written to the DB**

Per the implementation plan error-handling matrix, parse failure → record deleted + HTTP 422. The `ParseStatus.FAILED` enum value exists in the Prisma schema and shared types but is never set during the upload flow. It is referenced only in the frontend template (dead render path for uploads via the current API) and the `CvDocumentListItem` type. This is not a bug — the plan intended it — but the `FAILED` enum value and frontend FAILED case are effectively unreachable given the current API behavior.

**3. `cv.service.ts` — `parseStatus: 'PENDING'` string literal used instead of Prisma enum value**

Lines 69 and 93: `parseStatus: 'PENDING'` / `parseStatus: 'COMPLETED'` use plain string literals. Prisma 7's generated client accepts the string values for enum fields (TypeScript types enforce correctness), so this is not a functional bug. However, if the project ever imports the Prisma-generated `ParseStatus` enum object, these literals would be inconsistent. Minor style issue.

---

## Null Safety Issues

**1. `cv.service.ts` — line 75: `parsedText` declared as `let` without initialisation; used after potentially-skipped assignment**

```ts
let parsedText: string;
try {
  parsedText = await this.cvParser.parse(file.buffer, file.mimetype);
} catch (parseError) {
  // ... throws UnprocessableEntityException
}
// parsedText used here on line 91
await this.prisma.cvDocument.update({ data: { parsedText, parseStatus: 'COMPLETED' } });
```

TypeScript should flag `parsedText` as "used before assignment" if the catch block does not always rethrow. However, since the catch block always throws `UnprocessableEntityException`, TypeScript's control-flow analysis should correctly narrow that `parsedText` is always assigned at line 91. Verify `tsc` / `nx typecheck` passes — if it does, no issue. If the catch block were ever changed to not rethrow, this would become a runtime bug.

**2. None** — other nullable fields (`parsedText: null` in DB, `uploadedFile()` in frontend) are guarded correctly with optional chaining or `@if` blocks.

---

## Code Smells

**1. `cv-parser.service.spec.ts` — `mockGetText` defined outside `describe` / `beforeEach`, shared across tests**

`const mockGetText = jest.fn()` is defined at module scope (line 3) and cleared via `jest.clearAllMocks()` in `beforeEach`. This works but couples the mock lifetime to module scope rather than test scope. Low severity — `clearAllMocks` mitigates contamination risk.

**2. `cv.service.ts` — nested try/catch adds cognitive complexity**

The outer `try` (line 60) wraps the inner `try` (line 76). This is necessary to handle DB create failures separately from parse failures, but the structure requires careful reading to understand which catch handles which error. A comment on the inner try block's intent would help future maintainers (but conventions say avoid obvious comments — so leave as-is unless complexity grows).

**3. `upload-cv.html` — post-upload success section always shows "CV uploaded and parsed successfully." regardless of `parseStatus`**

Since parse is synchronous and only `COMPLETED` reaches this path, the message is correct. But it is not driven by data — it is a hard-coded assumption. If parse behavior changes, the UI message will be stale. Consider: `{{ uploadedFile()!.parseStatus === 'COMPLETED' ? 'CV uploaded and parsed successfully.' : '…' }}` or bind to a computed property. Low priority given the current synchronous implementation.

---

## Recommendation

**Fix critical issues before merge**

Specifically: verify that `new PDFParse({ data: new Uint8Array(buffer) })` correctly parses a real PDF buffer with the `pdf-parse@2.4.5` API (run the backend tests against a real PDF, or add an integration smoke test). If the constructor call is wrong, the PDF parsing path is broken at runtime even though the mock-based unit tests pass. All other issues are non-critical style or minor accessibility items.
