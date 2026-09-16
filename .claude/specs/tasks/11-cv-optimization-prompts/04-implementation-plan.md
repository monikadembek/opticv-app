# Implementation Plan

## Task

11-cv-optimization-prompts

## Review issues resolved before planning

- `maxTokens Int?` column added to migration and seed (nullable, deferred values).
- `LinkedInExtraVars` interface added to `PromptVariables` to cover Prompt 7 placeholders.

---

## Prerequisite checks

- [ ] Verify `ts-node` is available (`ts-node` v10.9.1 is in root devDependencies — confirmed)
- [ ] Confirm no existing seed file at `apps/opticv-be/prisma/seed.ts`

---

## Step 1 — Update Prisma schema

**File:** `apps/opticv-be/prisma/schema.prisma`

Apply all three changes to the `PromptVersion` model in one edit:

1. Change `version Int` → `version String`
2. Rename `modelId String` → `modelPreference String`
3. Add `outputSchema Json?` after `modelPreference`
4. Add `maxTokens Int?` after `outputSchema`

Final `PromptVersion` model:

```prisma
model PromptVersion {
  id                 String     @id @default(uuid())
  promptType         PromptType
  version            String
  isActive           Boolean    @default(false)
  systemPrompt       String
  userPromptTemplate String
  modelPreference    String
  outputSchema       Json?
  maxTokens          Int?
  notes              String?
  createdAt          DateTime   @default(now())

  optimizationResults OptimizationResult[]

  @@unique([promptType, version])
  @@map("prompt_versions")
}
```

---

## Step 2 — Create Prisma migration

Run:
```
npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma --name add_prompt_version_columns
```

The auto-generated SQL will need a manual tweak for the `version` type change (`Int` → `String`).

**Edit the generated migration SQL** to include an explicit cast:

```sql
-- Rename model_id → model_preference
ALTER TABLE "prompt_versions" RENAME COLUMN "model_id" TO "model_preference";

-- Change version from Int to String (requires explicit cast)
ALTER TABLE "prompt_versions" ALTER COLUMN "version" TYPE TEXT USING version::TEXT;

-- Add new nullable columns
ALTER TABLE "prompt_versions" ADD COLUMN "output_schema" JSONB;
ALTER TABLE "prompt_versions" ADD COLUMN "max_tokens" INTEGER;
```

> Note: Prisma's migration dev command may not generate the USING clause for the type change. After generation, open the migration SQL file and verify the `ALTER COLUMN version` statement includes `USING version::TEXT`. Add it manually if missing.

---

## Step 3 — Regenerate Prisma client

```
npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma
```

Verify the generated types in `apps/opticv-be/src/generated/prisma/` reflect:
- `version: string` (not `number`)
- `modelPreference: string` (not `modelId`)
- `outputSchema: Prisma.JsonValue | null`
- `maxTokens: number | null`

---

## Step 4 — Add seed config to package.json

**File:** `package.json` (root)

Add a `"prisma"` key at the top level (alongside `"scripts"`, `"dependencies"`, etc.):

```json
"prisma": {
  "seed": "ts-node --project apps/opticv-be/tsconfig.app.json apps/opticv-be/prisma/seed.ts"
}
```

> Use `--project apps/opticv-be/tsconfig.app.json` so `ts-node` resolves paths correctly inside the Nx monorepo.

---

## Step 5 — Create seed file

**File:** `apps/opticv-be/prisma/seed.ts` (new file)

### Structure

```
imports: PrismaClient from generated path
const prisma = new PrismaClient()

const seeds: Array<Prisma.PromptVersionCreateInput> = [ ...7 entries... ]

async function main() {
  for (const seed of seeds) {
    await prisma.promptVersion.upsert({
      where: { promptType_version: { promptType: seed.promptType, version: seed.version } },
      update: seed,
      create: seed,
    })
  }
}

main().finally(() => prisma.$disconnect())
```

### Each seed entry contains

| Field | Value |
|-------|-------|
| `promptType` | `PromptType.RESUME_AUTOPSY` … `PromptType.LINKEDIN_REWRITE` |
| `version` | `'1.0.0'` |
| `isActive` | `true` |
| `systemPrompt` | Full system prompt text from `00-raw-task.md` for that prompt |
| `userPromptTemplate` | User prompt template text from `00-raw-task.md`; the literal string `{{SHARED_CONTEXT}}` stays as-is inside the template |
| `modelPreference` | See table below |
| `outputSchema` | The JSON Schema object from `00-raw-task.md` for that prompt (as a JS object literal) |
| `maxTokens` | `null` for all 7 entries (values TBD in a future task) |

### Model preferences per prompt type

| PromptType | modelPreference |
|------------|----------------|
| `RESUME_AUTOPSY` | `gpt-4o` |
| `KEYWORD_GAP` | `gpt-4o-mini` |
| `SUMMARY_REWRITE` | `gpt-4o` |
| `BULLET_UPGRADE` | `gpt-4o` |
| `COVER_LETTER` | `gpt-4o` |
| `INTERVIEW_PREP` | `gpt-4o-mini` |
| `LINKEDIN_REWRITE` | `gpt-4o-mini` |

---

## Step 6 — Create PromptModule and PromptService

### 6a. Create types file

