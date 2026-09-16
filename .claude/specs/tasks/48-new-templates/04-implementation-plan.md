# Implementation Plan

Task ID: 48-new-templates
Source: `02-spec.md` (review status: PASS WITH ISSUES, see `03-spec-review.md`)

## Plan-Level Notes (carried over from spec review, not new requirements)

These reconcile the two non-critical issues from the review without altering the spec's intent — both are resolved in favor of the spec's more detailed/recent sections, per the review's own recommendation:

- **ATS dialog copy:** Implement the dialog text as the *adapted* version (mentions "Bold, Modern, Corporate, and Impact"), matching spec Behavior §4 and the Data section — not the literal raw-task wording ("Modern, Corporate, and Impact"). The spec's Scope bullet saying "verbatim" is treated as superseded by its own later, more specific sections.
- **"corporate" → `executive` mapping:** The raw task's instruction to remove the "corporate" template is implemented as removing the existing `executive`/"Executive" template entry, since no template literally named "corporate" exists in code today. This is the only candidate match.
- **cv-template-selector / cv-export.service.ts scope:** Included in this plan because `CvTemplateId`/`CV_TEMPLATES` are shared types consumed by both — leaving them on the old 3-template enum would break the build (TypeScript) once `cv-templates.ts` changes.
- **Default selected template:** Set to `'bold'` (the carried-over template, id unchanged in spirit from today's default-adjacent `modern`), since the spec marks this as implementation's choice to make. `cv-optimization.ts` currently defaults `selectedTemplate` to `'ats'`, which no longer exists, so this default must be updated regardless of which id is chosen.

## Files To Change

### 1. `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts`

- Change `CvTemplateId` to `'bold' | 'classic' | 'modern' | 'corporate' | 'minimal' | 'impact'`.
- Change `CvTemplate` interface: remove the `accentColor` field (no longer a fixed per-template property).
- Rewrite `CV_TEMPLATES` to 6 entries in this order: `bold`, `classic`, `modern`, `corporate`, `minimal`, `impact`. Each gets `id`, `name`, `description` only (no `accentColor`):
  - `bold` — "Bold" — description reflecting left-bar accent style, e.g. "Single column, bold accent bar, ATS-safe"
  - `classic` — "Classic" — "Single column, traditional, monochrome, ATS-safe"
  - `modern` — "Modern" — "Single column, accent underline headings, ATS-safe"
  - `corporate` — "Corporate" — "Single column, header band, ATS-safe"
  - `minimal` — "Minimal" — "Single column, ultra-clean, monochrome, ATS-safe"
  - `impact` — "Impact" — "Single column, bold color bands, ATS-safe"
- Add new exports:
  - `type AccentColorId = 'emerald' | 'blue' | 'purple' | 'red' | 'teal'`
  - `interface AccentColor { id: AccentColorId; name: string; hex: string }`
  - `const CV_ACCENT_COLORS: AccentColor[]` — 5 entries: emerald `#059669`, blue `#2563eb`, purple `#7c3aed`, red `#dc2626`, teal `#0891b2`
  - `const DEFAULT_ACCENT_COLOR = '#059669'`
  - `const ACCENT_AWARE_TEMPLATE_IDS: CvTemplateId[] = ['bold', 'modern', 'corporate', 'impact']` (single source of truth for "does this template use accentColor", reused by preview, selector thumbnails, and export service to avoid duplicating the list in 3 places)

### 2. `apps/opticv-web/src/app/features/cv-optimization/cv-templates.spec.ts`

- Update "contains exactly 3 templates" → "contains exactly 6 templates".
- Update id-order assertion to `['bold', 'classic', 'modern', 'corporate', 'minimal', 'impact']`.
- Remove the `accentColor` hex-format assertion on `CvTemplate` (field no longer exists).
- Add new test block for `CV_ACCENT_COLORS`: exactly 5 entries, ids `['emerald', 'blue', 'purple', 'red', 'teal']`, each `hex` matches `/^#[0-9a-fA-F]{6}$/`, all ids unique.
- Add test asserting `DEFAULT_ACCENT_COLOR` equals the emerald entry's hex.
- Add test asserting `ACCENT_AWARE_TEMPLATE_IDS` equals `['bold', 'modern', 'corporate', 'impact']` (order-independent set comparison).

### 3. `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.ts`

- Add `readonly accentColor = input<string>(DEFAULT_ACCENT_COLOR);` (import `DEFAULT_ACCENT_COLOR` from `../../cv-templates`).
- Update `templateId` input type to the new `CvTemplateId` union (already imported from `cv-templates`, no extra import needed beyond existing).

### 4. `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html`

- Replace the `@switch (templateId())` block's 3 cases (`ats`, `modern`, `executive`) with 6 cases (`bold`, `classic`, `modern`, `corporate`, `minimal`, `impact`).
- `@case ('bold')`: port the existing `@case ('modern')` markup as-is, but replace every hardcoded `#e63946` color reference with `{{ accentColor() }}` bindings (heading borders/text, bullet accent dot, skill pill border/text color). Section labels stay as currently written ("Professional Summary", "Work Experience", "Technical Skills", etc.) since the spec states Bold's structure/layout is otherwise unchanged.
- `@case ('classic')`: new markup per spec Data table — 26px bold name (Lato), divider line under header, uppercase section headings with bottom border (dark slate, no accent), plain bullet list (no skill pills, comma-separated skills line), all colors fixed (no `accentColor()` binding).
- `@case ('modern')`: new markup per spec Data table — 26px bold name (Montserrat), uppercase section headings in `accentColor()` with 2px accent underline, accent-colored bullet dots, outlined skill pills using `accentColor()` for border/text.
- `@case ('corporate')`: new markup per spec Data table — 24px bold name (Montserrat) inside a light-gray header band with `accentColor()` bottom border, uppercase left-accent-bar section headings (bar in `accentColor()`, text dark), neutral filled skill pills (gray, not accent-colored).
- `@case ('minimal')`: new markup per spec Data table — 28px light, uppercase, centered name with wide letter-spacing, thin hairline divider, centered uppercase section headings with thin gray border (no accent), no skill pills (comma-separated skills line), all colors fixed.
- `@case ('impact')`: new markup per spec Data table — 30px extra-bold name (Montserrat), white text on `accentColor()`-filled section heading bands, `accentColor()`-filled skill pills, accent-colored bullet dots.
- Exact pixel/spacing/color values for the 5 new cases come from the mockup's `configs(accent)` function (already transcribed into the spec's Data section table and supporting prose) — port literally, not re-derived.
- Reuse the existing pipes (`AtsContactPipe`, `DateRangePipe`, `DegreeFieldPipe`) for contact/date/education formatting in all 6 cases, consistent with current `bold`(`modern`)/old-`ats`/old-`executive` cases.

