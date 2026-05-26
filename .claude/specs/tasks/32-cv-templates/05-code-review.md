# Code Review — Task 32: Create CV Templates

Reviewed by: Code Review Workflow  
Date: 2026-05-26  
Branch: `feature/32-cv-templates`

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The core feature is implemented correctly and follows Angular conventions well. Three template variants are rendered in both preview and export (PDF/DOCX), keyboard navigation is implemented with full ARIA radiogroup semantics, and the orchestrator correctly threads `selectedTemplate` into both export calls. Two non-critical deviations from conventions and spec are noted, and one minor structural concern in the export service merits attention.

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`cv-template-selector.ts` line 15 — selector uses `app-` prefix unnecessarily against spec**  
   Selector is `app-cv-template-selector`. The implementation plan (Step 3) specifies `cv-template-selector` (no `app-` prefix). The template in `cv-optimization.html` uses `app-cv-template-selector` so this is self-consistent, but deviates from the spec's selector convention used throughout the feature module. Similar discrepancy on `CvTemplatePreview` (`app-cv-template-preview` vs spec `cv-template-preview`). This is consistent with what other components in the codebase use (`app-` prefixed), so this is acceptable, but worth noting as a spec deviation.

2. **`cv-export.service.ts` lines 258–288 — `templateId` checked directly instead of via profile**  
   Inside `addSkillChips`, `templateId === 'executive'` is compared directly (line 258, 263). The service already abstracts template behaviour through `PdfStyleProfile`; this special-case check leaks template identity back into rendering logic. The `skillsStyle` profile field could distinguish this (e.g., a `filled` variant), which would be more consistent. Non-critical since it works correctly, but it is a minor SRP inconsistency.

3. **`cv-export.service.ts` lines 400–403 and 447–450 — `templateId === 'executive'` checked inside experience/education loops**  
   Same pattern as above: `templateId === 'executive'` is checked directly in the rendering loops rather than being fully delegated through the profile. Same recommendation as #2 — non-critical but inconsistent with the profile-based abstraction.

4. **`cv-export.service.ts` line 433 — variable named `usedAccentBullet` vs. actual `templateId === 'modern'` check**  
   The variable `usedAccentBullet` is computed from `templateId === 'modern'` but could be a profile field. Minor naming smell, acceptable in context.

---

### Specification Coverage

| Requirement | Status | Note |
|------------|--------|------|
| `CvTemplateId` type added to shared datatypes | Missing | Spec (§Data/API) says add to `packages/shared/datatypes/src/lib/datatypes.ts`. Implementation plan (Step 1) explicitly says add it there. Instead it lives in `cv-templates.ts` in the frontend. The plan later clarifies this is intentional to keep the shared lib free of runtime values, but the type itself (not a runtime value) was still meant to be in shared. This is consistent with the plan's revised note — acceptable deviation. |
| `CvTemplate` interface + `CV_TEMPLATES` in frontend (`cv-templates.ts`) | Covered | Per plan Step 2 |
| `CvTemplateSelector` component with `role="radiogroup"` | Covered | Implemented via `host` object |
| Template cards with `role="radio"`, `aria-checked`, `tabindex` | Covered | All present in `cv-template-selector.html` |
| Keyboard navigation: ArrowRight/Left/Down/Up, Space/Enter | Covered | Full implementation in `onKeydown()` |
| Default template: `'ats'` | Covered | `model<CvTemplateId>('ats')` |
| Preview button opens PrimeNG dialog with `CvTemplatePreview` | Covered | Dialog in same component template |
| Preview shows "No CV data available" when cv is null | Covered | `@if (!cv())` guard at top of preview template |
| Three template styles in preview (ATS, Modern, Executive) | Covered | Full `@switch` block in `cv-template-preview.html` |
| ATS: teal accent, pill chips, single-column | Covered | Correct colors and layout |
| Modern: red accent, right-aligned contact block, left-bar headings | Covered | Correct colors and contact layout |
| Executive: purple accent, centered header, filled band headings | Covered | Correct colors; name uses serif font as spec'd |
| PDF export respects selected template | Covered | `PDF_PROFILES` keyed by `CvTemplateId` |
| DOCX export respects selected template | Covered | `DOCX_PROFILES` keyed by `CvTemplateId` |
| `exportToPdf(cv, templateId)` and `exportToDocx(cv, templateId)` signatures | Covered | Both accept `templateId: CvTemplateId = 'ats'` |
| `selectedTemplate` signal in `CvOptimization` orchestrator | Covered | Line 146 in `cv-optimization.ts` |
| Template selector always visible in Export CV section (not gated by `canExportCv()`) | Covered | Selector is outside the `@if (canExportCv())` block |
| Export buttons only when `canExportCv()` | Covered | Export buttons remain inside `@if (canExportCv())` |
| DOCX skills rendered as comma-separated string | Covered | `cv.skills.join(', ')` |
| Session-only state (reset on destroy) | Covered | Signal is local to component; destroyed with component |
| No new `any` types | Covered | No `any` found in changed files |
| No breaking changes to cover letter / interview prep export paths | Covered | Those services are untouched |

