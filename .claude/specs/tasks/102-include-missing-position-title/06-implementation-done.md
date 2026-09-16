# Implementation Done: 102-include-missing-position-title

## Summary

Added a `position` field (string or null) to `CvContactInfo` (shared type) and `CvContactInfoDto` (backend DTO), added it to the CV extraction system prompt's `contact` object with an extraction rule, and rendered it below the candidate's name in all 6 CV preview template variants, the PDF export (3 header layout branches), and the DOCX export (2 layout branches). Test fixtures across backend and frontend spec files were updated to include the new `position` field to satisfy the updated `CvContactInfo` type, and one new backend test case was added covering pass-through of `position` during file-based extraction.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Add `position` field to extraction prompt's `contact` object | Implemented | `extract-cv-data.prompt.ts` |
| Add `position: string \| null` to `CvContactInfo` shared type | Implemented | `datatypes.ts` |
| Add `position: string \| null` to `CvContactInfoDto` | Implemented | `cv-response.dto.ts` |
| Render `contact.position` below name in all 6 preview template variants | Implemented | `cv-template-preview.html` — `default`, `classic`, `modern`, `corporate`, `minimal`, `impact` |
| Render `contact.position` below name in PDF export (3 header layout branches) | Implemented | `cv-export.service.ts` — center, right-block, left/band branches |
| Render `contact.position` below name in DOCX export (2 layout branches) | Implemented | `cv-export.service.ts` — `contactRightStack` branch and default branch |
| Update `openai.service.spec.ts` / other tests for new field shape | Implemented | New test case added to `openai.service.spec.ts`; fixture updates in `cv-extraction.service.spec.ts`, `cv-a4-preview.spec.ts`, `cv-optimization.spec.ts`, `apply-selections.spec.ts`, `cv-export.service.spec.ts` |
| `position` extracted from headline near name, or null if not present | Implemented | Prompt rule added: "contact.position" is the candidate's professional title/headline shown near their name; use null if none determined |
| Fallback to most recent/current experience entry title when no headline present | Not implemented | Prompt rule does not include an explicit fallback-to-experience-entry instruction |
| `position` passed through unchanged during optimization (no AI rewriting) | Implemented | No changes made to `apps/opticv-be/src/app/optimization/*` |
| No DB migration | Implemented | No Prisma schema/migration files changed |
| No REST endpoint changes required | Implemented | No controller/route files changed |
| Manual contact-editing UI parity (conditional, if such UI exists) | Not implemented | No manual contact-editing UI with per-field inputs was modified or added |

## Files

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/src/app/cv/dto/cv-response.dto.ts`
- `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts`
- `apps/opticv-be/src/app/ai/services/openai.service.spec.ts`
- `apps/opticv-be/src/app/cv/services/cv-extraction.service.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`
- `docs/tasks-list.md`

### Created

None.

## Components

| Component (per plan) | Status |
| --- | --- |
| `cv-template-preview.html` — 6 template `@case` blocks with position `@if` | Exist |

## Stores

Not applicable — no store changes were part of the plan.

## Deviations

- Plan's file list did not include `apps/opticv-be/src/app/cv/services/cv-extraction.service.spec.ts`, `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.spec.ts`, `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`, `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`, or `docs/tasks-list.md`; all were modified.
- Plan Step 3 specified a prompt rule including a fallback to "the most recent/current entry in `experience`" when no headline is present; the implemented prompt rule only instructs extraction of a headline/title near the name and defaults to `null` otherwise, without the experience-entry fallback instruction.
- In `cv-export.service.ts` center-aligned PDF branch, `cv.contact.name` rendering was changed to `cv.contact.name.toUpperCase()` (was not previously uppercased); `cv.contact.position` in the same branch is also rendered with `.toUpperCase()`.
- In `cv-export.service.ts` DOCX default branch, `cv.contact.name` and `cv.contact.position` are conditionally uppercased when `templateId === 'minimal'`.
- In `cv-template-preview.html`, `font-family: 'Montserrat', sans-serif` was changed to `font-family: 'Roboto', sans-serif` throughout the `modern` and `impact` template cases.

## Additional Implementation

Additional implementation not covered by the original documents:

- Font-family change from `'Montserrat'` to `'Roboto'` across the `modern` and `impact` preview templates in `cv-template-preview.html`.
- `.toUpperCase()` transformation added to `cv.contact.name` in the center-aligned PDF export branch of `cv-export.service.ts`.
- `.toUpperCase()` transformation added to `cv.contact.name` and `cv.contact.position` for the `minimal` template in the DOCX default branch of `cv-export.service.ts`.
