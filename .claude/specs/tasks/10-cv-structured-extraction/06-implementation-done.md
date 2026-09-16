# Implementation Done

## Task: 10 — CV Structured Extraction
## Date: 2026-05-15

---

### Summary

Backend-only delivery. A structured CV extraction pipeline was implemented on top of the existing `CvDocument` / `parsedText` data. A new `POST /api/cv/:id/extract` endpoint orchestrates a cache-or-extract flow: returning stored `structuredData` on cache hit, or calling OpenAI `gpt-4o-mini` (via an abstract provider interface) to produce a `CvStructuredData` JSON object and persist it. Prisma schema, shared datatypes, environment config, and DI wiring are all updated. Unit tests were added for the new service, the OpenAI adapter, and the controller.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `ExtractionStatus` union type added to `@opticv/datatypes` | Implemented | |
| `CvStructuredData` interface added to `@opticv/datatypes` | Implemented | Array fields typed as non-arrays — see code review |
| `CvDocument` shared type updated with `structuredData` and `extractionStatus` | Implemented | |
| Prisma `ExtractionStatus` enum added | Implemented | |
| Prisma `structuredData Json?` column added | Implemented | Migration adds JSONB |
| Prisma `extractionStatus ExtractionStatus @default(PENDING)` added | Implemented | |
| Prisma migration created and applied | Implemented | `20260515163718_add_extraction_status_and_structured_data` |
| `OPENAI_API_KEY` added to `development.env` | Implemented | |
| `OPENAI_API_KEY` added to `production.env` | Implemented | |
| `OPENAI_API_KEY` added to `config/validation.ts` Joi schema | Implemented | Not in spec; resolved via implementation plan |
| `AiExtractionProvider` abstract class created | Implemented | |
| `AI_EXTRACTION_PROVIDER` string injection token created | Implemented | Not in spec; resolved via implementation plan |
| `OpenAiExtractionService` implementing `AiExtractionProvider` | Implemented | |
| Uses model `gpt-4o-mini` | Implemented | |
| Uses `response_format: { type: 'json_object' }` | Implemented | |
| JSON parse + non-object validation + throws on failure | Implemented | |
| `CvExtractionService` with `extractStructuredData(cvId, userId)` | Implemented | |
| 404 when CV not found | Implemented | Same 404 message regardless of reason |
| 404 when CV belongs to another user | Implemented | |
| 200 cache hit when `COMPLETED` and `structuredData` not null | Implemented | |
| 400 when `parsedText` null or empty string | Implemented | Exact message from spec |
| Write `PENDING` only when status is not already `PENDING` | Implemented | |
| 502 on AI provider failure | Implemented | |
| Set `extractionStatus = 'FAILED'` on AI failure | Implemented | |
| `POST /api/cv/:id/extract` route added to `CvController` | Implemented | |
| `@HttpCode(HttpStatus.OK)` on extract endpoint | Implemented | |
| Response shape `{ data: CvStructuredData }` | Implemented | |
| `SupabaseGuard` applied | Implemented | Controller-level, covers all routes |
| `CvExtractionService` registered in `CvModule` | Implemented | |
| `OpenAiExtractionService` registered via `AI_EXTRACTION_PROVIDER` token | Implemented | |
| `ConfigModule` imported in `CvModule` | Implemented | |
| `openai` npm package installed | Implemented | |
| Frontend page / UI | Not implemented | Out of scope |
| Anthropic or Gemini provider implementations | Not implemented | Out of scope |
| Batch extraction | Not implemented | Out of scope |
| Automatic extraction on upload | Not implemented | Out of scope |
| Re-extraction / cache invalidation | Not implemented | Out of scope |

---

### Files

#### Created

| Path | Purpose |
|---|---|
| `apps/opticv-be/src/app/cv/ai/ai-extraction.token.ts` | NestJS injection token constant `AI_EXTRACTION_PROVIDER` |
| `apps/opticv-be/src/app/cv/ai/ai-extraction.provider.ts` | Abstract class `AiExtractionProvider` |
| `apps/opticv-be/src/app/cv/ai/extraction-prompt.ts` | `EXTRACTION_SYSTEM_PROMPT` constant |
| `apps/opticv-be/src/app/cv/ai/openai-extraction.service.ts` | `OpenAiExtractionService` — OpenAI `gpt-4o-mini` adapter |
| `apps/opticv-be/src/app/cv/ai/openai-extraction.service.spec.ts` | Unit tests for `OpenAiExtractionService` |
| `apps/opticv-be/src/app/cv/cv-extraction.service.ts` | `CvExtractionService` — orchestration |
| `apps/opticv-be/src/app/cv/cv-extraction.service.spec.ts` | Unit tests for `CvExtractionService` |
| `apps/opticv-be/prisma/migrations/20260515163718_add_extraction_status_and_structured_data/migration.sql` | Prisma migration SQL |

#### Modified

| Path | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added `ExtractionStatus`, `CvStructuredData`, and sub-types; updated `CvDocument` type |
| `apps/opticv-be/prisma/schema.prisma` | Added `ExtractionStatus` enum; added `structuredData` and `extractionStatus` fields to `CvDocument` |
| `apps/opticv-be/config/validation.ts` | Added `OPENAI_API_KEY: Joi.string().required()` |
| `apps/opticv-be/src/app/constants.ts` | Added `CV_EXTRACTION_OPENAI_MODEL` constant |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | Added `POST :id/extract` route; injected `CvExtractionService` |
| `apps/opticv-be/src/app/cv/cv.controller.spec.ts` | Added `extractCv` test cases |
| `apps/opticv-be/src/app/cv/cv.module.ts` | Registered `CvExtractionService` and `AI_EXTRACTION_PROVIDER` provider; imported `ConfigModule` |
| `apps/opticv-be/tsconfig.spec.json` | Added `"multer"` to types array |
| `package.json` | Added `openai` dependency |
| `package-lock.json` | Updated lockfile |

---

### Components

This task is backend-only. No frontend components were planned or implemented.

| Component | Status |
|---|---|
| `AiExtractionProvider` abstract class | Exist |
| `AI_EXTRACTION_PROVIDER` token | Exist |
| `OpenAiExtractionService` | Exist |
| `CvExtractionService` | Exist |
| `POST /api/cv/:id/extract` endpoint | Exist |

---

### Stores

No stores were planned or implemented for this task.

None.

---

### Deviations

1. **`extraction-prompt.ts` is a new separate file** — not listed in the implementation plan. The plan described the system prompt as content within `OpenAiExtractionService`. The prompt was extracted to a dedicated constant file `ai/extraction-prompt.ts`.

2. **`apps/opticv-be/src/app/constants.ts` is a new file** — not listed in the plan. The plan implied the model string `'gpt-4o-mini'` would be hardcoded inline in `OpenAiExtractionService`. A named constant `CV_EXTRACTION_OPENAI_MODEL` was placed in a shared constants file instead.

3. **`apps/opticv-be/tsconfig.spec.json` modified** — not listed in the plan. The `"multer"` type was added to the types array.

---

### Additional Implementation

- `apps/opticv-be/src/app/cv/cv.controller.spec.ts` — controller tests for `extractCv` were added in a separate commit alongside `openai-extraction.service.spec.ts` and `cv-extraction.service.spec.ts`. Unit tests were not listed as deliverables in the plan but are present.
- `apps/opticv-be/src/app/constants.ts` — a general constants file created to hold `CV_EXTRACTION_OPENAI_MODEL`; may serve as a home for future backend constants.