### 5. `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.ts`

- Add `readonly accentColor = input<string>(DEFAULT_ACCENT_COLOR);` (import from `../../cv-templates`).
- No other logic changes needed; `templates`, `select()`, `openPreview()`, `onKeydown()` already operate generically on `CvTemplateId`/`CV_TEMPLATES`.

### 6. `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.html`

- The thumbnail currently reads `template.accentColor` directly (lines 24 and 30) — this field no longer exists on `CvTemplate`. Replace with a computed per-card color: use `accentColor()` (the new input) when `ACCENT_AWARE_TEMPLATE_IDS.includes(template.id)`, otherwise fall back to a fixed neutral color (e.g. `var(--text-muted)` / `#94a3b8`) for `classic`/`minimal` thumbnails, so non-accent templates don't show a misleading colored bar.
- Pass `[accentColor]="accentColor()"` to `<app-cv-template-preview>` in the preview dialog (line ~87).

### 7. `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.spec.ts`

- Update any fixed expectations tied to the old 3-template list (count, ids, names) to the new 6-template list.
- Update/add assertions that thumbnail color reflects `accentColor()` input for accent-aware templates and stays neutral for `classic`/`minimal`.
- Update keyboard-navigation tests (`ArrowRight`/`ArrowLeft` wraparound) to operate over 6 ids instead of 3.

### 8. `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`

