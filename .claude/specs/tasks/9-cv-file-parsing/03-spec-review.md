# Specification Review

## Task: 9-cv-file-parsing
## Reviewer: Claude Code (automated)
## Date: 2026-05-14

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, covers the core requirement (parse PDF/DOCX on upload, store in `parsedText`), and correctly captures clarification answers (async, failure-tolerant, per-upload). Two non-critical issues exist: one ambiguity in how an empty-string parse result is treated relative to a failed parse (they produce the same `parsedText: null`/`''` states but opposite `parseStatus` values — this distinction needs to be clear to implementors), and one gap around what `CvParserService.parse` should return for an empty DOCX vs. throw. No invented requirements were found.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Empty DOCX ambiguity (Edge Cases section):** The spec states empty DOCX returns `parsedText: ''` with `parseStatus: COMPLETED`. However, the `CvParserService` signature (`Promise<string>`) says it "throws on unrecoverable parse error". It is unclear whether an empty string return is treated as success by the caller or whether the caller should additionally validate the returned string before deciding on `parseStatus`. If `CvService` does not validate the returned string, a truly empty document will be stored as `COMPLETED` with `parsedText: ''`, which may later confuse AI consumers that expect non-empty text. The spec should explicitly state whether a minimum-length check (e.g. > 0 chars) is applied by `CvService` before writing `COMPLETED`.

2. **"Parse failure path" triggers on `null` return:** Behavior step 6 says `CvParserService` "throws or returns empty/null". The signature declares `Promise<string>` (not `Promise<string | null>`), so returning `null` would be a TypeScript type violation. The spec should pick one failure contract: either the service always throws on failure (and the caller catches), or it returns `string | null` and the caller checks. The current mix is ambiguous for the implementor.

3. **`parsedText` field exposed in `CvDocumentListItem`:** The existing `getUserCvs` query (confirmed in code) already selects `parsedText`. Returning the full parsed text in a list response could be a large payload for documents with many pages. The spec does not address this. It may be intentional (needed for AI features), but it warrants an explicit note.

4. **No acceptance criterion for `parseStatus: PENDING` state visibility:** The acceptance criteria cover `COMPLETED` and `FAILED` but not the transient `PENDING` state. A criterion such as "immediately after upload response, `GET /api/cv` returns the new document with `parseStatus: PENDING`" would make the async behavior verifiable.

#### Unclear or Ambiguous Sections

- **Behavior step 6 — "throws or returns empty/null":** Contradicts the `Promise<string>` return type. See Non-Critical Issue #2 above.
- **Edge Cases — "Empty DOCX":** The outcome (`COMPLETED`, `parsedText: ''`) is stated, but it is not clear whether `CvService` or `CvParserService` is responsible for deciding this is not a failure. See Non-Critical Issue #1 above.

#### Invented or Unsupported Requirements

None. All requirements (`parseStatus` enum, async flow, failure tolerance, library choices, shared-type updates) are grounded in the raw task or the recorded clarification answers.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | Parsing runs in-process with no worker threads or queues | Yes (Assumptions section + Out of scope) |
| 2 | `PENDING` as a permanent state (server crash mid-flight) is acceptable without a retry mechanism | Yes (Assumptions section) |
| 3 | The frontend is responsible for showing parse state; no WebSocket/push needed | Yes (Assumptions section) |
| 4 | Empty string (`''`) from mammoth is valid parsed output, not a failure | Partially — stated in Edge Cases but the decision rationale is not given |
| 5 | `pdf-parse` is sufficient for PDF extraction (no pdfjs-dist fallback) | Implicit — pdfjs-dist is listed as out of scope but the assumption that pdf-parse alone covers the use case is not stated |
| 6 | The file buffer is still available in memory when the background task runs (multer `memoryStorage`) | Not stated — this is a hidden dependency on the upload interceptor configuration |
| 7 | `parsedText: ''` (empty string) and `parsedText: null` are treated as meaningfully different states downstream | Implicit — the spec distinguishes them but does not explain the consumer impact |

---

### Recommendation

**Revise specification** — address Non-Critical Issues #1 and #2 (empty-string vs. failure contract and `Promise<string>` vs. `string | null`) and add the hidden Assumption #6 (buffer availability) to the Assumptions section. These are small, targeted edits; the overall spec is otherwise ready for implementation planning.
