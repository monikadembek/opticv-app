# Task Specification

## Source

Azure DevOps Task: 57 — LinkedIn profile update - generate new version of prompt for LINKEDIN_REWRITE (BE)

## Goal

Add a new version (`2.0.0`) of the `LINKEDIN_REWRITE` prompt to `seed.ts` that generates LinkedIn profile recommendations based solely on the candidate's CV and job description — without requiring the user to provide their existing LinkedIn profile data.

## Context

The `prompt_versions` table stores versioned AI prompts, keyed by `promptType` + `version` (unique constraint). The existing `LINKEDIN_REWRITE` v1.0.0 prompt assumes the user has already provided their current LinkedIn profile (headline, about, experience, skills). This data is passed via `{{linkedinHeadline}}`, `{{linkedinAbout}}`, `{{linkedinCurrentRole}}`, `{{linkedinExperience}}`, `{{linkedinSkills}}` template variables.

The new v2.0.0 prompt removes this dependency. The AI generates LinkedIn content from scratch using only `{{SHARED_CONTEXT}}`, which contains CV text, job description, and target role data already interpolated by `PromptService`.

The database migration/seed run will be handled **manually by the developer** — this task only produces the new seed entry.

## Scope

### In scope

- Add a new seed entry for `LINKEDIN_REWRITE` v2.0.0 in `apps/opticv-be/prisma/seed.ts`
- New entry must have `isActive: true`; the v1.0.0 entry must be changed to `isActive: false`
- New system prompt tailored to generating a LinkedIn profile from CV + job description (no existing profile comparison)
- New user prompt template that removes all `{{linkedin*}}` template variables
- Output schema retained and adapted: remove the `inconsistencies` field (no existing profile to compare against); keep `headlineVariants`, `aboutRewrite`, `additionalRecommendations`, `skillsToAdd`, `targetSearchQueries`

### Out of scope

- Database migrations (handled manually)
- Frontend changes
- Changes to `PromptService`, `OptimizationService`, or any other backend service
- Adding new shared datatypes

## Behavior

1. The backend `seed.ts` file gets a new object appended to the prompts seed array for `LINKEDIN_REWRITE` v2.0.0.
2. The v1.0.0 entry is updated: `isActive: false`.
3. When the developer runs `prisma db seed` (or manually inserts the row), the v2.0.0 prompt becomes the active one.
4. The optimization pipeline picks up v2.0.0 (the active prompt) for any new `LINKEDIN_REWRITE` job — it receives only `{{SHARED_CONTEXT}}` and generates LinkedIn content without asking the user for their existing profile.

## Edge Cases

- No `{{linkedin*}}` variables may appear in the v2.0.0 user prompt template — the prompt service will not have values for them and will leave them as literal strings, producing a broken prompt.
- The `inconsistencies` field is removed from the output schema because there is no existing LinkedIn profile to compare against. The tool name remains `submit_linkedin_sync` for backwards-compatibility with any downstream parsing.
- `isActive` uniqueness is not enforced at the DB level, but by convention only one version per promptType should be active. Setting v1.0.0 to `isActive: false` in the seed reflects this convention.

## Data / API

### Seed changes (`apps/opticv-be/prisma/seed.ts`)

**Update existing v1.0.0 entry:**
```ts
isActive: false,
```

**New v2.0.0 seed entry:**

| Field               | Value                                                                     |
|---------------------|---------------------------------------------------------------------------|
| `promptType`        | `PromptType.LINKEDIN_REWRITE`                                             |
| `version`           | `'2.0.0'`                                                                 |
| `isActive`          | `true`                                                                    |
| `modelPreference`   | `'gpt-4o-mini'`                                                           |
| `maxTokens`         | `null`                                                                    |

**System prompt intent:** The AI acts as a LinkedIn strategist who builds a complete, optimized LinkedIn presence from scratch using the candidate's CV and target role/job description. It does **not** compare to an existing profile. It generates:
- 3 headline variants (≤220 chars)
- A full About section (≤2600 chars, recommend 1500-2000)
- Skills to add
- Additional section recommendations (featured, certifications, URL, etc.)
- Target recruiter search queries

Key instructions to include:
- LinkedIn search prioritizes the headline; every word matters
- About section first 2-3 lines are shown before "see more" — front-load impact
- First-person voice works on LinkedIn (unlike resume)
- Keyword integration should be natural, not ATS-density optimized
- Derive all profile content from the resume and target role — do not invent credentials

**User prompt template:** Uses only `{{SHARED_CONTEXT}}`. Instructs the model to:
1. Generate 3 headline variants with different angles
2. Write an About section from scratch
3. List skills to add based on role requirements vs CV
4. Recommend other profile sections to complete
5. Identify recruiter search queries the profile should rank for

**Output schema (`submit_linkedin_sync` tool):** Same structure as v1.0.0 **minus** the `inconsistencies` field and its `required` entry:

```
headlineVariants       (required, array, 3 items, same schema as v1.0.0)
recommendedHeadline    (optional, enum of angle types)
aboutRewrite           (required, object, same schema as v1.0.0)
additionalRecommendations (required, array, same schema as v1.0.0)
skillsToAdd            (optional, array of strings)
skillsToRemove         (omit — no existing skills list to remove from)
targetSearchQueries    (required, array of strings)
```

## Acceptance (DEV)

- `seed.ts` compiles without TypeScript errors (`npm exec nx typecheck opticv-be`)
- v1.0.0 entry has `isActive: false`
- v2.0.0 entry has `isActive: true`, `version: '2.0.0'`, no `{{linkedin*}}` variables in the user prompt template
- Output schema does not include `inconsistencies`
- No other files are modified
- Build passes: `npm exec nx build opticv-be`
