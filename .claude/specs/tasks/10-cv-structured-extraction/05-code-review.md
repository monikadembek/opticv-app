# Code Review

## Task: 10 — CV Structured Extraction
## Reviewer: Claude Code (senior peer review)
## Date: 2026-05-15

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The implementation is clean and correctly follows the spec's behavior requirements, DI wiring, and caching logic. All new files are in the expected locations and the module wiring is correct. One type-correctness issue in `datatypes.ts` (array fields typed as singletons) is a critical bug that would cause runtime mismatches and TypeScript compile failures at consumers. All other findings are minor.

---

### Conventions Violations

#### Critical (must fix before merge)

**1. `CvStructuredData` array fields typed as single objects — `packages/shared/datatypes/src/lib/datatypes.ts` lines 54–61**

The spec defines `experience`, `education`, `certifications`, `projects`, and `languages` as **arrays**. The implementation types them as single items:

```ts
experience: CvExperienceItem;       // ❌ should be CvExperienceItem[]
education: CvEducationItem;         // ❌ should be CvEducationItem[]
certifications: CvCertification;    // ❌ should be CvCertification[]
projects: CvProject;                // ❌ should be CvProject[]
languages: CvLanguage;              // ❌ should be CvLanguage[]
```

The test fixture in `cv-extraction.service.spec.ts` (lines 15–23) assigns `[]` to all five fields, which would be a TypeScript error with the current non-array types. The AI prompt (`extraction-prompt.ts`) correctly instructs the model to return arrays. This is a type contract mismatch: the runtime result from OpenAI will be arrays, but the TypeScript type says single object — consumers will break when they try to iterate.

**Fix:** Add `[]` to each field type in `CvStructuredData`.

---

#### Non-Critical (should fix)

**2. Redundant `|| 'gpt-4o-mini'` fallback — `openai-extraction.service.ts` line 25**

```ts
model: CV_EXTRACTION_OPENAI_MODEL || 'gpt-4o-mini',
```

`CV_EXTRACTION_OPENAI_MODEL` is a module-level `const` that is always `'gpt-4o-mini'`. The `||` fallback is dead code and implies the constant could be falsy, which is misleading. Use `CV_EXTRACTION_OPENAI_MODEL` directly.

**3. Redundant `AiExtractionProvider` provider in test — `cv-extraction.service.spec.ts` line 55**

```ts
{ provide: AiExtractionProvider, useValue: mockAiProvider },
```

`CvExtractionService` injects via `AI_EXTRACTION_PROVIDER` string token (line 54), not the abstract class. The abstract class provider entry is unused noise. Remove it.

**4. Extraction-prompt moved to a separate file without being listed in the plan**

`apps/opticv-be/src/app/cv/ai/extraction-prompt.ts` is a new file not listed in the implementation plan's files summary. This is a valid design choice (prompt as a constant separated for readability), but it is an undocumented deviation.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `ExtractionStatus` union type added to `@opticv/datatypes` | Covered | |
| `CvStructuredData` interface added to `@opticv/datatypes` | Partial | Array fields typed as single objects — see Critical #1 |
| `CvDocument` type updated with `structuredData` and `extractionStatus` | Covered | |
| Prisma `ExtractionStatus` enum added | Covered | |
| Prisma `structuredData Json?` column added | Covered | Migration adds JSONB |
| Prisma `extractionStatus ExtractionStatus @default(PENDING)` added | Covered | |
| Prisma migration runs | Covered | `20260515163718_add_extraction_status_and_structured_data` |
| `OPENAI_API_KEY` added to config validation | Covered | `validation.ts` line 14 |
| `AiExtractionProvider` abstract class created | Covered | |
| `AI_EXTRACTION_PROVIDER` injection token created | Covered | |
| `OpenAiExtractionService` implementing `AiExtractionProvider` | Covered | |
| Uses `gpt-4o-mini` with `response_format: { type: 'json_object' }` | Covered | |
| JSON parse + object validation + throws on failure | Covered | |
| `CvExtractionService` orchestrating cache-or-extract logic | Covered | |
| 404 for missing CV or wrong user (same message, no info leak) | Covered | |
| 200 cache hit when `COMPLETED` and `structuredData` not null | Covered | |
| 400 when `parsedText` null or empty (exact message matches spec) | Covered | |
| Only write `PENDING` to DB when not already `PENDING` | Covered | `cv-extraction.service.ts` lines 41–45 |
| 502 on AI failure, sets `FAILED` status | Covered | |
| `POST /api/cv/:id/extract` endpoint on `CvController` | Covered | |
| `@HttpCode(HttpStatus.OK)` on `extractCv` | Covered | |
| Response shape `{ data: CvStructuredData }` | Covered | |
| `SupabaseGuard` applied (controller-level) | Covered | |
| `CvExtractionService` and `OpenAiExtractionService` registered in module | Covered | |
| `ConfigModule` imported in `CvModule` | Covered | |

---

### Plan Deviations

1. **`extraction-prompt.ts` is a new file not listed in the plan.** The plan described the system prompt as inline logic within `OpenAiExtractionService`. Extracting it to a separate constant file is cleaner and not a concern, but it's an undocumented deviation.

2. **`apps/opticv-be/src/app/constants.ts` created for `CV_EXTRACTION_OPENAI_MODEL`.** The plan did not mention this file. The plan implied the model string would be hardcoded in the service. Using a named constant is better practice; the deviation is positive.

---

### Null Safety Issues

**`openai-extraction.service.ts` line 33 — `choices[0]?.message?.content` uses optional chaining correctly**, then guards with `if (!content)`. This is sound.

**`cv-extraction.service.ts` line 32 — `doc.structuredData as unknown as CvStructuredData`** — double cast is expected here since Prisma types `structuredData` as `Prisma.JsonValue`. No issue.

None beyond the array type mismatch noted in Critical #1.

---

### Code Smells

**`cv-extraction.service.ts` line 25 — model string in `CV_EXTRACTION_OPENAI_MODEL || 'gpt-4o-mini'`** — already noted in Non-Critical #2.

**`openai-extraction.service.ts` uses constructor injection** (`constructor(private readonly config: ConfigService)`) rather than the `inject()` function. The conventions file specifies: *"Use the `inject()` function instead of constructor injection"* for services. However, this convention is listed under the **Angular** best practices section (frontend), not backend. NestJS convention is constructor injection. This is not a violation.

None that require action beyond what is already noted.

---

### Recommendation

**Fix critical issues before merge.**

The single critical issue — the five array fields typed as non-arrays in `CvStructuredData` — is a straightforward one-line-per-field fix in `datatypes.ts`. Once corrected, the implementation is production-ready: the logic is correct, tests are thorough, DI is properly wired, and the spec behavior is fully covered.
