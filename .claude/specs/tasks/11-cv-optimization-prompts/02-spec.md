# Task Specification

## Source

Azure DevOps Task: 11-cv-optimization-prompts

## Goal

Define and persist all 7 CV optimization prompt templates in the database. This includes:
- Migrating the `PromptVersion` table (rename `modelId` → `modelPreference`, add `outputSchema`, change `version` to String),
- Writing a database seed that inserts all 7 prompt templates with version `'1.0.0'` and `isActive: true`,
- Defining a `SHARED_CONTEXT` constant in `PromptService` that is prepended at runtime when building the final user prompt.

No API endpoints, no frontend changes, no AI call logic in this task — this is purely data definition and DB setup.

## Context

The `PromptVersion` table already exists (created in migration `20260513133333_init`). The `PromptType` enum already covers all 7 types:
- `RESUME_AUTOPSY`
- `KEYWORD_GAP`
- `SUMMARY_REWRITE`
- `BULLET_UPGRADE`
- `COVER_LETTER`
- `INTERVIEW_PREP`
- `LINKEDIN_REWRITE`

The backend is NestJS (`apps/opticv-be`), using Prisma 7 with PostgreSQL/Supabase.

## Scope

### In scope

- Prisma migration: rename `modelId` → `modelPreference`, add `outputSchema Json`, change `version Int` → `version String`
- Update the `@@unique` constraint from `[promptType, version]` (still applies, but `version` is now String)
- Update generated Prisma client (re-run `prisma generate`)
- Create `apps/opticv-be/prisma/seed.ts` with all 7 prompt templates
- Add seed script to `package.json` (if not present) and `prisma.seed` config in `package.json`
- Create `PromptModule` and `PromptService` in `apps/opticv-be/src/app/prompt/`
- Define `SHARED_CONTEXT` constant in `PromptService`
- Define `buildUserPrompt(template: string, vars: PromptVariables): string` method that prepends `SHARED_CONTEXT` and substitutes `{{placeholders}}`
- Unit tests for `buildUserPrompt` placeholder substitution

### Out of scope

- Calling the AI (OpenAI) — no `chat.completions.create` in this task
- Exposing any HTTP endpoint for prompts
- Frontend changes
- Structured output parsing / response handling
- LinkedIn Sync (Prompt 7) additional input `linkedinProfile` — stored as `{{placeholders}}` in the template only

## Behavior

### 1. Database Migration

Create a new Prisma migration that:

1. Renames column `model_id` → `model_preference` on `prompt_versions` table
2. Adds column `output_schema` of type `Json` (nullable — `Json?`) to allow gradual population
3. Changes column `version` from `Int` to `String`
4. Drops and recreates the unique index on `(prompt_type, version)` (type change requires this)

Prisma schema changes:
```prisma
model PromptVersion {
  id                 String     @id @default(uuid())
  promptType         PromptType
  version            String                       // changed: Int → String
  isActive           Boolean    @default(false)
  systemPrompt       String
  userPromptTemplate String
  modelPreference    String                       // renamed: modelId → modelPreference
  outputSchema       Json?                        // new column
  notes              String?
  createdAt          DateTime   @default(now())

  optimizationResults OptimizationResult[]

  @@unique([promptType, version])
  @@map("prompt_versions")
}
```

### 2. Seed File

Create `apps/opticv-be/prisma/seed.ts`.

For each of the 7 prompt types, insert one row with:
- `version: '1.0.0'`
- `isActive: true`
- `systemPrompt`: the system prompt text from the task definition
- `userPromptTemplate`: the user prompt template text (without `{{SHARED_CONTEXT}}` — that placeholder is substituted at runtime; keep `{{SHARED_CONTEXT}}` as a literal token in the stored template)
- `modelPreference`: recommended OpenAI model (see model recommendations below)
- `outputSchema`: the JSON Schema object from the task definition (as a JS object, Prisma handles serialization)

Use `upsert` (on `promptType + version`) so the seed is idempotent.

#### Model recommendations

| Prompt | Model | Rationale |
|--------|-------|-----------|
| RESUME_AUTOPSY | `gpt-4o` | Quality matters — headline feature; needs deep reasoning |
| KEYWORD_GAP | `gpt-4o-mini` | Pattern matching task; fast and cost-effective |
| SUMMARY_REWRITE | `gpt-4o` | Creative writing quality matters; short output |
| BULLET_UPGRADE | `gpt-4o` | Needs nuanced rewriting and STAR method understanding |
| COVER_LETTER | `gpt-4o` | Creative writing; human-sounding output requires best model |
| INTERVIEW_PREP | `gpt-4o-mini` | High volume of structured Q&A; cost-sensitive |
| LINKEDIN_REWRITE | `gpt-4o-mini` | Structured audit + rewrite; acceptable with mini |

