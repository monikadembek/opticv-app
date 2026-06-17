# Task Specification

## Source

Azure DevOps Task: 48-new-templates

## Goal

Remove the `ats` (Default) and `executive` (Corporate) templates. Keep the current `modern` template (red accent, left-bar section headings) but rename it to `bold`/"Bold", since the new template set introduces its own distinct "Modern" style. Add 5 new templates (`classic`, `modern`, `corporate`, `minimal`, `impact`) matching the look defined in the provided mockup (`ui/OptiCV Resume Templates.html`). The final template set is 6 templates: `bold`, `classic`, `modern`, `corporate`, `minimal`, `impact`. Add a user-selectable `accentColor` parameter (emerald / blue / purple / red / teal) that dynamically recolors the Bold, Modern, Corporate, and Impact templates. Surface the accent color control in `export-footer`, alongside a new info-icon button that opens a dialog explaining ATS-friendliness and how to use the accent color control.

## Context

This affects the CV template system shared across:

- `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts` — template id/metadata definitions (`CvTemplateId`, `CvTemplate`, `CV_TEMPLATES`)
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/` — renders the HTML preview per template id
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/` — card-grid template picker (used elsewhere in the optimization flow)
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/` — dropdown template picker + export actions + (new) accent color control + (new) ATS info dialog
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` — PDF (`jsPDF`) and DOCX (`docx`) export, each driven by per-template style profiles

## Scope

### In scope

- Remove `ats` (Default) and `executive` (Corporate) template ids/configs entirely.
- Rename the current `modern` template (red accent `#e63946`, left-bar section headings, outlined skill pills) to id `bold` / name "Bold". Its structure/layout is otherwise unchanged, but it becomes accent-color-aware (see below) instead of using its previously fixed red accent.
- Add 5 new templates: `classic`, `modern`, `corporate`, `minimal`, `impact`, matching the mockup's visual configs exactly (fonts, sizes, colors, layout per section).
- Final template set (6 total, in this order): `bold`, `classic`, `modern`, `corporate`, `minimal`, `impact`.
- Add `accentColor` as a selectable parameter with exactly 5 options:
  - emerald `#059669`
  - blue `#2563eb`
  - purple `#7c3aed`
  - red `#dc2626`
  - teal `#0891b2`
  - Default: emerald `#059669`.
- Accent color applies dynamically to **Bold**, **Modern**, **Corporate**, and **Impact** templates. **Classic** and **Minimal** are monochrome and ignore `accentColor`.
- Update `cv-template-preview` (HTML preview) to render all 6 templates, parameterized by `accentColor`.
- Update `cv-template-selector` (card grid) to list all 6 templates and pass through `accentColor` to previews, keeping it consistent with `export-footer`.
- Update `export-footer`:
  - Template `<select>` updated to list all 6 templates.
  - Add an accent color control (5 swatches/buttons) next to the template select, enabled/interactive regardless of which template is selected (selecting a non-accent template like Classic/Minimal simply has no visible effect on its own preview, but the control remains available since the user may switch templates).
  - Add a PrimeNG icon button (e.g. `pi pi-info-circle`) next to the template select that opens a `p-dialog` displaying the ATS-friendliness text specified in the raw task, verbatim.
- Update `cv-export.service.ts`:
  - Extend `PdfStyleProfile`/`DocxStyleProfile` (or equivalent) to cover all 6 template ids.
  - Thread `accentColor` through `exportToPdf` / `exportToDocx` so exported files reflect the chosen accent for Bold/Modern/Corporate/Impact, and remain monochrome for Classic/Minimal.
- Update existing unit tests (`cv-templates.spec.ts`, `export-footer.spec.ts`, `cv-template-selector.spec.ts`, and any export-service specs) to match the new template set and accent color behavior.
- `accentColor` state is session/UI-only (component or page-level signal), not persisted to backend/DB or localStorage; it resets on reload.

### Out of scope

- Persisting `accentColor` (or selected template) server-side or in localStorage.
- Any new "tweaks panel" UI element distinct from the accent-color swatches placed inside `export-footer`. The ATS dialog text's reference to a "tweaks panel" is shown verbatim as copy only — it does not require building a separate panel.
- Backend/API changes — this is a frontend-only template/styling task.
- Changing the underlying `CvStructuredData` shape or any AI prompt/extraction logic.

## Behavior

1. **Template definitions** (`cv-templates.ts`):
   - `CvTemplateId` becomes `'bold' | 'classic' | 'modern' | 'corporate' | 'minimal' | 'impact'`.
   - `CV_TEMPLATES` array updated to 6 entries with `id`, `name`, `description` reflecting the new set (the renamed `bold` entry plus the 5 new mockup templates). The `accentColor` field on `CvTemplate` (currently a fixed hex per template) is removed/repurposed, since accent color becomes a user-selected, cross-template parameter rather than a fixed-per-template property — see Data section.
   - A new `AccentColor` type/const (`CV_ACCENT_COLORS`) is introduced: 5 entries of `{ id, name, hex }` for emerald/blue/purple/red/teal, default emerald.

