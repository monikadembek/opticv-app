# Implementation Plan — Task 57: LinkedIn Prompt Change

## Overview

Single-file change: modify `apps/opticv-be/prisma/seed.ts` to add a `LINKEDIN_REWRITE` v2.0.0 seed entry and mark v1.0.0 as inactive. No migrations, no frontend changes, no service changes.

---

## Notes on Review Issues (PASS WITH ISSUES)

The review flagged non-critical issues resolved as follows for this plan:

- **Prompt text vs. intent:** The implementer authors the actual prompt text inline in `seed.ts`, following the intent described in the spec. The key constraints (no `{{linkedin*}}` variables, first-person voice, derive from CV only) are hard acceptance criteria.
- **Seed upsert/idempotency:** Confirmed — the seed runner uses `prisma.promptVersion.upsert` keyed on `(promptType, version)`. Running `prisma db seed` is idempotent and safe to re-run. Setting v1.0.0 to `isActive: false` in the seed array guarantees it will be deactivated on the next seed run.
- **Model choice:** Retain `gpt-4o-mini` (same as v1.0.0) — no task instruction to change it.
- **`skillsToRemove` omission:** Intentionally omitted — no existing skills list is available in the new flow.
- **`notes` field:** Include a short descriptive note on the v2.0.0 entry: `"v2.0.0: generates from CV and job description only — no existing LinkedIn profile required"`.

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/opticv-be/prisma/seed.ts` | Update v1.0.0 `isActive` to `false`; append v2.0.0 seed object |

---

## Step-by-Step Checklist

### Step 1 — Update v1.0.0 entry: set `isActive: false`

In the `seeds` array, locate the existing `LINKEDIN_REWRITE` entry (currently at approx. line 575). Change:

```
isActive: true,
```
to:
```
isActive: false,
```

No other fields on v1.0.0 change.

---

### Step 2 — Append v2.0.0 seed object to the `seeds` array

Add a new object after the v1.0.0 entry with these fields:

| Field | Value |
|-------|-------|
| `promptType` | `PromptType.LINKEDIN_REWRITE` |
| `version` | `'2.0.0'` |
| `isActive` | `true` |
| `modelPreference` | `'gpt-4o-mini'` |
| `maxTokens` | `null` |
| `notes` | `'v2.0.0: generates from CV and job description only — no existing LinkedIn profile required'` |
| `systemPrompt` | See Step 2a |
| `userPromptTemplate` | See Step 2b |
| `outputSchema` | See Step 2c |

---

#### Step 2a — System prompt

Author a system prompt that:
- Establishes the AI as an expert LinkedIn strategist
- States the task is to build a LinkedIn presence **from scratch** using only the candidate's CV and target role — no existing profile is provided and none should be expected or invented
- Includes these LinkedIn-specific principles (carry over from v1.0.0 where applicable):
  - Headline is weighted heavily in LinkedIn search — every word matters (max 220 chars)
  - About section first 2-3 lines appear before "see more" — front-load impact
  - First-person voice is appropriate on LinkedIn
  - Keywords should integrate naturally (not ATS-density style)
  - Do not invent credentials, experience, or skills not present in the CV
- Ends with: "Output using the `submit_linkedin_sync` tool. Do not output anything else."

---

#### Step 2b — User prompt template

Author a user prompt template that:
- Contains **only** `{{SHARED_CONTEXT}}` as a template variable (no `{{linkedin*}}` variables at all)
- Instructs the model to produce:
  1. Three headline variants (different positioning angles: title/specialty/value, outcome-focused, story-focused)
  2. A full About section written from scratch
  3. Skills to add based on the target role requirements vs. CV content
  4. Recommendations for other profile sections (featured, certifications, URL, banner, etc.)
  5. Recruiter search queries the profile should rank for

Example structure:
```
Build an optimised LinkedIn profile for the following candidate.

{{SHARED_CONTEXT}}

Provide:
1. Three headline variants with different positioning angles
2. A complete About section written from scratch
3. Skills to add based on the target role and CV
4. Recommendations for completing other profile sections
5. Recruiter search queries this profile should rank for
```

---

#### Step 2c — Output schema

Use the `submit_linkedin_sync` tool schema. Copy the v1.0.0 schema structure and apply these changes:

- **Remove** the `inconsistencies` field entirely (both from `properties` and `required`)
- **Remove** `skillsToRemove` field (no existing skills list to compare against)
- **Retain** all other fields unchanged:
  - `headlineVariants` (required, array, minItems 3, maxItems 3)
  - `recommendedHeadline` (optional)
  - `aboutRewrite` (required, object with `fullText`, `characterCount`, `preview`, `structure`, `keywordsIncorporated`)
  - `additionalRecommendations` (required, array)
  - `skillsToAdd` (optional, array of strings)
  - `targetSearchQueries` (required, array of strings)

The `required` array at the top level must list: `['headlineVariants', 'aboutRewrite', 'additionalRecommendations', 'targetSearchQueries']`

---

### Step 3 — Verify TypeScript compiles

Run:
```
npm exec nx typecheck opticv-be
```

Confirm no errors. The `seeds` array is typed `as const` — ensure the new entry conforms to the same shape as existing entries (all required fields present, no extra fields not in the schema).

---

### Step 4 — Verify build passes

Run:
```
npm exec nx build opticv-be
```

Confirm clean build.

---

### Step 5 — Spot-check the seed entry

Manually verify:
- v1.0.0 `isActive` is `false`
- v2.0.0 `isActive` is `true`, `version` is `'2.0.0'`
- No `{{linkedinHeadline}}`, `{{linkedinAbout}}`, `{{linkedinCurrentRole}}`, `{{linkedinExperience}}`, or `{{linkedinSkills}}` appear anywhere in the v2.0.0 `userPromptTemplate`
- `inconsistencies` does not appear in the v2.0.0 `outputSchema`
- `skillsToRemove` does not appear in the v2.0.0 `outputSchema`

---

## Acceptance Criteria (from spec)

- [ ] `seed.ts` compiles without TypeScript errors
- [ ] v1.0.0 entry has `isActive: false`
- [ ] v2.0.0 entry: `isActive: true`, `version: '2.0.0'`, no `{{linkedin*}}` variables in user prompt template
- [ ] Output schema omits `inconsistencies`
- [ ] No other files are modified
- [ ] Build passes
