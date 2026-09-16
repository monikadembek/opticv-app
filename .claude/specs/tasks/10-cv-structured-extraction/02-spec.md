# Task Specification

## Source

Azure DevOps Task: 10 — CV Structured Extraction

## Goal

Extract structured CV sections from the existing `parsedText` field on `CvDocument` using an AI model (initially OpenAI `gpt-4o-mini`). Store the result as a JSON column (`structuredData`) on `CvDocument`. Add an `extractionStatus` enum to track the state of extraction. Expose a dedicated backend endpoint `POST /api/cv/:id/extract` that returns cached structured data if already extracted, or triggers a fresh extraction.

Design the AI provider layer with an abstract interface so Anthropic or Google Gemini can be swapped in later.

## Context

The CV upload + text parsing flow is complete (task 9). `CvDocument` has `parsedText` (plain text) and `parseStatus` (COMPLETED after upload). Before AI-powered optimization prompts can run, the plain text must be mapped to a strongly-typed structured schema. This extraction happens on-demand when the user enters the future "optimization-cv" page and selects a CV from a dropdown. The frontend page is not yet implemented; only the backend is in scope for this task.

## Scope

### In scope

- Prisma schema: add `extractionStatus` enum and `structuredData Json?` column to `CvDocument`
- Shared datatypes: add `ExtractionStatus` union type and `CvStructuredData` interface to `@opticv/datatypes`
- Backend abstract provider interface: `AiExtractionProvider` with a single `extract(text: string): Promise<CvStructuredData>` method
- Backend `OpenAiExtractionService` implementing `AiExtractionProvider` using `gpt-4o-mini`
- Backend `CvExtractionService` orchestrating the cache-or-extract logic
- `POST /api/cv/:id/extract` endpoint on the existing `CvController`
- Prisma migration

### Out of scope

- Frontend page / UI (future task)
- Anthropic or Gemini provider implementations (architecture is prepared, not implemented)
- Batch extraction
- Automatic extraction on upload
- Re-extraction / cache invalidation (not needed now)

## Behavior

1. Client calls `POST /api/cv/:id/extract` with a valid auth token.
2. Backend verifies the CV belongs to the authenticated user (same ownership check as existing CV endpoints). Returns 404 if not found.
3. If `extractionStatus === 'COMPLETED'` and `structuredData` is not null, return `structuredData` immediately (cache hit).
4. If `extractionStatus === 'FAILED'` or `'PENDING'` or `structuredData` is null, proceed to extract.
5. Set `extractionStatus = 'PENDING'` on the record (or leave as-is if already PENDING on first run).
6. Verify `parsedText` is not null/empty. If it is, return 400 Bad Request with a descriptive message.
7. Call `AiExtractionProvider.extract(parsedText)` — the active provider is `OpenAiExtractionService`.
8. On success: update `CvDocument` with `structuredData = result` and `extractionStatus = 'COMPLETED'`. Return the structured data as JSON.
9. On AI provider failure: update `extractionStatus = 'FAILED'`, propagate a 502 Bad Gateway error to the caller.

## Edge Cases

- **parsedText is null or empty**: Return 400 with message "CV text not available for extraction. Please re-upload the file."
- **Extraction already in progress (concurrent calls)**: Since extraction is synchronous within the request, the DB update at step 5 acts as an optimistic guard. No distributed locking for now.
- **AI provider throws**: Caught in `CvExtractionService`, `extractionStatus` set to FAILED, 502 returned.
- **Malformed JSON from AI**: The OpenAI service must validate/parse the response strictly; if parsing fails treat as provider failure (FAILED status, 502).
- **CV not owned by user**: 404 (same pattern as existing `deleteCv` and `getDownloadUrl`).

## Data / API

### New `CvStructuredData` type (shared datatypes)

```
CvStructuredData {
  contact: {
    name: string | null,
    email: string | null,
    phone: string | null,
    location: string | null,
    linkedin: string | null,
    website: string | null
  },
  summary: string | null,
  experience: Array<{
    title: string,
    company: string,
    location: string | null,
    startDate: string | null,
    endDate: string | null,
    current: boolean,
    bullets: string[]
  }>,
  education: Array<{
    degree: string,
    institution: string,
    location: string | null,
    startDate: string | null,
    endDate: string | null,
    field: string | null
  }>,
  skills: string[],
  certifications: Array<{
    name: string,
    issuer: string | null,
    date: string | null
  }>,
  projects: Array<{
    name: string,
    description: string | null,
    technologies: string[],
    url: string | null
  }>,
  languages: Array<{
    language: string,
    proficiency: string | null
  }>,
  other: string | null
}
```

### New `ExtractionStatus` type (shared datatypes)

```
ExtractionStatus = 'PENDING' | 'COMPLETED' | 'FAILED'
```

### Prisma schema changes

- Add `ExtractionStatus` enum: `PENDING`, `COMPLETED`, `FAILED`
- Add to `CvDocument`:
  - `structuredData Json?`
  - `extractionStatus ExtractionStatus @default(PENDING)`

### Endpoint

**POST /api/cv/:id/extract**
- Auth: `SupabaseGuard` (same as existing CV endpoints)
- Params: `id` (CvDocument UUID)
- Response 200: `{ data: CvStructuredData }`
- Response 400: `{ message: string }` — parsedText missing
- Response 404: CV not found / not owned by user
- Response 502: AI provider error

### New backend files

| File | Purpose |
|------|---------|
| `apps/opticv-be/src/app/cv/ai/ai-extraction.provider.ts` | Abstract class / interface `AiExtractionProvider` |
| `apps/opticv-be/src/app/cv/ai/openai-extraction.service.ts` | `OpenAiExtractionService implements AiExtractionProvider` |
| `apps/opticv-be/src/app/cv/cv-extraction.service.ts` | Orchestration: cache check, DB updates, provider call |

### Modified backend files

| File | Change |
|------|--------|
| `apps/opticv-be/prisma/schema.prisma` | Add `ExtractionStatus` enum + fields on `CvDocument` |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | Add `POST /:id/extract` route |
| `apps/opticv-be/src/app/cv/cv.module.ts` | Register `CvExtractionService`, `OpenAiExtractionService` |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `ExtractionStatus`, `CvStructuredData` |

### OpenAI integration

- Install `openai` npm package (if not already present)
- `OPENAI_API_KEY` added to `apps/opticv-be/config/env/development.env` and `production.env` (and validated in `config/validation.ts`)
- Model: `gpt-4o-mini`
- Prompt strategy: structured JSON extraction via system prompt + `parsedText` as user message; use JSON mode (`response_format: { type: 'json_object' }`)

## Acceptance (DEV)

- `npm exec prisma migrate dev` runs without error; `extractionStatus` and `structuredData` columns exist on `cv_documents`
- `POST /api/cv/:id/extract` with a CV that has `parsedText` returns `CvStructuredData` JSON and `extractionStatus` is `COMPLETED` in DB
- Calling the endpoint a second time returns the same data without making another OpenAI call (cache confirmed via logs or DB timestamp not changing)
- CV with null `parsedText` returns 400
- CV belonging to another user returns 404
- Build passes: `npm exec nx build opticv-be`
- Type check passes: `npm exec nx typecheck opticv-be`
- Lint passes: `npm exec nx lint opticv-be`
