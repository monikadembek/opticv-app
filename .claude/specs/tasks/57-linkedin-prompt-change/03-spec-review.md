# Spec Review — Task 57: LinkedIn Prompt Change

## Summary

- **Overall assessment:** PASS WITH ISSUES
- The spec correctly captures the core intent of the task: adding a v2.0.0 `LINKEDIN_REWRITE` prompt that generates LinkedIn content from CV + job description without requiring existing profile data. All explicit task requirements are addressed. However, a few non-critical issues exist around the spec describing *intent* for the system/user prompts rather than providing the actual prompt text, and one implicit assumption (model choice) is not acknowledged. No invented requirements detected.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **System prompt and user prompt template are described by intent, not provided verbatim.**
   The "Data / API" section describes what the prompts *should say* rather than providing the actual text. This leaves the implementer to author the AI prompts themselves, which is a significant creative/technical decision not pinned down in the spec. The spec should either include the full prompt text, or explicitly state "prompt text is left to the implementer's discretion" to avoid ambiguity.

2. **`skillsToRemove` omission rationale is sound but undocumented as an assumption.**
   The spec drops `skillsToRemove` from the output schema with a short inline note, but this decision is not listed as an assumption or explicitly justified beyond the parenthetical. It should be stated as an explicit assumption so reviewers and implementers can confirm this is intentional.

3. **Seed upsert/idempotency behavior not specified.**
   The spec says "append to the prompts seed array" but does not address what the seed runner does when v2.0.0 already exists in the DB (e.g., after the first manual run). If the seed uses `upsert`, v1.0.0 will be updated to `isActive: false` on re-run. If it uses `create`, re-running will fail with a unique constraint violation. The existing seed pattern should be confirmed and the spec should state which apply.

4. **The `notes` field on the new seed entry is not mentioned.**
   The `PromptVersion` model has an optional `notes` field. The v1.0.0 entry in the seed may or may not use it. The spec does not say whether v2.0.0 should include a note (e.g., "Generates from CV only, no existing profile required"). Minor but worth specifying.

---

### Unclear or Ambiguous Sections

- **"Behavior" step 3** states "When the developer runs `prisma db seed` (or manually inserts the row)". These are two different operations with different outcomes — seeding updates all records in the seed array; manual insert only adds v2.0.0 without touching v1.0.0. This ambiguity could cause v1.0.0 to remain `isActive: true` in the DB if the developer manually inserts instead of re-seeding. Clarify which method is expected.

- **"System prompt intent" section** uses the word "intent" explicitly — it is unclear whether the spec author expects the implementer to write the actual prompt or whether a draft prompt will be provided. This should be resolved to avoid scope creep during implementation.

---

### Invented or Unsupported Requirements

None.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|------------|---------------------------|
| 1 | `gpt-4o-mini` is the correct model for v2.0.0 (same as v1.0.0) | No — inherited without justification |
| 2 | The tool name `submit_linkedin_sync` is retained for backwards-compatibility | Yes (Edge Cases section) |
| 3 | `isActive` convention is one active version per promptType | Yes (Edge Cases section) |
| 4 | `{{SHARED_CONTEXT}}` already contains all needed CV and job description data without modification | Yes (Context section) |
| 5 | `skillsToRemove` is omitted because there is no existing skills list to compare against | Partially — mentioned inline in schema table, not as a named assumption |
| 6 | Database migration/seed run is handled manually and outside this task's scope | Yes (Scope and Behavior sections) |
| 7 | No frontend, service, or datatype changes are needed to support v2.0.0 | Yes (Out of scope section) |

---

## Recommendation

**Revise specification** — address the two ambiguities (seed vs. manual insert in Behavior step 3; prompt text vs. intent) and add the missing assumption about model choice and `skillsToRemove` omission. The core scope and output schema are correct and well-grounded in the task. Revision is minor.
