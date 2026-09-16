# Implementation Done

Task ID: 48-new-templates

---

## Summary

All 6 planned frontend changes were delivered. The former `modern`/`ats`/`executive` template set was replaced with a new 6-template set. The renamed "Bold" template was implemented under the id `default` (not `bold` as specified in the plan — see Deviations). Five new templates (`classic`, `modern`, `corporate`, `minimal`, `impact`) were added with per-template HTML previews. `accentColor` was introduced as a user-selectable parameter threading through template preview, template selector, export footer, cv-optimization parent, and export service. An accent color dropdown and an ATS info dialog were added to the export footer. Unit tests were updated or created for all affected files.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Remove `ats` (Default) template | Implemented | No `ats` id exists in the new `CV_TEMPLATES` |
| Remove `executive` (Corporate) template | Implemented | No `executive` id exists in the new `CV_TEMPLATES` |
| Keep current `modern` template (renamed) | Implemented | Renamed to id `default` (name "Default"), not `bold`/"Bold" — see Deviations |
| Final template set: 6 entries in order (renamed + 5 new) | Implemented | Order: `default`, `classic`, `modern`, `corporate`, `minimal`, `impact` |
| Add 5 new templates: `classic`, `modern`, `corporate`, `minimal`, `impact` | Implemented | All 5 present in `CV_TEMPLATES` and in `cv-template-preview.html` |
| `CvTemplateId` updated to new 6-template union | Implemented | `'default' \| 'classic' \| 'modern' \| 'corporate' \| 'minimal' \| 'impact'` |
| `CvTemplate` interface: remove per-template `accentColor` field | Implemented | Interface has only `id`, `name`, `description` |
| `AccentColorId` type added | Implemented | `'emerald' \| 'blue' \| 'purple' \| 'red' \| 'teal'` |
| `AccentColor` interface added | Implemented | `{ id, name, hex }` |
| `CV_ACCENT_COLORS` const: 5 entries with correct hex values | Implemented | emerald `#059669`, blue `#2563eb`, purple `#7c3aed`, red `#dc2626`, teal `#0891b2` |
| `DEFAULT_ACCENT_COLOR = '#059669'` | Implemented | |
| `ACCENT_AWARE_TEMPLATE_IDS` const: `['default', 'modern', 'corporate', 'impact']` | Implemented | Reflects `default` instead of `bold` |
| `cv-template-preview`: `accentColor` input added (default emerald) | Implemented | |
| `cv-template-preview`: 6 `@case` blocks (renamed + 5 new) | Implemented | `@case ('default')` replaces old `@case ('modern')` |
| Renamed template case: hardcoded `#e63946` replaced with `accentColor()` bindings | Implemented | All heading borders, bullet dots, skill pill borders/text use `accentColor()` |
| `classic` and `minimal` cases: fixed colors, no `accentColor()` bindings | Implemented | |
| `modern`, `corporate`, `impact` cases: `accentColor()` bindings where specified | Implemented | |
| Existing pipes (AtsContactPipe, DateRangePipe, DegreeFieldPipe) reused in all cases | Implemented | |
| `cv-template-selector`: `accentColor` input added | Implemented | |
| `cv-template-selector`: thumbnail color uses `accentColor()` for accent-aware, neutral for classic/minimal | Implemented | Via `thumbnailColor(id)` method using `ACCENT_AWARE_TEMPLATE_IDS` |
| `cv-template-selector`: `[accentColor]` passed to `<app-cv-template-preview>` | Implemented | |
| `export-footer`: `accentColor` model added (default emerald) | Implemented | |
| `export-footer`: `infoDialogVisible` signal added | Implemented | |
| `export-footer`: `selectedTemplate` default updated from old id to new default | Implemented | Default is `'default'` |
| `export-footer`: accent color control added | Implemented | Implemented as `p-select` dropdown with color swatches (not swatch buttons — see Deviations) |
| `export-footer`: ATS info icon button added (accessible label) | Implemented | `p-button` with `icon="pi pi-info"`, `ariaLabel="ATS template information"` |
| `export-footer`: ATS info `p-dialog` added with adapted copy | Implemented | Dialog visible at `infoDialogVisible()`, contains ATS best-practices text |
| ATS dialog copy mentions "Default, Modern, Corporate, and Impact" | Implemented | Dialog text references "Default, Modern, Corporate, and Impact" (uses `default` naming) |
| `export-footer`: `[accentColor]` passed to preview dialog's `<app-cv-template-preview>` | Implemented | |
| `cv-optimization.ts`: `selectedTemplate` default updated to new id | Implemented | Default is `signal<CvTemplateId>('default')` |
| `cv-optimization.ts`: `accentColor` signal added | Implemented | `signal<string>(DEFAULT_ACCENT_COLOR)` |
| `cv-optimization.ts`: `accentColor` threaded into `exportToPdf` and `exportToDocx` calls | Implemented | Both export calls pass `this.accentColor()` as third argument |
| `cv-optimization.html`: two-way `accentColor` binding on `<app-export-footer>` | Implemented | `[accentColor]` + `(accentColorChange)` bindings present |
| `cv-export.service.ts`: `exportToPdf` / `exportToDocx` accept `accentColor` parameter | Implemented | Third parameter with default `DEFAULT_ACCENT_COLOR` |
| `cv-export.service.ts`: `PDF_PROFILES` rebuilt as 6-entry `Record<CvTemplateId, ...>` | Implemented | All 6 ids present |
| `cv-export.service.ts`: `DOCX_PROFILES` rebuilt as 6-entry `Record<CvTemplateId, ...>` | Implemented | All 6 ids present |
| `cv-export.service.ts`: accent-aware profiles derive `accentR/G/B`/`accentHex` from passed `accentColor` | Implemented | `hexToRgbProfile` called at export time for accent-aware templates |
| `cv-export.service.ts`: `classic` and `minimal` profiles ignore `accentColor` input (fixed neutral values) | Implemented | Both have `accentAware: false` |
| `cv-templates.spec.ts` updated: 6 templates, no `accentColor` field, new `CV_ACCENT_COLORS` / `DEFAULT_ACCENT_COLOR` / `ACCENT_AWARE_TEMPLATE_IDS` tests | Implemented | |
| `cv-template-selector.spec.ts` updated: 6 templates, keyboard navigation over 6 ids, `thumbnailColor` tests | Implemented | |
| `export-footer.spec.ts` updated: new default, accent color dropdown, ATS dialog tests | Implemented | |
| New `cv-export.service.spec.ts`: covers accent-aware vs monochrome behavior, default accent, all 6 ids valid in profiles | Implemented | File created |
| `cv-optimization.spec.ts` updated: export calls verified to include `accentColor` argument | Implemented | |
| `accentColor` is session/UI-only (not persisted) | Implemented | Signal-only, no localStorage or backend writes |
| AXE/WCAG: ATS info button has accessible label | Implemented | `ariaLabel="ATS template information"` |
| AXE/WCAG: accent swatch control keyboard-operable | Implemented | `p-select` is keyboard-operable by default |

