# Code Review — Task 48: New Templates

Reviewed against: `02-spec.md`, `04-implementation-plan.md`, and the implementation on branch `48-new-templates`.

---

## Summary

- **Overall result: PASS WITH ISSUES**
- The implementation is largely complete and functional. All 6 templates are wired up, the accent color model flows correctly from `cv-optimization` → `export-footer` → preview and export, unit tests cover the new behavior, and accessibility basics are present. Two spec mismatches stand out: the first template id is `'default'` instead of the spec-required `'bold'`, and the ATS dialog copy diverges from the spec in minor but explicitly-specified ways. No critical safety or build-breaking issues were found.

---

## Conventions Violations

### Critical (must fix before merge)

**1. `CvTemplateId` uses `'default'` where spec requires `'bold'`**
- Files: `cv-templates.ts:2`, `cv-templates.spec.ts:14–22`, `cv-template-preview.html:3`, `cv-template-selector.ts:33`, `export-footer.ts:31`, `cv-optimization.ts:180`, `cv-export.service.ts:68`, `cv-export.service.spec.ts:69–78`, and all test assertions expecting `'default'`.
- The spec (`02-spec.md` § Goal, § Scope, § Behavior, § Data) unambiguously requires the id `'bold'` for the renamed former-"Modern" template, with the name "Bold". The implementation uses `'default'`/`"Default"` throughout — every occurrence in both source and tests. This diverges from every section of the spec and breaks the naming contract.
- **Why critical:** The id is exported as part of the public type `CvTemplateId`, is used in tests, and the ATS dialog copy already refers to "Default" instead of "Bold" (see below), compounding the inconsistency with the spec.

**2. `ACCENT_AWARE_TEMPLATE_IDS` references `'default'` instead of `'bold'`**
- File: `cv-templates.ts:67`.
- Follows from issue #1 but worth flagging as a separate locus.

### Non-Critical (should fix)

**3. ATS dialog copy in `export-footer.html` deviates from spec**
- File: `export-footer.html:134–141`.
- The closing paragraph says `"Accent Color select (in the export section)"` and `"Default, Modern, Corporate, and Impact"`, whereas the spec (`02-spec.md` Data section and Plan-Level Notes) requires `"Accent Color tweak (in the tweaks panel)"` and lists the templates as `"Bold, Modern, Corporate, and Impact"`. The id/name discrepancy is tied to issue #1; the "tweaks panel" vs "export section" phrasing is an independent deviation.
- Note: The spec acknowledges this copy is shown verbatim and the "tweaks panel" phrase is copy-only (no actual panel to build). The implemented text changes "tweaks panel" to "export section" — an editorial improvement in isolation, but it contradicts the spec's explicit "verbatim" instruction.

**4. `export-footer.spec.ts:89` — test assertion still checks for `"Default, Modern, Corporate, and Impact"`**
- File: `export-footer.spec.ts:89`.
- Once issue #1 is corrected to `'bold'`, this test assertion should check for `"Bold, Modern, Corporate, and Impact"`.

**5. `cv-export.service.ts` PDF profiles use `helvetica` for all templates including those specified as `Montserrat`/`Lato` in the spec**
- File: `cv-export.service.ts:85, 109, 134, ...`.
- The spec data table specifies Montserrat for Modern/Corporate/Impact and Lato for Classic. The PDF profiles all set `nameFont: 'helvetica'` and `bodyFont: 'helvetica'` for every template. jsPDF does support custom font embedding. This is a visual fidelity gap — the mockup-sourced values are not ported literally as the spec requires. Non-critical since the implementation plan acknowledged font loading may depend on existing webfonts, but the spec says "carry over precisely."

**6. `cv-export.service.ts` PDF profiles use the default emerald RGB for accent-aware static values**
- File: `cv-export.service.ts:118–120, 142–144, 191–193`.
- `modern`, `corporate`, and `impact` profiles have `accentR: 5, accentG: 150, accentB: 105` hardcoded. These static values are overwritten at call time by `hexToRgbProfile(accentColor)` for accent-aware profiles, so they never actually render. They are harmless but the initial values could be `0` or a comment rather than a misleading stale emerald RGB.

**7. `export-footer.html:47` — info button uses `icon="pi pi-info"` instead of `pi-info-circle`**
- File: `export-footer.html:47`.
- The implementation plan (`04-implementation-plan.md:94`) specifies `icon="pi pi-info-circle"`. The rendered icon is `pi pi-info`, which is a different PrimeIcons glyph (plain "i" vs circled "i"). Minor visual divergence.

