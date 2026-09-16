# Task Specification

## Source

Task 102: Optimized CV is missing the position title (BE & FE)

## Goal

Extract the candidate's position/job title (e.g. "Software Engineer", "Angular Developer") from the uploaded CV during AI extraction, persist it as part of the structured CV data, and display it below the candidate's name wherever the name is rendered in the optimized CV (on-screen preview templates and exported PDF/DOCX files).

## Context

- Extraction happens in `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts` (system prompt) via `OpenaiService.extractCvData` / `extractCvDataFromFile` (`apps/opticv-be/src/app/ai/services/openai.service.ts`). The LLM returns a JSON object matching `CvStructuredData`, parsed directly with no runtime schema validation.
- `CvStructuredData` / `CvContactInfo` are shared types defined in `packages/shared/datatypes/src/lib/datatypes.ts`, mirrored by Swagger DTOs in `apps/opticv-be/src/app/cv/dto/cv-response.dto.ts` (`CvStructuredDataDto` / `CvContactInfoDto`).
- The optimization step (`apps/opticv-be/src/app/optimization/*`) does not read or rewrite `contact` fields — the optimized CV's `structuredData` carries `contact` through unchanged from extraction.
- On the frontend, the candidate name is rendered below contact info in:
  - `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html` — 6 template variants (`default` and 5 others), each with its own `@if (cv()!.contact.name) { ... }` block.
  - `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` — PDF export (jsPDF, 3 header layout branches: `center`, `right-block`, left/band) and DOCX export (docx.js, 2 layout branches: `contactRightStack` and default).

## Scope

### In scope

- Add a `position` field (string or null) to the extraction prompt's `contact` object in `extract-cv-data.prompt.ts`.
- Add `position: string | null` to the `CvContactInfo` shared type and `CvContactInfoDto`.
- Render `contact.position` directly below the candidate's name in all 6 `cv-template-preview.html` template variants, whenever it is present.
- Render `contact.position` directly below the candidate's name in PDF export (all 3 header layout branches) and DOCX export (both layout branches) in `cv-export.service.ts`.
- Update `openai.service.spec.ts` / any other existing tests that assert on the extraction JSON shape if needed for consistency (no new test scaffolding beyond what's needed to cover the new field).

### Out of scope

- Changing the AI optimization step to rewrite/tailor the position title against a target job description — it is passed through unchanged, exactly like `contact.name`, `contact.email`, etc.
- Adding `position` anywhere outside `contact` (e.g. not a top-level `CvStructuredData` field).
- Database schema changes — `structuredData` is stored as JSON (Prisma `Json` column via `CvDocument.structuredData`), so no migration is needed.
- Editing UI (manual CV editor) beyond what's needed to display the field — no explicit requirement was given to make `position` user-editable; if an existing contact-editing UI exists for `name`/`email`/etc., extend it consistently, but do not add new editing surfaces beyond parity with existing contact fields. *(See Assumptions.)*

## Behavior

1. **Extraction:** When a CV is parsed (`extractCvData` / `extractCvDataFromFile`), the LLM is instructed to extract a `position` string from the CV text (e.g. a job title/headline near the candidate's name, or their most recent/current role title) into `contact.position`. If no position title is present in the CV, `contact.position` is `null`.
2. **Storage/propagation:** `contact.position` flows through `CvStructuredData` exactly like other contact fields — stored in `CvDocument.structuredData`, copied unchanged into `OptimizationResult` during optimization (no AI rewriting).
3. **Display:** Wherever `contact.name` is rendered (preview templates, PDF export, DOCX export), `contact.position` is rendered immediately below it when non-null/non-empty. If `contact.position` is null or missing, no extra line is rendered (layout collapses as it does today when a contact field is absent) — no placeholder text.
4. Styling of the position line should be visually secondary to the name (e.g. smaller size, lighter weight/color) and consistent with each template's existing typographic hierarchy, following the pattern already used for other secondary text (contact lines) in that template.

## Edge Cases

- CV has no discernible position/title text → `contact.position` is `null`; no line rendered anywhere (no layout gap, no empty line).
- CV has multiple past job titles but no clear "current" title/headline → extraction should prefer a headline/title near the top of the CV (next to the name) if present, otherwise the title of the most recent/current experience entry (`current: true` or the first `experience` item) if there's no explicit headline. *(See Assumptions — LLM extraction heuristic, cannot be deterministically guaranteed.)*
- Existing CVs already extracted/stored before this change have `structuredData.contact` without a `position` key → treat as `undefined`/`null` (optional field), no re-extraction is performed; FE and export code must handle a missing `position` gracefully (falsy check), not throw.
- Very long position titles → no truncation/wrapping logic beyond what the existing text rendering for that template/format already does for long name/contact strings (i.e. reuse existing wrapping behavior, don't add new special-casing).

## Data / API

- **Shared type** (`packages/shared/datatypes/src/lib/datatypes.ts`):
  ```ts
  export type CvContactInfo = {
    name: string | null;
    position: string | null; // new
    email: string | null;
    phone: string | null;
    location: string | null;
    linkedin: string | null;
    website: string | null;
  };
  ```
- **DTO** (`apps/opticv-be/src/app/cv/dto/cv-response.dto.ts`): add matching `@ApiProperty({ nullable: true, example: 'Software Engineer' }) position!: string | null;` to `CvContactInfoDto`, positioned after `name`.
- **Prompt** (`apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts`): add `"position": string or null` to the `contact` object in `EXTRACTION_SYSTEM_PROMPT`, with a rule clarifying it should capture the professional title/headline shown near the candidate's name (e.g. "Software Engineer"), not a job history title unless that's the only signal available.
- **No REST endpoint changes** — `CvExtractResponseDto` / `UploadCvResponseDto` already wrap `CvStructuredDataDto`, so the new field is included automatically once the DTO is updated.
- **No DB migration** — `structuredData` is a JSON column.

## Assumptions

- `position` belongs inside `contact` (confirmed with user), placed directly after `name`.
- All 6 preview templates and both PDF/DOCX export formats must show the position title (confirmed with user) — full consistency, no per-template opt-out.
- Optimization does not rewrite `position` — passed through unchanged like other contact fields (confirmed with user).
- No manual CV/contact editing UI is being extended beyond what parity with existing fields requires; if such a UI is found during implementation to have explicit per-field inputs for `name`/`email`/etc., a `position` input should be added for consistency, but this spec does not mandate new UI beyond that parity.
- The LLM extraction heuristic for "which title to extract when several are present" cannot be made fully deterministic — the prompt will give guidance (prefer a headline near the name, fall back to most recent role) but exact extraction accuracy depends on the LLM and CV content.

## Acceptance (DEV)

- `npm exec nx build opticv-be` and `npm exec nx build opticv-web` pass.
- `npm exec nx typecheck opticv-be` and `npm exec nx typecheck opticv-web` pass (shared type change propagates cleanly).
- `npm exec nx test opticv-be` passes, including updated/added coverage for `extractCvData`/`extractCvDataFromFile` handling a `position` field.
- `npm exec nx lint opticv-be` and `npm exec nx lint opticv-web` pass.
- Manual verification: upload a CV containing a position title → optimized CV preview (all templates) and downloaded PDF/DOCX show the title below the name; upload a CV without one → no extra blank line appears anywhere.
- No breaking changes to existing `CvContactInfo` consumers (new field is additive and nullable).