2. **HTML Preview rendering** (`cv-template-preview`):
   - Component accepts an additional `accentColor` input (hex string), defaulting to emerald `#059669`.
   - The existing `bold` `@case` block (currently `'modern'`) is kept, with its hardcoded `#e63946` accent replaced by the `accentColor` input.
   - 5 new `@case` blocks (`classic`, `modern`, `corporate`, `minimal`, `impact`) are added to match the mockup's per-template styles (see Data section for exact per-template style values extracted from the mockup source).
   - For `classic` and `minimal`, all colors are fixed per the mockup (no accent substitution).
   - For `bold`, `modern`, `corporate`, and `impact`, all places that use an accent color (section headings, borders, bullets, skill pills, header bands) bind to the `accentColor` input instead of a hardcoded hex.

3. **Template selector (`cv-template-selector`)**:
   - Card grid lists all 6 templates (`CV_TEMPLATES`).
   - Add an `accentColor` model/input that is passed down to `CvTemplatePreview` for the live preview dialog, consistent with `export-footer`.

4. **Export footer (`export-footer`)**:
   - Template `<select>` lists all 6 templates (unchanged dropdown pattern, ids/names updated).
   - New accent color control: 5 small swatch buttons (one per `CV_ACCENT_COLORS` entry) rendered as selectable swatches (visually indicate the active swatch, e.g. ring/border), bound to a new `accentColor` model (`model<string>('#059669')`).
   - New icon button (PrimeNG `p-button` with `icon="pi pi-info-circle"`, text/rounded style consistent with existing icon usage) placed next to the template select. Clicking it opens a `p-dialog` (reuse the existing dialog pattern: `signal` for visibility, `[modal]="true"`, `[draggable]="false"`) showing the ATS-friendliness text from the raw task, adapted to mention Bold (see Data section for the exact copy).
   - The `CvTemplatePreview` inside the existing preview dialog receives the new `accentColor` input.

5. **Export service (`cv-export.service.ts`)**:
   - `exportToPdf` and `exportToDocx` gain an `accentColor` parameter (hex string, default emerald `#059669`).
   - `PDF_PROFILES` / `DOCX_PROFILES` are rebuilt as 6-entry records keyed by the new `CvTemplateId`s (the existing `modern` entry is renamed to `bold` and its fixed accent driven by the new parameter instead), with each profile's accent-related fields (`accentR/G/B`, `accentHex`) driven by the passed-in `accentColor` for `bold`/`modern`/`corporate`/`impact`, and fixed neutral colors for `classic`/`minimal` (accent input is ignored for these two).
   - Structural styling per template (heading style, font, alignment, skill-chip style, divider style, name casing/letter-spacing, etc.) follows the mockup configuration for the 5 new templates, and the existing `modern` profile's structure is preserved for `bold` (see Data section).

## Edge Cases

- User selects `classic` or `minimal` while a non-default accent color is active: the swatches remain visibly selectable, but the preview/export for those two templates does not change appearance — this is expected, not a bug.
- User selects `bold` (the renamed former "Modern" template): it now follows the selected `accentColor` instead of always rendering with its old fixed red `#e63946` accent.
- User switches `accentColor` while `export-footer`'s preview dialog is open: preview updates live (signal-driven), consistent with how `selectedTemplate` changes currently update the preview.
- No CV data loaded (`mergedCv()` is null): existing "No CV data available" fallback in `cv-template-preview` remains unchanged and applies regardless of template/accent.
- Reload/navigation: `accentColor` resets to the emerald default since it is not persisted (per clarification).

## Data / API

No backend/API or DB changes. Frontend-only data shape changes:

- `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts`:
  - `CvTemplateId = 'bold' | 'classic' | 'modern' | 'corporate' | 'minimal' | 'impact'`
  - `CvTemplate { id: CvTemplateId; name: string; description: string }` (drop the per-template fixed `accentColor` field)
  - `CV_TEMPLATES: CvTemplate[]` — 6 entries (`bold` "Bold" — renamed from the former `modern`/"Modern", description updated to reflect it's now accent-color-driven; `classic` "Classic", `modern` "Modern", `corporate` "Corporate", `minimal` "Minimal", `impact` "Impact"; descriptions to be written analogous to current style, e.g. "Single column, traditional, ATS-safe").
  - New: `AccentColorId = 'emerald' | 'blue' | 'purple' | 'red' | 'teal'`, `AccentColor { id: AccentColorId; name: string; hex: string }`, `CV_ACCENT_COLORS: AccentColor[]` with the 5 entries/hex values below, `DEFAULT_ACCENT_COLOR = '#059669'`.

Per-template style reference. `Bold` retains its current implementation (left-bar headings, outlined skill pills) from the existing `modern` template/profile, just renamed and made accent-color-driven instead of fixed-red. The other 5 are extracted directly from the mockup source (`ui/OptiCV Resume Templates.html`, embedded `configs(accent)` function) — to be ported into both `cv-template-preview` (inline style bindings) and `cv-export.service.ts` (PDF/DOCX profiles):

| Template | Accent-aware? | Name style | Section heading style | Bullet/skill style |
|---|---|---|---|---|
| Bold (renamed from old "Modern") | Yes | 22px bold, Helvetica | Left-accent-bar, accent-colored text | Accent-colored bullet dots; outlined accent skill pills |
| Classic | No | 26px bold, Lato, dark slate, with a divider line under header | Uppercase, bordered-bottom, dark slate (no accent) | Plain bullets, no skill pills (comma list) |
| Modern | Yes | 26px bold, Montserrat | Uppercase, accent-colored text, 2px accent underline | Accent-colored bullet dots; outlined accent skill pills |
| Corporate | Yes | 24px bold, Montserrat, in a light-gray header band with accent bottom border | Uppercase, left-accent-bar, dark text | Neutral filled skill pills (not accent-colored); accent only in header band/section bar |
| Minimal | No | 28px light, uppercase, centered, wide letter-spacing | Centered, uppercase, thin hairline border, gray (no accent) | No skill pills (comma list), centered layout |
| Impact | Yes | 30px extra-bold, Montserrat | White text on accent-colored filled band | Filled accent-colored skill pills; accent bullet dots |

Exact pixel/color values for each field (font sizes, colors, spacing, border widths) for the 5 new templates are defined in the mockup's `configs(accent)` method and must be carried over precisely — see the decoded mockup script for literal values (font sizes 9–30px, colors like `#1e293b`, `#64748b`, `#0f172a`, `#f1f5f9`, `#cbd5e1`, etc., all already enumerated above per template). `Bold` keeps its existing values from the current `cv-template-preview.html` `@case ('modern')` block and `cv-export.service.ts` `modern` profile, with the accent hex/RGB sourced from `accentColor` instead of the hardcoded `#e63946` / `(230, 57, 70)`.

ATS dialog copy (adapted from raw task to include Bold per clarification):

```
All templates are ATS friendly.
All templates follow ATS best practices:
- Single-column layout — no sidebars or tables
- Standard section headings (Summary, Experience, Education, Skills, Languages)
- Clean heading hierarchy (h1 → h2)
- No images, icons, or graphics — pure text
- Standard fonts (Lato + Montserrat)

Use the Accent Color tweak (in the tweaks panel) to try different accent colors — emerald, blue, purple, red, or teal — which updates the Bold, Modern, Corporate, and Impact templates dynamically.
```

## Assumptions

- The mockup's `configs(accent)` JS (decoded from the bundled HTML preview file) is treated as the authoritative visual source of truth for the 5 new templates, since the task description references it directly and no other UI images were provided.
- Per latest clarification, "rename 'Modern' to sth else" means the *current* `modern` template (red accent, left-bar headings) is kept but renamed to `bold`/"Bold", freeing up the "Modern" name for the new mockup template. Bold additionally becomes accent-color-aware (it previously always used a fixed red accent).
- Font usage: mockup relies on Montserrat (headings) and Lato (body), both already loaded as app webfonts per `apps/opticv-web` design tokens; no new font loading work is needed. `Bold` continues using its existing Helvetica-based styling, unchanged apart from the accent color source.
- "Default" template (`ats`) entirely goes away — no template is implicitly pre-selected as the system default beyond whichever the component's `model()` initial value specifies (to be set at implementation time — exact default id can be `bold`, since it is the only carried-over template, or `classic` to match the mockup's initial active tab of index 0; either is acceptable, to be decided during implementation).

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx typecheck opticv-web` passes.
- `npm exec nx test opticv-web` passes, including updated specs for `cv-templates`, `cv-template-selector`, `export-footer`, and any `cv-export.service` specs.
- `npm exec nx lint opticv-web` passes.
- No breaking changes to `CvStructuredData` or backend contracts.
- Manual check: switching templates and accent colors in `export-footer` updates the live preview dialog; PDF and DOCX exports visually match the selected template + accent combination for Bold/Modern/Corporate/Impact, and stay monochrome for Classic/Minimal.
- AXE/WCAG AA: new icon button has an accessible label (e.g. `ariaLabel="ATS template information"`); accent color swatches are operable via keyboard and have accessible names (e.g. `aria-label="Emerald accent color"`) and visible focus state; dialog content is reachable and dismissible via keyboard.