**File:** `apps/opticv-be/src/app/prompt/prompt.types.ts` (new file)

Define and export:

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

export interface CoverLetterExtraVars {
  hiringManagerName?: string;
  companyContext?: string;
  tonePreference?: string;
}

export interface InterviewPrepExtraVars {
  interviewRound?: string;
  interviewerType?: string;
}

export interface LinkedInExtraVars {
  linkedinHeadline?: string;
  linkedinAbout?: string;
  linkedinCurrentRole?: string;
  linkedinExperience?: string;
  linkedinSkills?: string;
}

export type PromptVariables = SharedPromptVariables &
  Partial<CoverLetterExtraVars> &
  Partial<InterviewPrepExtraVars> &
  Partial<LinkedInExtraVars>;
```

### 6b. Create PromptService

**File:** `apps/opticv-be/src/app/prompt/prompt.service.ts` (new file)

Decorator: `@Injectable()`

Inject: `private readonly prisma = inject(PrismaService)` — use NestJS `inject()` from `@nestjs/common` per conventions.

> Note: NestJS uses constructor injection, not Angular's `inject()`. Use constructor injection consistent with the existing codebase pattern (e.g., `CvExtractionService`).

**Private constant** (module-level, not a class member):
```
const SHARED_CONTEXT = `<resume>\n{{resumeText}}\n...` (full block from raw task)
```

**Methods:**

1. `buildUserPrompt(template: string, vars: PromptVariables): string`
   - Step 1: Build the interpolated shared context string by replacing all `{{key}}` tokens in `SHARED_CONTEXT` using the `vars` values for the 7 shared keys.
   - Step 2: Replace the literal token `{{SHARED_CONTEXT}}` in `template` with the interpolated shared context string.
   - Step 3: Replace any remaining `{{key}}` tokens in the result using the remaining keys from `vars`.
   - Step 4: Return the final string. Placeholders with no matching key in `vars` are left as-is (no error thrown).
   - Implementation note: Use a single `replace` helper — `(str: string, vars: Record<string, string | undefined>) => str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)` — applied twice (once for SHARED_CONTEXT interpolation, once for the full template).

2. `async getActivePrompt(promptType: PromptType): Promise<PromptVersion>`
   - Query: `prisma.promptVersion.findFirst({ where: { promptType, isActive: true }, orderBy: { createdAt: 'desc' } })`
   - If result is `null`, throw `NotFoundException` with message `Prompt not found for type: ${promptType}`.

### 6c. Create PromptModule

**File:** `apps/opticv-be/src/app/prompt/prompt.module.ts` (new file)

```typescript
@Module({
  imports: [PrismaModule],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
```

---

## Step 7 — Register PromptModule in AppModule

**File:** `apps/opticv-be/src/app/app.module.ts`

Add `PromptModule` to the `imports` array (after `CvModule`).

---

## Step 8 — Write unit tests

**File:** `apps/opticv-be/src/app/prompt/prompt.service.spec.ts` (new file)

Use Jest (existing backend test runner). Mock `PrismaService` as an empty object — `getActivePrompt` tests are optional; focus on `buildUserPrompt`.

### Test cases for `buildUserPrompt`

1. **All shared vars present** — template contains `{{SHARED_CONTEXT}}`; all 7 shared vars provided; verify the output contains the substituted values (e.g., `resumeText` value appears in output, `{{resumeText}}` does not).
2. **Missing optional var** — template contains `{{hiringManagerName}}`; var not provided; verify the literal `{{hiringManagerName}}` remains in output (no error).
3. **SHARED_CONTEXT expansion** — verify `{{SHARED_CONTEXT}}` token is fully replaced and the result contains the `<resume>` XML tag.
4. **Extra vars substituted** — template contains `{{hiringManagerName}}`; var provided as `'Sarah'`; verify `Sarah` appears in output.
5. **LinkedIn vars substituted** — template contains `{{linkedinHeadline}}`; var provided; verify correct substitution.

---

## Step 9 — Run verification

Execute in order:

```bash
# Apply migration
npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma

# Regenerate client
npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma

# Run seed
npm exec prisma db seed --schema=apps/opticv-be/prisma/schema.prisma

# Run seed again (idempotency check — must not error or duplicate)
npm exec prisma db seed --schema=apps/opticv-be/prisma/schema.prisma

# Run backend tests
npm exec nx test opticv-be

# Type check
npm exec nx typecheck opticv-be

# Build
npm exec nx build opticv-be
```

---

## Files created / modified

### Modified
- `apps/opticv-be/prisma/schema.prisma` — PromptVersion model changes
- `apps/opticv-be/src/app/app.module.ts` — add PromptModule import
- `package.json` — add `prisma.seed` config

### Created
- `apps/opticv-be/prisma/migrations/<timestamp>_add_prompt_version_columns/migration.sql` — auto-generated + manually verified USING clause
- `apps/opticv-be/prisma/seed.ts`
- `apps/opticv-be/src/app/prompt/prompt.types.ts`
- `apps/opticv-be/src/app/prompt/prompt.service.ts`
- `apps/opticv-be/src/app/prompt/prompt.module.ts`
- `apps/opticv-be/src/app/prompt/prompt.service.spec.ts`