**8. `cv-optimization.html` uses one-way bindings with event handlers instead of `[(accentColor)]` two-way binding**
- File: `cv-optimization.html:269–270`.
- The implementation plan (step 13) specifies `[(accentColor)]="accentColor"`. The actual binding is `[accentColor]="accentColor()" (accentColorChange)="accentColor.set($event)"` — which is functionally equivalent but splits the two-way binding into its constituent parts. Not a bug, but deviates from the plan without a clear reason; `[(accentColor)]` is the idiomatic Angular signal-model binding.

**9. `cv-template-preview.html` — section label names in `@case ('default')` are non-standard**
- File: `cv-template-preview.html:62, 73, 107`.
- The section labels in the `default` case are "Professional Summary", "Work Experience", "Technical Skills" — not "Summary", "Experience", "Skills". The spec says the structure/layout is otherwise unchanged from the carried-over `modern` template, so these are carried-over labels. Not a spec violation per se, but they diverge from the ATS dialog's stated standard headings ("Standard section headings (Summary, Experience, Education, Skills, Languages)").

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Remove `ats` (Default) and `executive` (Corporate) template ids | Covered | Both removed; former "Default" replaced by new templates |
| Rename current `modern` to `bold`/"Bold" | Missing | Id is `'default'`/`"Default"` throughout, not `'bold'`/`"Bold"` |
| Add 5 new templates: classic, modern, corporate, minimal, impact | Covered | All 5 added in preview HTML, selector, export service |
| Final template set of 6 in order: bold, classic, modern, corporate, minimal, impact | Partial | Order is correct; first entry is `'default'` not `'bold'` |
| `CvTemplate.accentColor` field removed | Covered | Field not present in new `CvTemplate` interface |
| `AccentColorId`, `AccentColor`, `CV_ACCENT_COLORS`, `DEFAULT_ACCENT_COLOR` added | Covered | All 4 exports present with correct values |
| `ACCENT_AWARE_TEMPLATE_IDS` exported from cv-templates | Covered | Present, but uses `'default'` not `'bold'` |
| `accentColor` input on `CvTemplatePreview` with emerald default | Covered | `input<string>(DEFAULT_ACCENT_COLOR)` at line 19 |
| All 6 template `@case` blocks in `cv-template-preview.html` | Covered | `default`, `classic`, `modern`, `corporate`, `minimal`, `impact` all present |
| Accent color bound in Bold/Modern/Corporate/Impact previews; fixed for Classic/Minimal | Covered | Verified in `@case ('default')` block |
| `accentColor` input on `CvTemplateSelector` | Covered | `input<string>(DEFAULT_ACCENT_COLOR)` at line 35 |
| `thumbnailColor()` uses `accentColor` for accent-aware, neutral for classic/minimal | Covered | Implemented in `cv-template-selector.ts:62–66` |
| Pass `[accentColor]` to preview in selector dialog | Covered | `cv-template-selector.html:88` |
| `accentColor` model on `ExportFooter` | Covered | `model<string>(DEFAULT_ACCENT_COLOR)` at line 32 |
| `selectedTemplate` default changed from `'ats'` to `'bold'` | Partial | Changed from `'ats'` to `'default'` — not `'bold'` |
| Accent color control in `export-footer.html` | Covered | `p-select` with color swatches, not buttons — see plan deviation |
| ATS info button with `ariaLabel` | Covered | `ariaLabel="ATS template information"` present |
| ATS info dialog | Covered | `p-dialog` present with ATS content |
| ATS dialog copy: "Bold, Modern, Corporate, and Impact" | Missing | Text says "Default, Modern, Corporate, and Impact" |
| ATS dialog copy verbatim from spec | Partial | "tweaks panel" changed to "export section" |
| `CvTemplatePreview` in export-footer preview dialog receives `[accentColor]` | Covered | `export-footer.html:113` |
| `exportToPdf` / `exportToDocx` accept `accentColor` parameter | Covered | Both functions accept third `accentColor` param with default |
| PDF/DOCX profiles for all 6 `CvTemplateId`s | Covered | `PDF_PROFILES` and `DOCX_PROFILES` are 6-entry records |
| Accent applied from parameter for bold/modern/corporate/impact | Covered | `hexToRgbProfile(accentColor)` applied for `accentAware: true` profiles |
| Classic/Minimal ignore `accentColor` (fixed neutral) | Covered | `accentAware: false` on both |
| `skillsStyle: 'comma'` for classic and minimal | Covered | Set in both PDF and DOCX profiles |
| `accentColor` signal on `CvOptimization` | Covered | `signal<string>(DEFAULT_ACCENT_COLOR)` at line 181 |
| `accentColor` threaded to `exportToPdf`/`exportToDocx` | Covered | Both call sites pass `this.accentColor()` |
| `[(accentColor)]` binding in `cv-optimization.html` | Partial | Split into `[accentColor]` + `(accentColorChange)` — functionally correct |
| Unit tests for `cv-templates.spec.ts` | Covered | 6-template count, ids, accent color entries tested |
| Unit tests for `cv-template-selector.spec.ts` | Covered | 6 cards, thumbnailColor, keyboard nav over 6 ids |
| Unit tests for `export-footer.spec.ts` | Covered | Accent model, dialog visibility, ATS text spot-check |
| `cv-export.service.spec.ts` (new file) | Covered | New file added with PDF/DOCX coverage for all 6 ids |
| `npm exec nx build/typecheck/test/lint` passing | Unknown | Not run in this review session |
| AXE/WCAG AA: accent swatches keyboard-operable with `aria-label` | Partial | `p-select` is accessible but plan specified button swatches with `aria-label`; `p-select` provides accessibility differently. Meets spirit but deviates from plan. |
| AXE/WCAG AA: info button has accessible label | Covered | `ariaLabel="ATS template information"` set |
| `accentColor` not persisted (session-only) | Covered | Signal only, no localStorage |

