# Specification Review

## Source

Spec: `.claude/specs/tasks/11-cv-optimization-prompts/02-spec.md`
Task: `.claude/specs/tasks/11-cv-optimization-prompts/00-raw-task.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec accurately covers the three pillars of the task — DB migration, seed, and PromptService — and does not invent requirements beyond what the task specifies. However, there are two non-critical gaps: (1) the `maxTokens` field mentioned in the raw task (marked `???`) is not addressed at all in the spec, and (2) the LinkedIn Prompt 7 has additional `{{linkedinProfile}}` input variables (`linkedinHeadline`, `linkedinAbout`, etc.) that are declared "out of scope" without a corresponding `LinkedInExtraVars` type in `PromptVariables`, which could leave the template with unresolvable placeholders at runtime. These should be clarified before implementation begins.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **`maxTokens` field not addressed.**
   The raw task lists `Max tokens: ???` for every prompt (e.g., Prompt 1: `???`, Prompt 2: `3000 ???`, etc.). The spec does not define a `maxTokens` column in the migration, does not include it in the seed, and does not mention it in the `PromptVersion` schema block. It is unclear whether this field should be added to the DB now (with `null` values until defined) or deferred to a future task. This should be an explicit in-scope or out-of-scope decision.

2. **LinkedIn Prompt 7 extra vars not typed in `PromptVariables`.**
   The spec marks `linkedinProfile` inputs as "stored as `{{placeholders}}` in the template only" (Out of Scope section), but the `PromptVariables` union type defined in the spec only includes `CoverLetterExtraVars` and `InterviewPrepExtraVars`. Prompt 7's template contains six `{{placeholders}}` (`{{linkedinHeadline}}`, `{{linkedinAbout}}`, `{{linkedinCurrentRole}}`, `{{linkedinExperience}}`, `{{linkedinSkills}}`). Per the spec's own `buildUserPrompt` rule ("placeholders with no matching value are left as-is"), these will render literally in the output unless a `LinkedInExtraVars` type is added. The spec should either add the type or explicitly document that Prompt 7 placeholders remain unresolved until a future task supplies the LinkedIn profile data.

3. **`ts-node` as seed runner may conflict with Nx/Webpack setup.**
   The spec proposes `"seed": "ts-node apps/opticv-be/prisma/seed.ts"` in `package.json`. The backend uses Webpack (not plain `tsc`), and Nx may require `ts-node` with a specific tsconfig path or `tsx` instead. This is an implementation detail but worth flagging so the implementer checks compatibility before running the seed.

4. **No mention of `@prisma/adapter-pg` compatibility with migration changes.**
   The existing schema uses the `@prisma/adapter-pg` driver adapter. The spec mentions running `prisma migrate dev` but does not note whether the column type change (`Int` → `String`) requires any special handling with the PG adapter (e.g., explicit `ALTER COLUMN ... USING version::text` in the raw SQL). This is an edge case the migration author should verify.

#### Unclear or Ambiguous Sections

- **Section "Behavior → 2. Seed File"**, sentence: *"keep `{{SHARED_CONTEXT}}` as a literal token in the stored template"* — This is slightly ambiguous. It correctly means the literal string `{{SHARED_CONTEXT}}` is stored in the DB column, and `buildUserPrompt` replaces it at runtime. The spec could be clearer by adding: "the DB value contains the string `{{SHARED_CONTEXT}}` verbatim, not the expanded block."

- **Section "Edge Cases"**, entry: *"the migration must cast existing int values to strings (e.g., `1` → `'1'`)"* — The spec does not specify whether this cast is done in the Prisma migration DSL or in raw SQL. Prisma migrations for type changes typically require a `@@ignore` workaround or a manual SQL step. The implementer will need to decide; the spec should note this explicitly.

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|------------|---------------------------|
| 1 | `outputSchema` should be nullable (`Json?`) to allow gradual population of existing rows | Yes — stated in Behavior §1 and Edge Cases |
| 2 | `version` column change from `Int` to `String` requires dropping and recreating the unique index | Yes — stated in Behavior §1 |
| 3 | `SHARED_CONTEXT` is assembled entirely at runtime; it is not persisted per-row in the DB | Yes — stated in Scope and Behavior §3 |
| 4 | Extra inputs for Cover Letter and Interview Prep are stored as `{{placeholders}}` in the `userPromptTemplate` column | Yes — stated in Scope |
| 5 | Model recommendations (gpt-4o vs gpt-4o-mini per prompt) are the implementer's decision, derived from task guidance | Yes — stated in Behavior §2 with rationale table |
| 6 | Seed is idempotent via `upsert` on `(promptType, version)` | Yes — stated in Behavior §2 |
| 7 | `PromptModule` should be registered in `AppModule` | Yes — stated in Behavior §4 |
| 8 | `getActivePrompt` returns the most recently created row when multiple active rows exist for the same type | Yes — stated in Edge Cases |
| 9 | `maxTokens` is out of scope for this task | **Not stated** — the field is simply not mentioned; no explicit deferral decision |
| 10 | LinkedIn Prompt 7's extra vars (`linkedinHeadline`, etc.) will remain unresolved in `buildUserPrompt` output until a future task | Partially — marked out of scope but no explicit statement about runtime behavior |

---

### Recommendation

**Revise specification** — address the two gaps before implementation:

1. Add an explicit statement on `maxTokens`: either add a nullable `maxTokens Int?` column to the migration now, or formally defer it to a future task.
2. Clarify `PromptVariables` for Prompt 7: either add `LinkedInExtraVars` to the union type or document that its placeholders intentionally remain unresolved at runtime.

All other findings are minor and can be resolved by the implementer without spec changes.