---

## Files

### Modified

| File | Change |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts` | New `CvTemplateId` union, new `CV_TEMPLATES` (6 entries), new `AccentColor` types/consts, `DEFAULT_ACCENT_COLOR`, `ACCENT_AWARE_TEMPLATE_IDS` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-templates.spec.ts` | Updated to cover 6 templates, new accent color exports |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.ts` | Added `accentColor` input |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html` | Replaced 3 old `@case` blocks with 6 new ones |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.ts` | Added `accentColor` input, `thumbnailColor()` method |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.html` | Uses `thumbnailColor()`, passes `[accentColor]` to preview |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.spec.ts` | Updated for 6 templates, `thumbnailColor` and keyboard tests |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts` | Added `accentColor` model, `infoDialogVisible` signal, `accentColors` property |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html` | Added accent color `p-select`, ATS info button, ATS info `p-dialog` |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.css` | Added `.accent-select`, `.accent-option`, `.accent-swatch`, `.ats-info-button` styles |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts` | Updated for new default, accent dropdown, ATS dialog |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added `accentColor` signal, updated default template, threaded `accentColor` into export calls |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Added `[accentColor]` + `(accentColorChange)` bindings on `<app-export-footer>` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Updated for new default and `accentColor` argument in export calls |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` | Rebuilt `PDF_PROFILES`/`DOCX_PROFILES` for 6 templates, added `accentColor` parameter |

### Created

| File | Purpose |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.spec.ts` | New spec for export service covering 6-template profiles and accent-color behavior |

---

## Components

| Component | Status |
|---|---|
| `CvTemplatePreview` | Exist |
| `CvTemplateSelector` | Exist |
| `ExportFooter` | Exist |
| `CvOptimization` | Exist |

---

## Stores

No NgRx stores were specified in the plan. `accentColor` is implemented as component-level signals.

| Store | Status |
|---|---|
| (none planned) | N/A |

---

## Deviations from Plan

1. **Renamed template id is `'default'` / name "Default", not `'bold'` / "Bold".** The plan specified renaming the existing `modern` template to id `bold` and name "Bold". The implementation chose id `'default'` and name "Default" instead. All references throughout the codebase (`ACCENT_AWARE_TEMPLATE_IDS`, default signal values, specs, ATS dialog copy) consistently use `'default'`/`"Default"`.

2. **Accent color control in `export-footer` is a `p-select` dropdown, not individual swatch buttons.** The plan specified 5 small swatch `<button>` elements with `aria-pressed`, ring/border active indicator, and `(click)="accentColor.set(color.hex)"`. The implementation uses a PrimeNG `p-select` dropdown with custom `#selectedItem` and `#item` templates that include a color swatch circle and label, bound via `ngModel`. Accessibility is provided by the `p-select` component itself (`ariaLabel="Accent color"`).

3. **ATS dialog copy uses "Default" instead of "Bold".** Consistent with deviation #1 — the closing paragraph in the info dialog reads "Default, Modern, Corporate, and Impact" rather than "Bold, Modern, Corporate, and Impact" as specified.

4. **`cv-optimization.html` uses `[accentColor]` + `(accentColorChange)` instead of `[(accentColor)]` two-way binding syntax.** Functionally equivalent; the plan noted `[(accentColor)]="accentColor"` shorthand. Both forms bind the same model.

---

## Additional Implementation

None.
