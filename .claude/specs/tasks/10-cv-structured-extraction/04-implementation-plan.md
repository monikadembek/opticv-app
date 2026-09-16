# Implementation Plan

## Task: 10 — CV Structured Extraction
## Based on: 02-spec.md (reviewed: PASS WITH ISSUES — all issues resolved in this plan)

---

## Resolution of Review Issues

Before implementation, the following decisions resolve the PASS WITH ISSUES findings:

1. **Step 5 (PENDING write):** Only write `PENDING` to DB if current `extractionStatus` is not already `PENDING`. This avoids a redundant DB round-trip on the first call (where the Prisma default already sets it to `PENDING`).
2. **`OPENAI_API_KEY` in `config/validation.ts`:** Add a required Joi rule alongside existing env vars.
3. **Provider wiring:** Use a NestJS string injection token `AI_EXTRACTION_PROVIDER` (defined in a constants file). `CvExtractionService` receives `AiExtractionProvider` via `@Inject(AI_EXTRACTION_PROVIDER)`. `OpenAiExtractionService` is registered as the provider value in `cv.module.ts`.
4. **`CvDocument` shared type:** Update `datatypes.ts` to add `structuredData: CvStructuredData | null` and `extractionStatus: ExtractionStatus` to the `CvDocument` type.

---

## Step 1 — Install Dependencies

**Action:** Install the `openai` npm package.

```
npm install openai
```

This must happen before any code that imports from `openai` is written.

---

## Step 2 — Shared Datatypes (`packages/shared/datatypes/src/lib/datatypes.ts`)

**Action: Add two new exported types and update `CvDocument`.**

Add `ExtractionStatus` union type:
```
export type ExtractionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
```

Add `CvStructuredData` interface with all sub-types exactly as specified in 02-spec.md:
- `contact` object (all fields `string | null`)
- `summary: string | null`
- `experience` array (title, company, location, startDate, endDate, current, bullets)
- `education` array (degree, institution, location, startDate, endDate, field)
- `skills: string[]`
- `certifications` array (name, issuer, date)
- `projects` array (name, description, technologies, url)
- `languages` array (language, proficiency)
- `other: string | null`

Update the existing `CvDocument` type to add:
- `structuredData: CvStructuredData | null`
- `extractionStatus: ExtractionStatus`

---

## Step 3 — Prisma Schema (`apps/opticv-be/prisma/schema.prisma`)

**Action: Add `ExtractionStatus` enum and two new fields on `CvDocument`.**

Add enum (after `ParseStatus` enum):
```prisma
enum ExtractionStatus {
  PENDING
  COMPLETED
  FAILED
}
```

Add to `CvDocument` model (after `parseStatus` field):
```prisma
structuredData    Json?
extractionStatus  ExtractionStatus @default(PENDING)
```

---

## Step 4 — Prisma Migration

**Action:** Run the migration from the workspace root:

```
npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma
```

Name suggestion: `add_extraction_status_and_structured_data`

Verify the generated SQL adds:
- `extraction_status` column with default `'PENDING'`
- `structured_data` JSON nullable column

---

## Step 5 — Regenerate Prisma Client

**Action:** Run after migration to regenerate types:

```
npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma
```

---

## Step 6 — Environment & Config

### 6a. `apps/opticv-be/config/env/development.env`

Add at the end:
```
OPENAI_API_KEY=<your-dev-key>
```

### 6b. `apps/opticv-be/config/env/production.env`

Add at the end:
```
OPENAI_API_KEY=<your-prod-key>
```

### 6c. `apps/opticv-be/config/validation.ts`

Add to the Joi schema object:
```
OPENAI_API_KEY: Joi.string().required(),
```

---

## Step 7 — Injection Token Constant (new file)

**Create:** `apps/opticv-be/src/app/cv/ai/ai-extraction.token.ts`

Export a single string constant:
```ts
export const AI_EXTRACTION_PROVIDER = 'AI_EXTRACTION_PROVIDER';
```

---

## Step 8 — Abstract Provider Interface (new file)

**Create:** `apps/opticv-be/src/app/cv/ai/ai-extraction.provider.ts`

Define an abstract class (preferred over interface for NestJS DI):
```ts
import type { CvStructuredData } from '@opticv/datatypes';

export abstract class AiExtractionProvider {
  abstract extract(text: string): Promise<CvStructuredData>;
}
```

Using an abstract class makes the injection token optional — but since we are using a string token for swappability, the abstract class still serves as the type contract.

---

## Step 9 — OpenAI Extraction Service (new file)

**Create:** `apps/opticv-be/src/app/cv/ai/openai-extraction.service.ts`

Implementation details:
- Injectable NestJS service
- Constructor injects `ConfigService` (to read `OPENAI_API_KEY`)
- Initialises `OpenAI` client with the key from config
- `extract(text: string): Promise<CvStructuredData>` method:
  - Calls `openai.chat.completions.create` with:
    - `model: 'gpt-4o-mini'`
    - `response_format: { type: 'json_object' }`
    - System prompt: instructs the model to extract CV data as a JSON object matching `CvStructuredData` schema (field names and types listed verbatim)
    - User message: the raw `parsedText`
  - Parses `choices[0].message.content` with `JSON.parse`
  - If `JSON.parse` throws or the result is not an object, throws an `Error` (caller treats as provider failure)
  - Returns the parsed object cast to `CvStructuredData`