- Add `readonly accentColor = model<string>(DEFAULT_ACCENT_COLOR);` (import `DEFAULT_ACCENT_COLOR`, `CV_ACCENT_COLORS` from `../../cv-templates`).
- Add `readonly accentColors = CV_ACCENT_COLORS;` (for template iteration).
- Add `readonly infoDialogVisible = signal(false);` for the new ATS info dialog.
- `selectedTemplate` model default changes from `'ats'` to `'bold'` (new default per Plan-Level Notes).

### 9. `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html`

- Update the `<select class="template-select">` loop: unchanged structure, now iterates the 6-entry `templates` (from updated `CV_TEMPLATES`).
- Add accent color control next to the template select: 5 swatch buttons, one per `accentColors()` entry, each:
  - rendered as a small round/square color swatch with `background: <hex>`,
  - `[attr.aria-label]="color.name + ' accent color'"`,
  - `[attr.aria-pressed]="accentColor() === color.hex"` for active-state semantics,
  - visually indicates selection (e.g. ring/border) when `accentColor() === color.hex`,
  - `(click)="accentColor.set(color.hex)"`,
  - keyboard-operable by default since it's a native `<button>`.
- Add icon button (PrimeNG `p-button`, `icon="pi pi-info-circle"`, `[text]="true"` or `[rounded]="true"` consistent with existing icon-button usage in the app, `ariaLabel="ATS template information"`) next to the template select, `(onClick)="infoDialogVisible.set(true)"`.
- Add new `p-dialog` (same pattern as the existing preview dialog: `[visible]="infoDialogVisible()"`, `(visibleChange)="$event ? null : infoDialogVisible.set(false)"`, `[modal]="true"`, `[draggable]="false"`) containing the adapted ATS-friendliness text (see Plan-Level Notes — "Bold, Modern, Corporate, and Impact" wording), rendered as a heading + bulleted list + closing paragraph, matching the structure already specified in the spec's Data section.
- Pass `[accentColor]="accentColor()"` to the existing `<app-cv-template-preview>` inside the preview dialog.

### 10. `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.css`

- Add styles for the new accent-swatch row (flex layout, small circular/rounded buttons, gap, border/ring for the active state, focus-visible outline per accessibility requirements) and for the new info icon button placement (inline with `.template-selector`, consistent spacing using existing `var(--space-*)` tokens).

### 11. `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts`

- Update any hardcoded template id/name expectations (dropdown options) to the new 6-template list and new default (`'bold'`).
- Add tests: clicking each accent swatch updates the `accentColor` model; active swatch reflects current `accentColor()`; swatches have accessible names; the info icon button opens the dialog (`infoDialogVisible` signal toggles); dialog content includes the expected ATS text (spot-check key phrases, e.g. "Single-column layout" and "Bold, Modern, Corporate, and Impact").
- Add a keyboard-accessibility check (focus-visible / tab order) consistent with existing test patterns in this spec file, if such patterns already exist for the preview button.

### 12. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

- Change `selectedTemplate` signal default from `signal<CvTemplateId>('ats')` to `signal<CvTemplateId>('bold')`.
- Add `readonly accentColor = signal<string>(DEFAULT_ACCENT_COLOR);` (import `DEFAULT_ACCENT_COLOR` from `./cv-templates`).
- Update the two `cv-export.service` call sites (`exportToPdf(cv, this.selectedTemplate())` and `exportToDocx(cv, this.selectedTemplate())`) to also pass `this.accentColor()` as the new third argument.

### 13. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

- Add `[(accentColor)]="accentColor"` two-way binding to the existing `<app-export-footer ... [(selectedTemplate)]="selectedTemplate">` element.

### 14. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`

- Update any test relying on the old default `selectedTemplate` value (`'ats'`) to the new default (`'bold'`).
- Add/update test(s) verifying `accentColor` is threaded into `exportToPdf`/`exportToDocx` calls (spy assertion on call arguments).

### 15. `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

