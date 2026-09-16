# Code Review

## Task

11-cv-optimization-prompts

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The implementation correctly covers all required functionality: schema migration, seed file with all 7 prompt types, `PromptService`, `PromptModule`, `AppModule` registration, and unit tests. The logic is clean and the spec is well-followed. Two non-critical issues exist: the `package.json` seed command uses `tsx` (deviating from the plan's `ts-node` spec) and the spec types use `type` aliases instead of `interface` as specified, but neither blocks correctness. One potential issue with the migration SQL warrants attention (no explicit `USING` cast for `version` column type change).

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`prompt.types.ts` uses `type` aliases instead of `interface`** — `prompt.types.ts:1,11,17,23,30`. Spec (section 3, `PromptVariables type`) and implementation plan (step 6a) both specify `interface` for `SharedPromptVariables`, `CoverLetterExtraVars`, `InterviewPrepExtraVars`, and `LinkedInExtraVars`. The implementation uses `type =` throughout. Either is functionally equivalent for this case, but it deviates from the spec wording and `interface` is conventional for object shapes in this codebase.

2. **`as unknown as Record<string, string | undefined>` cast in `buildUserPrompt`** — `prompt.service.ts:37`. The cast is necessary because `PromptVariables` is an intersection of optional fields, but using `as unknown` is a smell. The `interpolate` function's parameter type could be widened to `Record<string, string | undefined>` and `PromptVariables` could implement it structurally (it already does), so a direct `as Record<string, string | undefined>` cast (without `unknown`) would suffice and be cleaner.

3. **`getActivePrompt` test uses `as any` for `PromptType`** — `prompt.service.spec.ts:88,96`. The test passes `'RESUME_AUTOPSY' as any` instead of using the typed `PromptType.RESUME_AUTOPSY` enum value. The import for `PromptType` is not present in the spec file; the test should import and use the enum.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Migration: rename `modelId` → `modelPreference` | Covered | `migration.sql:9` drops `modelId` and adds `modelPreference` |
| Migration: `version Int` → `version String` | Partial | `migration.sql:13` uses `ALTER COLUMN "version" SET DATA TYPE TEXT` with no explicit `USING version::TEXT` cast — may fail on DBs with existing integer data (see Null Safety Issues) |
| Migration: add `outputSchema Json?` | Covered | `migration.sql:11` |
| Migration: add `maxTokens Int?` | Covered | `migration.sql:10` |
| `@@unique([promptType, version])` constraint preserved | Covered | `schema.prisma:194` |
| Prisma schema updated for all 4 field changes | Covered | `schema.prisma:178–196` |
| `prisma.seed` config in `package.json` | Covered | `package.json:11–13` (uses `npx tsx` not `ts-node`) |
| Seed: all 7 prompt types | Covered | `seed.ts` contains all 7 entries |
| Seed: `version: '1.0.0'`, `isActive: true` for all | Covered | Each seed entry verified |
| Seed: correct `modelPreference` per prompt type | Covered | Matches spec table |
| Seed: `outputSchema` populated for all 7 | Covered | All entries have `outputSchema` objects |
| Seed: `maxTokens: null` for all 7 | Covered | `maxTokens: null` in each entry |
| Seed: uses `upsert` (idempotent) | Covered | `seed.ts:715–728` |
| `SHARED_CONTEXT` constant defined at module level | Covered | `prompt.service.ts:7–26` |
| `buildUserPrompt` replaces `{{SHARED_CONTEXT}}` | Covered | `prompt.service.ts:39` |
| `buildUserPrompt` replaces remaining `{{key}}` | Covered | `prompt.service.ts:40` |
| `buildUserPrompt` leaves unknown placeholders as-is | Covered | `interpolate` returns `match` when key not found (`prompt.service.ts:29`) |
| `getActivePrompt` fetches active row by type | Covered | `prompt.service.ts:43–53` |
| `getActivePrompt` throws `NotFoundException` if none found | Covered | `prompt.service.ts:49–51` |
| `getActivePrompt` returns most recently created if multiple active | Covered | `orderBy: { createdAt: 'desc' }` at `prompt.service.ts:46` |
| `PromptModule` imports `PrismaModule`, provides and exports `PromptService` | Covered | `prompt.module.ts` |
| `PromptModule` registered in `AppModule` | Covered | `app.module.ts:11,25` |
| Unit tests: all vars present + `{{SHARED_CONTEXT}}` expansion | Covered | `prompt.service.spec.ts:32–49` |
| Unit tests: missing optional var leaves placeholder | Covered | `prompt.service.spec.ts:53–58` |
| Unit tests: extra cover letter vars substituted | Covered | `prompt.service.spec.ts:60–69` |
| Unit tests: LinkedIn vars substituted | Covered | `prompt.service.spec.ts:71–80` |
| `SharedPromptVariables` / `CoverLetterExtraVars` / `InterviewPrepExtraVars` types defined | Covered | `prompt.types.ts` |
| `LinkedInExtraVars` interface (plan addition) | Covered | `prompt.types.ts:23–28` |

---

### Plan Deviations

1. **Seed runner: `tsx` instead of `ts-node`** — The implementation plan (step 4) specifies `ts-node --project apps/opticv-be/tsconfig.app.json apps/opticv-be/prisma/seed.ts`. The actual `package.json` uses `npx tsx apps/opticv-be/prisma/seed.ts`. A `tsconfig.seed.json` was also added at `apps/opticv-be/tsconfig.seed.json` which extends `tsconfig.app.json` and includes `prisma/seed.ts`, but it is referenced by `prisma.config.ts` (`npx tsx prisma/seed.ts`) — not by the root `package.json` entry. The `prisma.config.ts` seed command and the root `package.json` seed command may refer to different working directories. Functionally `tsx` works and is already a devDependency (via vite/vitest toolchain), but it is a deviation from the stated plan.

2. **`prisma.config.ts` added** — The plan does not mention creating `apps/opticv-be/prisma.config.ts`. This file was added and contains a separate seed command (`npx tsx prisma/seed.ts`) with a `DIRECT_URL` env var for the datasource. This is likely needed for Prisma 7 config-based seeding, but was unplanned.

3. **`tsconfig.seed.json` added** — Not in the plan. Added to help `tsx`/`ts-node` resolve the seed file. Low impact, but undocumented deviation.

---

### Null Safety Issues

1. **Migration: no `USING` clause for `version` type change** — `migration.sql:13` reads `ALTER COLUMN "version" SET DATA TYPE TEXT` with no `USING version::TEXT`. On a database with existing integer rows, PostgreSQL will reject this without an explicit `USING` clause. The spec explicitly calls out: _"the migration must cast existing int values to strings"_ and the plan notes: _"After generation, open the migration SQL file and verify the `ALTER COLUMN version` statement includes `USING version::TEXT`. Add it manually if missing."_ The generated SQL does not include the `USING` clause. This will silently work on an empty DB (no existing rows to cast), but will fail on a DB with existing `PromptVersion` rows. Since the table was freshly created in a prior migration and seeded later, this may not cause issues in practice, but it is a correctness gap against the spec.

---

### Code Smells

1. **`seed.ts` upsert does not include `notes` in `update`** — `seed.ts:718–725`. The `update` block explicitly lists fields but omits `notes`. Since `notes` is `null` for all seeds, this is harmless, but the `update` block being a partial copy of `create` introduces a subtle divergence — if a future seed adds `notes`, it won't be updated on re-run. A comment or spreading `seed` into `update` (minus the unique key fields) would make this more robust.

2. **`getActivePrompt` test mock typed as `any`** — `prompt.service.spec.ts:88,96`. Using `'RESUME_AUTOPSY' as any` bypasses type safety in a test that is testing a typed method. Import `PromptType` from the generated enums and use `PromptType.RESUME_AUTOPSY`.

---

### Recommendation

**Fix critical issues before merge** — specifically the missing `USING version::TEXT` clause in `migration.sql`. While it may not cause a failure on this project's current empty table, the spec explicitly required it and any future re-application of the migration on a DB with existing data will fail. The non-critical issues (type aliases vs interfaces, `as any` in tests, seed `update` completeness) are low-risk but should be addressed in a follow-up if not now.