### 3. PromptService

Create `apps/opticv-be/src/app/prompt/prompt.service.ts`.

#### SHARED_CONTEXT constant

```
const SHARED_CONTEXT = `
<resume>
{{resumeText}}
</resume>

<parsed_resume_sections>
{{parsedSectionsJson}}
</parsed_resume_sections>

<job_description>
{{jobDescription}}
</job_description>

<context>
Target role: {{targetRole}}
Target seniority: {{seniority}}
Industry: {{industry}}
Years of experience: {{yearsExperience}}
</context>
`;
```

#### PromptVariables type

Define in `prompt.service.ts` (or a co-located `prompt.types.ts` if it grows large):

```typescript
export interface SharedPromptVariables {
  resumeText: string;
  parsedSectionsJson: string;
  jobDescription: string;
  targetRole: string;
  seniority: string;
  industry: string;
  yearsExperience: string;
}

// Prompt-specific extra vars (used by Cover Letter and Interview Prep)
export interface CoverLetterExtraVars {
  hiringManagerName?: string;
  companyContext?: string;
  tonePreference?: string;
}

export interface InterviewPrepExtraVars {
  interviewRound?: string;
  interviewerType?: string;
}

export type PromptVariables = SharedPromptVariables &
  Partial<CoverLetterExtraVars> &
  Partial<InterviewPrepExtraVars>;
```

#### buildUserPrompt method

```typescript
buildUserPrompt(template: string, vars: PromptVariables): string
```

Steps:
1. Replace `{{SHARED_CONTEXT}}` in `template` with the interpolated `SHARED_CONTEXT` string (with all shared vars substituted)
2. Replace any remaining `{{key}}` placeholders with corresponding values from `vars`
3. Placeholders with no matching value in `vars` are left as-is (do not throw)

#### getActivePrompt method

```typescript
async getActivePrompt(promptType: PromptType): Promise<PromptVersion>
```

Fetches the single `PromptVersion` row where `promptType = X AND isActive = true`. Throws `NotFoundException` if none found.

### 4. PromptModule

Create `apps/opticv-be/src/app/prompt/prompt.module.ts`:
- Imports `PrismaModule`
- Provides `PromptService`
- Exports `PromptService` (so other feature modules can import it)

Register `PromptModule` in `AppModule`.

## Edge Cases

- If `version` column migration conflicts with existing data (existing rows have integer versions), the migration must cast existing int values to strings (e.g., `1` → `'1'`)
- Seed uses `upsert` — re-running seed must not create duplicate rows or fail
- `outputSchema` is nullable (`Json?`) — existing rows without it are valid
- `buildUserPrompt`: unknown `{{placeholder}}` keys are left unreplaced (no error), allowing optional vars in Cover Letter / Interview Prep templates
- `getActivePrompt`: if multiple active rows exist for a type (data inconsistency), return the most recently created one (`orderBy: { createdAt: 'desc' }, take: 1`)

## Data / API

### DB changes (migration)

| Column | Change |
|--------|--------|
| `model_id` | Renamed → `model_preference` |
| `version` | Type changed `Int` → `String` |
| `output_schema` | New column, `JSONB`, nullable |

### Seed data — 7 rows in `prompt_versions`

All rows: `version = '1.0.0'`, `isActive = true`

Prompt content as specified in `00-raw-task.md` for each of the 7 prompt types.

### New files

```
apps/opticv-be/prisma/seed.ts
apps/opticv-be/src/app/prompt/prompt.module.ts
apps/opticv-be/src/app/prompt/prompt.service.ts
apps/opticv-be/src/app/prompt/prompt.service.spec.ts
```

### package.json changes

Add `prisma.seed` config and ensure seed script is runnable:
```json
{
  "prisma": {
    "seed": "ts-node apps/opticv-be/prisma/seed.ts"
  }
}
```

## Acceptance (DEV)

- Migration applies cleanly on a fresh DB and on an existing DB with integer `version` data
- `prisma generate` completes without errors after schema changes
- `prisma db seed` runs to completion and is idempotent (run twice, no error, no duplicates)
- All 7 `PromptVersion` rows exist in DB with correct `modelPreference`, `outputSchema`, `isActive: true`, `version: '1.0.0'`
- `PromptService.buildUserPrompt` correctly substitutes all `{{placeholders}}` including `{{SHARED_CONTEXT}}`
- `PromptService.getActivePrompt` returns the correct row per `PromptType`
- Unit tests for `buildUserPrompt` pass (covering: all vars present, missing optional vars, `{{SHARED_CONTEXT}}` expansion)
- Build passes (`npm exec nx build opticv-be`)
- No TypeScript errors (`npm exec nx typecheck opticv-be`)