- Update both `exportToPdf` and `exportToDocx` signatures to accept a third parameter: `accentColor: string = DEFAULT_ACCENT_COLOR` (import from `../cv-templates`).
- Rebuild `PDF_PROFILES` and `DOCX_PROFILES` as `Record<CvTemplateId, ...>` with 6 entries:
  - `bold`: structurally identical to the current `modern` profile (left-bar/leftBar heading style, right-block contact alignment, outlined chips, accent bullet) — but `accentR/accentG/accentB` (PDF) / `accentHex` (DOCX) are no longer hardcoded; they are computed from the passed-in `accentColor` parameter at call time (convert hex → RGB for the PDF profile).
  - `classic`: new profile per spec Data table — underline heading style, left-aligned name/contact, no accent (fixed dark/gray colors for headings/bullets), comma-list skills (no chips) — i.e. `skillsStyle: 'comma'` equivalent, or chips disabled.
  - `modern`: new profile — underline heading style in accent color, left-aligned, outlined accent chips, accent bullet.
  - `corporate`: new profile — filledBand or leftBar heading style (per mockup: left-accent-bar headings + header band for name), accent used only for bars/band borders, neutral filled chips (not accent-colored).
  - `minimal`: new profile — centered name/contact, thin hairline heading style, no accent, no chips (comma list).
  - `impact`: new profile — filledBand heading style (white text on accent-filled band), accent-filled chips, accent bullet.
- For `classic` and `minimal` profiles, the accent parameter is accepted but unused — their profile's accent fields are fixed neutral values (e.g. dark slate / gray), never substituted with the passed-in `accentColor`.
- Adjust any PDF rendering helper functions (`addSectionHeading`, `addSkillChips`, etc.) only if the new templates require a style permutation not already supported by `profile.headingStyle`/`profile.skillsStyle`/`profile.chipsStyle` (e.g. a "comma-list skills, no chips" mode for `classic`/`minimal` — check whether `addSkillChips` needs a sibling "plain comma list" path, or whether skills should simply be rendered via `addWrappedText` for those two templates instead of calling `addSkillChips`).
- DOCX equivalent: ensure the `classic`/`minimal` skills rendering path uses the existing comma-joined `para()` output (already supported by `DocxStyleProfile`'s lack of a chips-list path — confirm current `exportToDocx` skills block always uses `para(cv.skills.join(', '), ...)`, meaning no DOCX code change is needed for comma-list skills, only profile data changes).

### 16. New file: `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.spec.ts`

- No spec file exists today for this service. Per spec's acceptance criteria ("any export-service specs" to update) and to cover new behavior, add a new spec file covering:
  - `exportToPdf`/`exportToDocx` accept and use the `accentColor` parameter for `bold`/`modern`/`corporate`/`impact` (e.g. assert the jsPDF/docx color-setting calls receive the expected RGB/hex derived from a non-default accent color).
  - `exportToPdf`/`exportToDocx` ignore `accentColor` for `classic`/`minimal` (fixed neutral output regardless of input).
  - Default `accentColor` is emerald when omitted.
  - All 6 `CvTemplateId` values are valid keys into `PDF_PROFILES`/`DOCX_PROFILES` (no runtime `undefined` profile lookup).

## Implementation Order

1. `cv-templates.ts` + `cv-templates.spec.ts` (foundation types/constants — everything else depends on this compiling first).
2. `cv-template-preview.ts` + `.html` (rendering logic for all 6 templates).
3. `cv-template-selector.ts` + `.html` + `.spec.ts` (card grid consumer).
4. `export-footer.ts` + `.html` + `.css` + `.spec.ts` (dropdown/swatches/dialog consumer).
5. `cv-optimization.ts` + `.html` + `.spec.ts` (parent wiring: accentColor state + threading into export calls).
6. `cv-export.service.ts` + new `cv-export.service.spec.ts` (PDF/DOCX export parity, last since it's the most isolated and highest-risk for visual regressions).

## Acceptance Checklist (from spec, unchanged)

- `npm exec nx build opticv-web` passes.
- `npm exec nx typecheck opticv-web` passes.
- `npm exec nx test opticv-web` passes.
- `npm exec nx lint opticv-web` passes.
- No breaking changes to `CvStructuredData` or backend contracts.
- Manual check: switching templates and accent colors in `export-footer` updates the live preview dialog; PDF and DOCX exports visually match the selected template + accent combination for Bold/Modern/Corporate/Impact, and stay monochrome for Classic/Minimal.
- AXE/WCAG AA: info icon button has an accessible label; accent swatches are keyboard-operable with accessible names and visible focus state; dialog content is reachable and dismissible via keyboard.