System prompt must enumerate every field name, its type, and nullability so the model produces valid output. It must end with: "Respond ONLY with the JSON object, no markdown fences."

---

## Step 10 — CV Extraction Service (new file)

**Create:** `apps/opticv-be/src/app/cv/cv-extraction.service.ts`

Responsibilities:
- Inject `PrismaService` and `AiExtractionProvider` (via `@Inject(AI_EXTRACTION_PROVIDER)`)
- Single public method: `extractStructuredData(cvId: string, userId: string): Promise<CvStructuredData>`

Logic (implements the Behavior from spec, with review resolution for step 5):

```
1. Find CvDocument by id. If not found → throw NotFoundException('CV document not found.')
2. If doc.userId !== userId → throw NotFoundException('CV document not found.')  [same 404, not 403]
3. If doc.extractionStatus === 'COMPLETED' && doc.structuredData !== null:
     → return doc.structuredData as CvStructuredData  (cache hit)
4. If doc.parsedText is null or empty string → throw BadRequestException('CV text not available for extraction. Please re-upload the file.')
5. If doc.extractionStatus !== 'PENDING':
     → update CvDocument set extractionStatus = 'PENDING'  (only write when not already PENDING)
6. Call aiProvider.extract(doc.parsedText)
7. On success:
     → update CvDocument set structuredData = result, extractionStatus = 'COMPLETED'
     → return result
8. On error from aiProvider:
     → update CvDocument set extractionStatus = 'FAILED'
     → throw BadGatewayException('AI extraction failed. Please try again later.')
```

Notes:
- Both NotFoundException paths (not found, wrong user) return 404 to avoid revealing ownership.
- `BadGatewayException` is from `@nestjs/common`.
- The `structuredData` field returned from Prisma is typed as `Prisma.JsonValue` — cast to `CvStructuredData` when returning.

---

## Step 11 — Controller Update (`apps/opticv-be/src/app/cv/cv.controller.ts`)

**Action: Add a new route `POST /:id/extract`.**

- Inject `CvExtractionService` via constructor.
- Add method:
  ```ts
  @Post(':id/extract')
  @HttpCode(HttpStatus.OK)
  extractCv(
    @Param('id') id: string,
    @CurrentUser() user: UserModel,
  ): Promise<{ data: CvStructuredData }> {
    return this.cvExtractionService.extractStructuredData(id, user.id)
      .then(data => ({ data }));
  }
  ```
- Import `CvStructuredData` from `@opticv/datatypes`.

---

## Step 12 — Module Update (`apps/opticv-be/src/app/cv/cv.module.ts`)

**Action: Register the new services and wire the injection token.**

- Import `ConfigModule` (to make `ConfigService` available to `OpenAiExtractionService`).
- Add to `providers`:
  ```ts
  CvExtractionService,
  {
    provide: AI_EXTRACTION_PROVIDER,
    useClass: OpenAiExtractionService,
  },
  ```
- Import `AI_EXTRACTION_PROVIDER` from `./ai/ai-extraction.token`.
- Import `CvExtractionService` from `./cv-extraction.service`.
- Import `OpenAiExtractionService` from `./ai/openai-extraction.service`.

---

## Step 13 — Verification Checklist

Run in order:

```bash
# 1. Type check
npm exec nx typecheck opticv-be

# 2. Lint
npm exec nx lint opticv-be

# 3. Build
npm exec nx build opticv-be

# 4. Rebuild shared datatypes first if needed
npm exec nx build datatypes
```

Manual API verification (requires dev server running):
- `POST /api/cv/:id/extract` with valid auth → 200 `{ data: CvStructuredData }`
- Same call a second time → 200, same data, no new OpenAI call (confirm via logs)
- CV with `parsedText = null` → 400
- CV belonging to another user → 404
- Invalid/missing token → 401

---

## Files Summary

### New Files

| Path | Purpose |
|------|---------|
| `apps/opticv-be/src/app/cv/ai/ai-extraction.token.ts` | NestJS injection token constant |
| `apps/opticv-be/src/app/cv/ai/ai-extraction.provider.ts` | Abstract provider contract |
| `apps/opticv-be/src/app/cv/ai/openai-extraction.service.ts` | OpenAI `gpt-4o-mini` implementation |
| `apps/opticv-be/src/app/cv/cv-extraction.service.ts` | Orchestration service |

### Modified Files

| Path | Change |
|------|--------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `ExtractionStatus`, `CvStructuredData`; update `CvDocument` type |
| `apps/opticv-be/prisma/schema.prisma` | Add `ExtractionStatus` enum + fields on `CvDocument` |
| `apps/opticv-be/config/env/development.env` | Add `OPENAI_API_KEY` |
| `apps/opticv-be/config/env/production.env` | Add `OPENAI_API_KEY` |
| `apps/opticv-be/config/validation.ts` | Add Joi rule for `OPENAI_API_KEY` |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | Add `POST /:id/extract` route, inject `CvExtractionService` |
| `apps/opticv-be/src/app/cv/cv.module.ts` | Register `CvExtractionService`, `OpenAiExtractionService`, `AI_EXTRACTION_PROVIDER` token |