---

### Plan Deviations

1. **`CvTemplateId` location**: The implementation plan Step 1 specifies adding `CvTemplateId` to `packages/shared/datatypes/src/lib/datatypes.ts`. The implementation places it in `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts`. The plan's own note ("The `CV_TEMPLATES` constant and `CvTemplate` interface live in the frontend feature module…to keep the library free of runtime values") implies `CvTemplateId` was also moved for consistency. Spec originally put it in shared datatypes. This is a documented trade-off; consequence is that the backend cannot import `CvTemplateId` if needed in future.

2. **Template name for `'ats'`**: Spec specifies `name: 'ATS-Optimized'`. Implementation uses `name: 'Default'`. This is a product-level deviation — the card renders "Default" not "ATS-Optimized". The dialog header will say "Default — Preview".

3. **`CvTemplate.accentColor` field**: Added on the interface compared to the spec's `CvTemplate` definition (spec had `id`, `name`, `description` only). The plan explicitly adds `accentColor` in Step 2. This is an intentional, plan-approved addition.

4. **Dialog content style**: Plan specifies `[style]="{ width: '800px' }"`. Implementation uses `[style]="{ width: '840px' }"`. Minor; no functional impact.

5. **Modern template missing Projects section**: The `cv-template-preview.html` Modern case (`@case ('modern')`) does not render the Projects section. ATS and Executive both render it. This is a spec omission — the spec (§Template Visual Specs) doesn't explicitly call out Projects for Modern, but the spec states "Each section checks its data array/value is non-null/non-empty before rendering" for all three. This is a missing section in the Modern preview template.

6. **Executive template missing Projects section**: Same issue — Projects are also absent from the Executive `@case` block. Both ATS has it; Modern and Executive do not.

---

### Null Safety Issues

1. **`cv-template-preview.html` — non-null assertion on `cv()!`**: Throughout the template, `cv()!.contact`, `cv()!.experience`, etc. are accessed after the `@if (!cv())` guard at line 1. The guard ensures `cv()` is truthy inside the `@else` branch, making the non-null assertions safe. This pattern is correct but relies on Angular's control flow evaluation order being maintained.

2. **`cv-export.service.ts` line 116 — `PDF_PROFILES[templateId]`**: If `templateId` were somehow not a valid key, this would return `undefined` and crash. Since `CvTemplateId` is a union type and the map is `Record<CvTemplateId, PdfStyleProfile>`, TypeScript guarantees all keys are present at compile time. Safe.

None requiring a fix.

---

### Code Smells

1. **Template selector uses `document.querySelector` (line 72 in `cv-template-selector.ts`)**: `focusCard()` reaches into the global DOM via `document.querySelector`. This bypasses Angular's renderer abstraction and won't work in SSR (though the component is behind `canExportCv()` which implies user interaction, reducing the SSR risk). Prefer `@ViewChildren` / ElementRef approach. Low severity given the context.

2. **`cv-template-preview.html` is very long**: The template is ~300 lines of deeply repeated HTML across three template cases. There is significant duplication of section-rendering patterns. However, the plan explicitly calls for this approach (inline styles, one `@switch` block per `templateId`), and the file is under the 1000-line limit. Acceptable per spec, but noted.

3. **Magic RGB values in `cv-export.service.ts`**: Profile uses `accentR/G/B` numeric fields (lines 46–74) while the DOCX profile uses `accentHex` string fields. The split is intentional (jsPDF uses RGB, docx uses hex), but the inconsistency across the two profile interfaces makes the service harder to audit. Not a blocking issue.

---

### Recommendation

**Fix critical issues before merge**  
The missing Projects section in the Modern and Executive preview templates (plan deviation #5 and #6) is a spec requirement violation — the spec states all sections should render in all templates. This should be fixed before merge. All other issues are non-critical.

Specific fix needed:
- Add the Projects `@for` block to `cv-template-preview.html` inside both the `@case ('modern')` and `@case ('executive')` sections, following the same pattern as the ATS template (lines 89–102).