---

## Plan Deviations

1. **Accent color control UI**: Plan step 9 specifies 5 native `<button>` swatches with `aria-label="X accent color"` and `aria-pressed` state. Implementation uses a `p-select` dropdown with swatch preview templates. This is a significant UI divergence — the plan's swatch buttons would be visually distinct colored circles; the actual implementation is a dropdown. Both are accessible but the UX differs substantially from what was planned.

2. **`icon="pi pi-info"` vs `"pi pi-info-circle"`**: See Conventions issue #7.

3. **`[(accentColor)]` two-way binding split**: See Conventions issue #8.

4. **`'default'` everywhere instead of `'bold'`**: See Conventions issue #1 — this is also a plan deviation since the plan explicitly lists `'bold'` throughout.

---

## Null Safety Issues

None. All signal reads are guarded (`cv()!` inside `@if (!cv())` or `@else`), optional chaining is used for contact fields, and export service handles null/empty arrays with early checks.

---

## Code Smells

1. **`cv-export.service.ts:118–120, 142–144, 191–193`**: Static accent RGB values in accent-aware profiles are immediately overwritten at call time. These stale placeholder values (emerald RGB) are confusing — they appear to mean something but never render. Could be `accentR: 0, accentG: 0, accentB: 0` or omitted from the literal and only set via the spread.

2. **`cv-export.service.ts:446–448`**: `for (let i = 0; i < lines.length; i++)` in `addBullet` — the inner `if (i < lines.length - 1) y += 14;` on line 447 is a dead branch: the `y += 14` after the loop on line 449 fires for every iteration including the last, making the inner increment never needed when `i === 0`. This was in the pre-existing code (the old `modern` profile) and is not new, but it's a latent bug worth noting.

3. **`cv-template-preview.html`**: Section labels in the `@case ('default')` block ("Professional Summary", "Work Experience", "Technical Skills") differ from the standard ATS headings the dialog claims to use ("Summary", "Experience", "Skills"). No impact on ATS parsing in practice, but inconsistent with the product copy.

---

## Recommendation

**Fix critical issues before merge.**

The single critical issue — `'default'`/`"Default"` used everywhere instead of `'bold'`/`"Bold"` — requires a find-and-replace across `cv-templates.ts`, `cv-templates.spec.ts`, `cv-template-preview.html`, `cv-template-selector.ts` (default model value), `export-footer.ts` (default model value), `cv-optimization.ts` (default signal value), `cv-export.service.ts` (profile key), `cv-export.service.spec.ts` (test ids), and `export-footer.spec.ts` (test assertion string). The ATS dialog copy should also be updated to say "Bold" consistently. All other issues are non-critical style/fidelity gaps.
