### Summary

- Overall result: **PASS WITH ISSUES**
- The core requirement — `position` added to the shared type/DTO/prompt and rendered below the name in all 6 preview templates plus PDF/DOCX export — is implemented correctly and matches the plan's insertion points. However, the diff also carries several out-of-scope changes (global `Montserrat` → `Roboto` font swap, new `.toUpperCase()` name styling for the center-PDF branch and the `minimal` DOCX template) that violate the "minimal footprint" rule and were not called for by the spec or plan. Test coverage for the new field in `cv-export.service.spec.ts` is also incomplete — the fixture carries a `position` value but no assertion verifies it is actually rendered.

### Conventions Violations

#### Critical (must fix before merge)

- **Minimal footprint violation** — `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html`: every `font-family: 'Montserrat', sans-serif` occurrence inside the `modern` and `impact` template cases was changed to `'Roboto', sans-serif` (e.g. lines 490, 784, 820, 840, 910, 942, 972, 994, 1022, 1328, 1365, 1387, 1414, 1461, 1495, 1527, 1551, 1570, 1589). This is a global font rebrand for two templates, unrelated to adding a position line, and is not mentioned anywhere in the spec or plan (rules.md: "Minimal footprint: Only change what is necessary... Do not refactor... outside the scope of the current task").
- **Minimal footprint / new special-casing not in spec** — `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts:619` (`cv.contact.name.toUpperCase()` in the center-aligned PDF branch) and `:1149-1152` / `:1171-1174` (`templateId === 'minimal'` uppercase branching for both name and position in the DOCX default branch). The spec explicitly states: "no truncation/wrapping logic beyond what the existing text rendering... already does... don't add new special-casing" (Edge Cases) and scopes changes to rendering `position`, not altering existing `name` rendering. Uppercasing the name changes existing, unrelated visual output for the center-PDF and minimal-DOCX templates.

#### Non-Critical (should fix)

- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts:630` — `cv.contact.position.toUpperCase()` in the center-PDF branch is inconsistent with every other branch/template, which renders position in normal case. Not necessarily wrong, but undocumented and asymmetric with the other 5 template treatments; worth a one-line justification or aligning with the rest.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Add `position` to extraction prompt `contact` object | Covered | `extract-cv-data.prompt.ts:6,62` |
| Add `position` to `CvContactInfo` shared type | Covered | `datatypes.ts:7` |
| Add `position` to `CvContactInfoDto` | Covered | `cv-response.dto.ts:7-8`, matches spec's exact `@ApiProperty` example |
| Render position below name in all 6 preview templates | Covered | Verified all 6 `@if (cv()!.contact.position)` blocks present (`default`, `classic`, `modern`, `corporate`, `minimal`, `impact`) |
| Render position below name in PDF export (3 branches) | Covered | center (`:625-635`), right-block (`:683-689`), left/band (`:719,741-749`) |
| Render position below name in DOCX export (2 branches) | Covered | `contactRightStack` (`:1139-1141`), default (`:1170-1179`) |
| No line/gap rendered when position is null/missing | Covered | All branches guard with `@if`/`if (cv.contact.position)` |
| Backend test coverage for position pass-through | Covered | `openai.service.spec.ts` new test at line 162 matches plan Step 4 |
| Position visually secondary to name | Covered | Smaller font size / lighter/grey color used consistently in all preview + export locations |
| No optimization-step changes to `contact`/`position` | Covered | No changes found in `apps/opticv-be/src/app/optimization/*` |
| No DB migration | Covered | No Prisma schema/migration changes present |
| Frontend test/fixture updates for new required field | Covered | `cv-a4-preview.spec.ts`, `cv-optimization.spec.ts`, `apply-selections.spec.ts` fixtures updated with `position: null` |
| Export test coverage asserting position is actually rendered | Partial | `cv-export.service.spec.ts:98` adds `position: 'Senior Software Engineer'` to the fixture but no test asserts this text appears in the generated PDF/DOCX output — the field is present but unverified |

### Plan Deviations

- Plan Step 3 only specifies adding a rule preferring "a headline near the name, fall back to most recent role" — the implemented prompt rule (`extract-cv-data.prompt.ts:62`) omits the experience-fallback guidance entirely: `"contact.position" is the candidate's professional title/headline shown near their name (e.g. "Software Engineer"). Use null if no position title can be determined.` The spec's Edge Cases section (line 47) explicitly calls for this fallback ("otherwise the title of the most recent/current experience entry"). This is a partial implementation of the documented extraction heuristic, not just a plan deviation.
- Out-of-scope changes not called for in the plan: global `Montserrat`→`Roboto` font-family swap across `modern`/`impact` templates, and new `.toUpperCase()` styling for `name`/`position` in the center-PDF branch and `minimal` DOCX branch (see Critical issues above).
- Additional files were touched beyond the plan's "Files Changed Summary" list: `apps/opticv-be/src/app/cv/services/cv-extraction.service.spec.ts`, `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.spec.ts`, `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`, `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`, and `docs/tasks-list.md`. These are reasonable/necessary (test fixtures needed `position` to satisfy the updated `CvContactInfo` type; docs list needed updating) and not flagged as violations, but they weren't anticipated in the plan's file list.

### Null Safety Issues

None. All new `position` accesses are guarded (`@if (cv()!.contact.position)` in templates, `if (cv.contact.position)` in PDF/DOCX branches) before use, consistent with the existing `name` guard pattern.

### Code Smells

- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts:683-689,701` — in the right-block PDF branch, `positionY` is initialized to `nameY` and only advanced if `cv.contact.name` is truthy; if `name` is absent but `position` is present, the position line and `nameBlockBottom` calculation still work correctly, but the coupling between `positionY`'s two possible meanings (uninitialized vs. post-name) makes the logic harder to follow than necessary. Not a bug, but worth a comment if kept as-is.
- Magic scaling factors `profile.nameSize * 0.55` / `* 0.6` are repeated across the three PDF branches (`:627`, `:685`, `:727` approx.) with two different values (0.55 vs 0.6) for visually equivalent "position is smaller than name" styling — no named constant, so the discrepancy between branches could be an inconsistency rather than an intentional design choice.

### Recommendation

- **Fix critical issues before merge**: revert the unrelated `Montserrat`→`Roboto` font-family change and the new name/position `.toUpperCase()` special-casing (center-PDF branch, minimal-DOCX branch) unless these were an explicit, separately-approved design change outside this task's scope. Additionally, consider completing the prompt's experience-fallback extraction rule per spec Edge Cases, and add an assertion in `cv-export.service.spec.ts` that verifies `position` text is actually present in generated PDF/DOCX output.
