# Implementation Done

## Task

11-cv-optimization-prompts

---

## Summary

Database migration, Prisma schema update, seed file with all 7 prompt templates, `PromptService` with `buildUserPrompt` and `getActivePrompt` methods, `PromptModule`, and unit tests were implemented. `PromptModule` is registered in `AppModule`. Seed configuration is present in `package.json`. All 7 `PromptVersion` rows are defined with `version: '1.0.0'`, `isActive: true`, correct `modelPreference`, `outputSchema`, and `maxTokens: null`.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Migration: rename `modelId` → `modelPreference` | Implemented | `migration.sql` drops `modelId`, adds `modelPreference TEXT NOT NULL` |
| Migration: `version Int` → `version String` | Implemented | `ALTER COLUMN "version" SET DATA TYPE TEXT` in `migration.sql` |
| Migration: add `outputSchema Json?` | Implemented | `output_schema JSONB` added in migration |
| Update `@@unique([promptType, version])` (version now String) | Implemented | Constraint preserved in schema; migration handles type change |
| Update generated Prisma client (`prisma generate`) | Implemented | Schema reflects updated model; client regenerated |
| Create `prisma/seed.ts` with all 7 prompt templates | Implemented | All 7 `PromptType` entries present |
| Seed: `version: '1.0.0'` for all rows | Implemented | Each entry has `version: '1.0.0'` |
| Seed: `isActive: true` for all rows | Implemented | Each entry has `isActive: true` |
| Seed: correct `modelPreference` per prompt type | Implemented | Matches spec model recommendations table |
| Seed: `outputSchema` populated for all 7 | Implemented | JSON Schema object present in each entry |
| Seed: uses `upsert` on `(promptType, version)` | Implemented | `prisma.promptVersion.upsert` with `promptType_version` unique key |
| Add `prisma.seed` config to `package.json` | Implemented | `"prisma": { "seed": "npx tsx apps/opticv-be/prisma/seed.ts" }` |
| Create `PromptModule` | Implemented | `apps/opticv-be/src/app/prompt/prompt.module.ts` |
| `PromptModule` imports `PrismaModule` | Implemented | `imports: [PrismaModule]` |
| `PromptModule` provides `PromptService` | Implemented | `providers: [PromptService]` |
| `PromptModule` exports `PromptService` | Implemented | `exports: [PromptService]` |
| Create `PromptService` | Implemented | `apps/opticv-be/src/app/prompt/prompt.service.ts` |
| `SHARED_CONTEXT` constant defined at module level | Implemented | Defined as module-level `const` above the class |
| `buildUserPrompt(template, vars)` method | Implemented | Interpolates `SHARED_CONTEXT`, then remaining `{{key}}` tokens |
| Unknown placeholders left as-is (no throw) | Implemented | `interpolate` returns the original `match` when key not in `vars` |
| `getActivePrompt(promptType)` method | Implemented | `findFirst` with `isActive: true`, `orderBy: { createdAt: 'desc' }` |
| `getActivePrompt` throws `NotFoundException` if not found | Implemented | Throws `NotFoundException` with message containing `promptType` |
| Register `PromptModule` in `AppModule` | Implemented | Added to `imports` array in `app.module.ts` |
| Define `SharedPromptVariables` type | Implemented | `prompt.types.ts` |
| Define `CoverLetterExtraVars` type | Implemented | `prompt.types.ts` |
| Define `InterviewPrepExtraVars` type | Implemented | `prompt.types.ts` |
| Define `PromptVariables` union type | Implemented | `prompt.types.ts` |
| Unit tests: `{{SHARED_CONTEXT}}` expansion | Implemented | `prompt.service.spec.ts` — "replaces {{SHARED_CONTEXT}}..." |
| Unit tests: all shared vars substituted | Implemented | `prompt.service.spec.ts` — "substitutes all shared context variables" |
| Unit tests: missing optional var leaves placeholder | Implemented | `prompt.service.spec.ts` — "leaves unknown placeholders as-is..." |
| Unit tests: extra cover letter vars substituted | Implemented | `prompt.service.spec.ts` — "substitutes extra cover letter vars..." |
| Unit tests: LinkedIn vars substituted | Implemented | `prompt.service.spec.ts` — "substitutes LinkedIn vars when provided" |
| Unit tests: `getActivePrompt` returns prompt when found | Implemented | `prompt.service.spec.ts` — "returns the prompt when found" |
| Unit tests: `getActivePrompt` throws when not found | Implemented | `prompt.service.spec.ts` — "throws NotFoundException..." |

---

## Files

### Created

| File | Description |
|---|---|
| `apps/opticv-be/prisma/migrations/20260515210114_add_prompt_version_columns/migration.sql` | Prisma migration for schema changes |
| `apps/opticv-be/prisma/seed.ts` | Seed file with all 7 prompt templates |
| `apps/opticv-be/prisma.config.ts` | Prisma configuration file |
| `apps/opticv-be/tsconfig.seed.json` | TypeScript config extending `tsconfig.app.json`, includes `prisma/seed.ts` |
| `apps/opticv-be/src/app/prompt/prompt.types.ts` | `PromptVariables` and related type definitions |
| `apps/opticv-be/src/app/prompt/prompt.service.ts` | `PromptService` with `buildUserPrompt` and `getActivePrompt` |
| `apps/opticv-be/src/app/prompt/prompt.module.ts` | `PromptModule` |
| `apps/opticv-be/src/app/prompt/prompt.service.spec.ts` | Unit tests for `PromptService` |

### Modified

| File | Change |
|---|---|
| `apps/opticv-be/prisma/schema.prisma` | `PromptVersion` model updated: `version String`, `modelPreference String`, `outputSchema Json?`, `maxTokens Int?` |
| `apps/opticv-be/src/app/app.module.ts` | `PromptModule` added to `imports` array |
| `package.json` | `"prisma": { "seed": "..." }` config added |

---

## Components

| Component | Exists |
|---|---|
| `PromptService` | Exist |
| `PromptModule` | Exist |

---

## Stores

None planned or implemented for this task.

---

## Deviations from Plan

1. **Seed runner uses `tsx` instead of `ts-node`** — Plan step 4 specified `ts-node --project apps/opticv-be/tsconfig.app.json apps/opticv-be/prisma/seed.ts`. The implemented `package.json` entry uses `npx tsx apps/opticv-be/prisma/seed.ts`.

2. **`prisma.config.ts` created** — Plan did not include this file. It defines schema path, migrations path, seed command (`npx tsx prisma/seed.ts`), and datasource URL from `DIRECT_URL` env var.

3. **`tsconfig.seed.json` created** — Plan did not include this file. It extends `tsconfig.app.json` and includes `prisma/seed.ts`.

4. **`PromptVariables` uses `type` aliases instead of `interface`** — Plan step 6a specified `interface` for each type. Implementation uses `type =` syntax throughout `prompt.types.ts`.

---

## Additional Implementation

1. **`maxTokens Int?` column** — Added to both the Prisma schema and the migration. This was a plan addition (documented in the plan's "Review issues resolved before planning" section) not in the original spec, and resolved as in-scope before implementation.

2. **`LinkedInExtraVars` type** — Added to `prompt.types.ts` and included in the `PromptVariables` union. This was a plan addition resolving the spec review gap around LinkedIn Prompt 7 placeholder variables.

3. **`getActivePrompt` unit tests** — The plan states these tests are "optional; focus on `buildUserPrompt`." Two tests covering `getActivePrompt` were implemented: one for the found case and one for the not-found (`NotFoundException`) case.
