# Specification Review

## Task: 10 — CV Structured Extraction
## Spec file: 02-spec.md
## Reviewer: Claude Code (review-spec workflow)

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-structured, covers all requirements from the raw task, and adds appropriate detail for implementation. However, three non-critical issues exist: the `extractionStatus` default value in Prisma is debatable (PENDING vs no default), the behavior description for step 5 (setting PENDING) is slightly contradictory, and the spec does not mention that `OPENAI_API_KEY` must also be added to `config/validation.ts` (only env files are mentioned). No invented requirements were found.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Step 5 contradicts itself** (`Behavior` section): Step 5 states "Set `extractionStatus = 'PENDING'` on the record (or leave as-is if already PENDING on first run)." The parenthetical is contradictory — on the very first run the status will be `PENDING` by default (from the Prisma default), so "or leave as-is if already PENDING on first run" implies no DB write is needed, yet the preceding clause says to set it. The spec should clarify: only write `PENDING` if the status is not already `PENDING`, or always write it unconditionally (idempotent upsert). The ambiguity could cause an unnecessary DB round-trip or confusion in implementation.

2. **`OPENAI_API_KEY` validation not mentioned in `config/validation.ts`**: The spec says to add the key to `development.env` and `production.env` but does not say to add a Joi rule for it in `config/validation.ts`. Every other env var in this project is validated there. This is an implicit gap that should be explicit.

3. **No mention of how `CvExtractionService` is injected with the provider**: The spec lists `OpenAiExtractionService` as implementing `AiExtractionProvider` and says to register both in `cv.module.ts`, but does not specify how the abstraction is wired — e.g., whether an injection token (`AI_EXTRACTION_PROVIDER`) is used, or if `CvExtractionService` directly depends on `OpenAiExtractionService`. This matters for the "swappable provider" goal and should be stated.

4. **`CvDocument` shared type not updated**: The spec adds `structuredData` and `extractionStatus` to the Prisma `CvDocument` model, but does not mention updating the `CvDocument` type in `packages/shared/datatypes/src/lib/datatypes.ts` to include these new fields. The raw task implies the result is persisted and visible; omitting the shared type update leaves the frontend type stale.

#### Unclear or Ambiguous Sections

- **`Behavior` step 4**: "If `extractionStatus === 'FAILED'` or `'PENDING'` or `structuredData` is null, proceed to extract." — The condition `extractionStatus === 'PENDING'` means a concurrent in-flight extraction would re-trigger extraction. The spec acknowledges this under Edge Cases ("optimistic guard") but the Behavior step itself doesn't mention this caveat; a developer reading just the Behavior section could implement a stricter guard. Minor inconsistency between sections.

- **Response shape for cache hit vs. fresh extraction**: The spec states response 200 is `{ data: CvStructuredData }` in both cases. This is clear, but it would be helpful to explicitly confirm the HTTP status code is the same (200) for both paths, since some APIs use 201 for newly computed results. Worth one line of clarification.

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|------------|---------------------------|
| 1 | The `openai` npm package is not already installed and must be added. | Yes — "Install `openai` npm package (if not already present)" |
| 2 | Auth is validated via `SupabaseGuard`, the same guard used by all existing CV endpoints. | Yes |
| 3 | Ownership check follows the same pattern as `deleteCv` and `getDownloadUrl` (404 if not found or wrong user). | Yes |
| 4 | Extraction is synchronous within the HTTP request (no background job/queue). | Yes, implied by "synchronous within the request" in Edge Cases |
| 5 | No re-extraction / cache invalidation is needed now. | Yes — listed in Out of Scope |
| 6 | `gpt-4o-mini` with JSON mode is sufficient for reliable structured extraction. | Implicit — JSON mode reduces but does not eliminate malformed output risk; spec handles it as a 502 case |
| 7 | `OPENAI_API_KEY` should be validated in `config/validation.ts` alongside other env vars. | Not stated — implicit assumption based on project convention |
| 8 | The `CvDocument` shared type will need updating to include `structuredData` and `extractionStatus`. | Not stated — implicit gap |
| 9 | The abstract provider interface will use a NestJS injection token to allow swapping. | Not stated — implementation detail left unspecified |

---

### Recommendation

**Revise specification** — address the following before implementation begins:

1. Clarify step 5 of Behavior (when/whether to write PENDING to DB).
2. Add `OPENAI_API_KEY` to the Joi validation schema (`config/validation.ts`) in the Modified files table.
3. Specify how `AiExtractionProvider` is wired in NestJS (injection token vs. direct dependency).
4. Add updating `CvDocument` shared type (in `datatypes.ts`) to the Modified files table.
