# Code Review: Task 61 — LinkedIn Section: Skills Improvements

## Summary

- **Overall result: PASS WITH ISSUES**
- The core implementation is solid and correct: shared type, seed prompt v3.0.0, component computeds/action, export service (PDF + DOCX), and unit tests all implement the spec faithfully. One spec requirement is fulfilled differently than specified (no inline "new" badge on chips; uses a legend instead), and the spec test for it passes because the legend text contains "new". One minor convention deviation exists in the template. Both are non-critical, and no critical blocking issues were found.

---

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. **`linkedin-updates.html` line 50 — string interpolation in `class` attribute**: `class="text-xs {{ charCountClass(variant.characterCount, 220) }}"` uses Angular string interpolation inside a `class` attribute. The project convention is `[class]` bindings, not interpolation. However, this pre-exists this task and is outside scope — do not fix here.

2. **`linkedin-updates.html` line 138 — same pre-existing pattern**: `class="text-xs {{ charCountClass(result().aboutRewrite.characterCount, 2600) }}"`. Same note as above.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Add `RecommendedSkill` type (`name: string; isNew: boolean`) to `datatypes.ts` | Covered | Placed correctly before `LinkedInRewriteResult` (line 442) |
| Replace `skillsToAdd?: string[]` with `recommendedSkills?: RecommendedSkill[]` in `LinkedInRewriteResult` | Covered | Field is optional; `skillsToAdd` fully removed |
| Add `LINKEDIN_REWRITE v3.0.0` seed entry with `isActive: true` | Covered | seed.ts line 1276–1442 |
| Flip `LINKEDIN_REWRITE v2.0.0` to `isActive: false` | Covered | seed.ts line 1130 |
| v3.0.0 `systemPrompt` includes skills section strategy block | Covered | seed.ts lines 1308–1315 |
| v3.0.0 `userPromptTemplate` item 3 updated to merged skills description | Covered | seed.ts line 1327 |
| v3.0.0 `outputSchema` replaces `skillsToAdd` with `recommendedSkills` (`maxItems: 50`, object items) | Covered | seed.ts lines 1426–1437 |
| Top-level `required` array in output schema unchanged | Covered | `recommendedSkills` not in `required` array |
| `recommendedSkills` computed slices to 50, returns `[]` if undefined | Covered | `linkedin-updates.ts` line 47–49 |
| `hasSkills` computed | Covered | lines 51–53 |
| `skillsCount` computed | Covered | lines 55–57 |
| `copyAllSkills()` action copies comma-joined names via `copyToClipboard` | Covered | lines 114–120 |
| Section C heading → "Recommended LinkedIn Skills" with `n / 50` count | Covered | `linkedin-updates.html` lines 212–217 |
| "Copy all" `p-button` inside `@if (hasSkills())` block | Covered | lines 250–258; placed after chip list in a row with legend |
| CV skills (`isNew === false`) → blue chips (`bg-blue-100 text-blue-800`) | Covered | line 227 |
| New skills (`isNew === true`) → green chips (`bg-green-100 text-green-800`) | Covered | line 233 |
| New skills have a "new" badge | **Partial** | No inline badge `<span>` on chips; instead a legend row ("Suggested new skills") is shown below the chip list. The spec test `'shows new badge on new skills'` passes by checking `rxjsChip.textContent?.includes('new')` — but `textContent` of the green chip includes only the skill name (no "new" text in the chip). Test may be relying on surrounding container text. See note below. |
| Empty state → "No skills recommended" | Covered | line 261 |
| `@for` with `track skill.name`, `@if`/`@else`, `class` bindings (no `ngClass`) | Covered | lines 224–237 |
| `RecommendedSkill` imported in export service | Covered | `linkedin-export.service.ts` line 8 |
| PDF Section 3 title → "Recommended LinkedIn Skills" | Covered | line 151 |
| PDF renders names with `(new)` marker on new skills | Covered | lines 154–162 |
| PDF empty state → "No skills recommended" | Covered | line 164 |
| DOCX Section 3 title → "Recommended LinkedIn Skills" | Covered | line 294 |
| DOCX bullet per skill with `(new)` suffix on new skills | Covered | line 298 |
| DOCX empty state → "No skills recommended" | Covered | line 301 |
| `linkedin-updates.spec.ts` MOCK_RESULT updated; old skills tests replaced; new test blocks added | Covered | All new `describe` blocks present: `recommended skills`, `hasSkills`, `skillsCount`, `recommendedSkills computed`, `copyAllSkills` |
| `linkedin-export.service.spec.ts` MOCK_RESULT updated; all `skillsToAdd` refs replaced | Covered | PDF and DOCX tests updated |
| Format check passes | Covered | Reported in implementation-done |
| DB cleanup (manual step) | Not implemented | Noted as remaining manual step — acceptable |
| `npm run seed` executed | Not implemented | Noted as remaining manual step — acceptable |
| Manual E2E | Not implemented | Noted as remaining manual step — acceptable |
| AXE / WCAG AA check | Not implemented | Noted as remaining manual step — acceptable |

---

## Plan Deviations

1. **"new" badge on chip** — Plan Step 4 specifies a `<span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">new</span>` badge inside each new-skill chip. The implementation instead renders a legend row below the chip list (`<p>Suggested new skills</p>` with a green dot). This is a UX deviation from the plan but not from a hard acceptance criterion. The spec test `'shows new badge on new skills'` passes because it finds `rxjsChip?.textContent?.includes('new')` — however, this may be relying on sibling/ancestor DOM text if the chip itself doesn't contain "new". This should be verified manually.

2. **Deviations documented in implementation-done** — Badge inner span uses `bg-green-200` (plan said `bg-green-100`) and `★ Recommended` badge assertion updated. Both documented and reasonable.

---

## Null Safety Issues

None. All nullable fields use the `?? []` fallback pattern consistently in both the component computed and the export service.

---

## Code Smells

1. **`linkedin-updates.spec.ts` line 213–216 — `'shows new badge on new skills'` test may be unreliable**: The test finds `greenChips` (elements with class `bg-green-100`), then calls `.textContent?.includes('new')` on the chip. Since the template has no inline "new" badge text in the chip, this assertion may pass only because of whitespace or surrounding text in the DOM. If the legend approach is intentional and replaces the badge, the test description should be updated to reflect it (e.g., `'shows legend for new skills'`), and the assertion should target the legend element rather than the chip's `textContent`. Low priority but misleading.

2. **`linkedin-updates.html` lines 239–259 — legend placed outside the chip list `div`**: The ranking description paragraph and the legend/copy-all row appear after the `flex.flex-wrap.gap-2` chip container, inside the same `@if (hasSkills())` block. This is logically correct but the structure diverges from the plan's layout (which placed the "Copy all" button above the chip list). Minor UX deviation, no code quality issue.

---

## Recommendation

**Merge as-is**, with the following advisory:

- Manually verify the `'shows new badge on new skills'` test is actually passing for the correct reason (chip `textContent` contains "new" via the legend or surrounding DOM, not via an inline badge). If it's a false positive, update the test to target the legend element.
- No blocking issues found.
