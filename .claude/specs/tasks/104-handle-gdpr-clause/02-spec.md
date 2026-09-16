# Task Specification

## Source

Azure DevOps Task: 104

## Goal

Support GDPR consent clauses in the CV optimization/export flow: extract an existing GDPR clause from the uploaded CV, render it at the bottom of the last page in every export template (preview, PDF, DOCX), and let the user opt in/out of including a GDPR clause via a checkbox in the export footer. If the user opts in but the source CV had no clause, insert a default clause text.

## Context

- Backend extraction: `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts` — OpenAI system prompt that defines the JSON schema extracted from uploaded CV text into `CvStructuredData`.
- Shared types: `packages/shared/datatypes/src/lib/datatypes.ts` — `CvStructuredData` type used by both frontend and backend.
- Frontend merge logic: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` (`mergedCv` computed signal) and `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` (`applySelectionsToCV` pure function) — assemble the final `CvStructuredData` from the extracted CV + user selections.
- Rendering: `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html` — single component with 6 `@switch` cases (`default`, `classic`, `modern`, `corporate`, `minimal`, `impact`), each rendering all CV sections for that visual style. Used by both the live preview and `cv-a4-preview` (paginates via height-based clip/shift of one continuous render — no real per-page DOM, so appending content as the last rendered block naturally lands it at the bottom of the last page).
- Export: `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` — fully client-side PDF export (jsPDF) and DOCX export (`docx` npm package), each with per-template style profiles (`PDF_PROFILES`, `DOCX_PROFILES`) that render sections procedurally in order (Languages is currently the last section in both).
- UI: `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts` / `.html` — footer bar with template selector, accent color, preview, and export buttons. Owns `model()`-based two-way state (e.g. `selectedTemplate`, `accentColor`) and `input()`s like `mergedCv`.
- Checkbox convention: no PrimeNG `p-checkbox` used anywhere in the app. Existing pattern (e.g. `bullet-rewriter.html`) uses native `<input type="checkbox">` with `[checked]` + `(change)`, styled with Tailwind's `accent-primary` class.

## Scope

### In scope

- Add `gdprClause: string | null` field to `CvStructuredData` (`packages/shared/datatypes/src/lib/datatypes.ts`).
- Update `EXTRACTION_SYSTEM_PROMPT` in `extract-cv-data.prompt.ts` to extract this field from the source CV (null if absent).
- Add a default GDPR clause text constant on the frontend.
- Add `includeGdprClause` boolean state in `cv-optimization.ts`, initialized from whether the extracted CV has a non-null `gdprClause`.
- Extend `applySelectionsToCV` (or the `mergedCv` computed) so the final merged CV's `gdprClause` reflects: checkbox off → `null`; checkbox on + original extracted clause present → original clause text; checkbox on + no original clause → default clause text.
- Add a checkbox to `export-footer.html`/`.ts`, two-way bound (`model()`) up to `cv-optimization.ts`, with the title text: "Include if you're applying to companies based in the EU, EEA, UK, or Switzerland". Initial checked state reflects whether the extracted CV had a clause.
- Render the GDPR clause (when present on the merged CV) at the bottom of the last page in:
  - `cv-template-preview.html` — all 6 template `@switch` cases, appended after the Languages section (last rendered section).
  - `cv-export.service.ts` — `exportToPdf()`, appended after the Languages section rendering, for all `PDF_PROFILES`.
  - `cv-export.service.ts` — `exportToDocx()`, appended after the Languages section rendering, for all `DOCX_PROFILES`.

### Out of scope

- Any backend PDF/DOCX rendering (export is entirely client-side today; no backend changes needed beyond the extraction prompt/type).
- Detecting jurisdiction/location automatically to auto-check the box based on job application location — the checkbox is manual, only its *initial* state is derived from extracted CV content.
- Editing the GDPR clause text inline (no rich text editor for the clause) — this task only adds/removes it as extracted or default text.
- Localizing the default clause text into other languages.

## Behavior

1. **Extraction:** When a CV is parsed, the AI extraction prompt looks for an existing GDPR/data-processing consent clause in the source text and returns it in a new `gdprClause` field (string) or `null` if none is found, alongside the existing fields.
2. **Initial state:** When `cv-optimization.ts` receives the extracted `CvStructuredData`, it initializes `includeGdprClause` to `true` if `gdprClause !== null`, else `false`.
3. **Merging:** The `mergedCv` computed signal produces a final `gdprClause` value:
   - `includeGdprClause()` is `false` → merged `gdprClause` is `null` (not rendered).
   - `includeGdprClause()` is `true` and the originally extracted CV had a non-null `gdprClause` → merged `gdprClause` is that original extracted text.
   - `includeGdprClause()` is `true` and the originally extracted CV had `gdprClause === null` → merged `gdprClause` is the default clause text:
     > I hereby give consent for my personal data included in this application to be processed for the purposes of the recruitment process, in accordance with Regulation (EU) 2016/679 (GDPR).
4. **Checkbox UI:** In `export-footer.html`, a checkbox labeled "GDPR Clause" appears (placement alongside existing footer controls, following the native checkbox convention). Its `title` attribute (tooltip) is: "Include if you're applying to companies based in the EU, EEA, UK, or Switzerland". Checkbox state is two-way bound to `cv-optimization.ts` via `model()`.
5. **Rendering — preview & A4 preview:** All 6 templates in `cv-template-preview.html` render the merged CV's `gdprClause` (if non-null) as a small text block after the Languages section — i.e., the final element in the template's content flow, so it lands at the bottom of the last page under the existing pagination/clipping mechanism.
6. **Rendering — PDF export:** `exportToPdf()` renders the clause as the final content block (after Languages) for every template profile, using existing `checkPage()` auto-pagination so it naturally sits at the bottom of the last page.
7. **Rendering — DOCX export:** `exportToDocx()` appends the clause as the final paragraph(s) (after Languages) for every template profile; Word's natural flow places it at the end of the document.
8. **Toggling off then on:** Unchecking removes the clause from the merged CV (and thus from preview/export). Re-checking restores the original extracted clause text if the source CV had one; otherwise re-inserts the default clause text. Toggling never mutates the originally extracted `gdprClause` value — only the merged/derived CV.

## Edge Cases

- Extracted CV has a very long or multi-paragraph "GDPR clause"-like section: extract it verbatim into `gdprClause` (no truncation/summarization specified); rendering wraps normally like other text blocks.
- Extraction genuinely finds no GDPR-like text: `gdprClause` is `null`, checkbox starts unchecked, no clause rendered until user opts in.
- User checks the box, exports, then unchecks and exports again: each export reflects the current `mergedCv` at export time (no caching of prior exports).
- CV has no other content on the last page normally (e.g., very short CV): clause still renders as the final block; no special-casing needed since pagination is purely height-driven.
- Merged CV has `gdprClause: null` (checkbox off): no section is rendered in any template, PDF, or DOCX output — no empty headers or placeholders.

## Data / API

- **Type change** (`packages/shared/datatypes/src/lib/datatypes.ts`): add `gdprClause: string | null;` to `CvStructuredData`.
- **Prompt change** (`apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts`): add `"gdprClause": string or null` to the extraction JSON schema description, with a rule clarifying it should capture an existing GDPR/data-processing consent statement if present in the source CV, else `null`.
- No REST endpoint, DTO, or database schema changes — `gdprClause` flows through the same extraction response path as other `CvStructuredData` fields (no persistence changes beyond what already stores `structuredData` as JSON, e.g. `CvDocument.structuredData`).
- No changes to backend export (none exists today).

## Acceptance (DEV)

- build passes
- tests added (extraction prompt/type change; `applySelectionsToCV` merge logic for the three `includeGdprClause`/original-clause combinations; export-footer checkbox initial state and toggle; template rendering presence/absence of clause; PDF/DOCX export inclusion)
- no breaking changes
