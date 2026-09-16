# Implementation Plan

Task ID: 112-export-footer-redesign

## Source

- Specification: `.claude/specs/tasks/112-export-footer-redesign/02-spec.md`
- Specification review: `.claude/specs/tasks/112-export-footer-redesign/03-spec-review.md` (PASS WITH ISSUES — no critical issues, proceeding as-is)

## Scope Summary

Restructure `ExportFooter`'s template (`export-footer.html`) and styles (`export-footer.css`) so the fixed bottom bar shows only **Preview** and **Export** buttons. Move the template selector, accent color selector, ATS info button, and GDPR checkbox out of the fixed bar and into a new `p-dialog` (`position="bottomright"`) triggered by the Export button, alongside the existing Export PDF / Export DOCX buttons. No changes to `export-footer.ts` component logic beyond adding one new `signal` for the new dialog's visibility. No changes to the component's public `@Component` API (inputs/outputs/models).

## Files

### Modified

- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.css`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts`

### Not modified (explicitly out of scope)

- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/*`
- `cv-export.service.ts` and any export/PDF/DOCX generation logic

---

## Step 1 — Component class (`export-footer.ts`)

- Add a new private/readonly state signal for the Export dialog visibility, following the existing naming pattern used for `previewVisible` / `infoDialogVisible`:
  - `readonly exportDialogVisible = signal(false);`
- No other changes to inputs, outputs, models, or computed signals — `templates`, `accentColorDisabled`, `accentColors` are reused unchanged inside the new dialog.
- No changes to imports (all needed PrimeNG modules — `ButtonModule`, `DialogModule`, `Select`, `FormsModule` — are already imported).

## Step 2 — Template (`export-footer.html`)

Restructure into three regions: the fixed bar, and three `p-dialog`s (Preview, Export, ATS Info).

### 2a. Fixed bar (`.export-footer`)

- Remove the `.template-selector` block entirely (template `p-select`, accent `p-select`, ATS info button, GDPR checkbox) from the fixed bar.
- Keep only the two buttons currently in `.export-actions`, replacing the three export/preview buttons with exactly two:
  - **Preview** button: unchanged behavior (`(onClick)="previewVisible.set(true)"`), keep the existing responsive pattern (label+icon on `md:inline`, icon-only on `md:hidden`) — same as current Preview button markup, duplicated for both breakpoints.
  - **Export** button: new button, same responsive icon/label pattern as Preview (label+icon on desktop, icon-only with `title="Export"` below 768px), triggers `(onClick)="exportDialogVisible.set(true)"`. Use an appropriate icon (e.g. `pi pi-download` or `pi pi-file-export`) and `ariaLabel="Export CV"`.
- Remove the old `Export PDF` / `Export DOCX` `p-button`s from the fixed bar (they move into the new Export dialog).
- `.export-actions` container structure stays the same (flex row, right-aligned), now wrapping only the Preview and Export button pairs.

### 2b. Preview dialog

- No changes — keep as-is (`previewVisible`, `app-cv-a4-preview` content).

### 2c. New Export dialog

- Add a new `p-dialog` after the Preview dialog:
  - `header="Export CV"` (or similar concise header)
  - `[visible]="exportDialogVisible()"`
  - `(visibleChange)="$event ? null : exportDialogVisible.set(false)"`
  - `[modal]="true"`
  - `position="bottomright"`
  - `[style]="{ width: '420px', maxWidth: '95vw' }"` (width value to be tuned during implementation to fit the moved controls without wrapping; `maxWidth: '95vw'` is required per spec edge case)
  - `[draggable]="false"`
- Dialog body content, moved verbatim (same bindings, same behavior) from the old `.template-selector` block:
  - Template `p-select` (icon + label + select, same `[options]`, `optionLabel`, `optionValue`, `optionDisabled`, `[ngModel]`/`(ngModelChange)` bindings to `selectedTemplate`)
  - Accent color `p-select` (same options, same `[ngModel]`/`(ngModelChange)` bindings to `accentColor`, same `[disabled]="accentColorDisabled()"`, same custom `#selectedItem`/`#item` templates with swatch)
  - ATS info button (same `p-button`, same `(onClick)="infoDialogVisible.set(true)"`)
  - GDPR checkbox (same markup, same `[checked]`/`(change)` bindings to `includeGdprClause`)
  - Export PDF button (same `p-button`, same `[loading]`/`[disabled]` bindings to `isExportingPdf`, same `(onClick)="exportPdf.emit()"`)
  - Export DOCX button (same `p-button`, same `[loading]`/`[disabled]` bindings to `isExportingDocx`, same `(onClick)="exportDocx.emit()"`)
- Layout the moved controls in a simple vertical stack (dialog content is narrower than the old horizontal bar) — group template+accent select together, GDPR checkbox below, PDF/DOCX export buttons at the bottom. Exact spacing/grouping is an implementation-styling detail per spec Assumptions (no mockup provided).

### 2d. ATS Info dialog

- No changes to content — keep as-is. It remains a sibling dialog, still triggered from the button now living inside the Export dialog. PrimeNG dialogs render into an overlay layer, so nesting the trigger inside another `p-dialog`'s content does not require structural changes — the ATS Info `p-dialog` element stays at the same template level (sibling to Preview/Export dialogs, not physically nested inside the Export dialog's template block), matching PrimeNG's standard pattern for stacked/independent dialogs.

## Step 3 — Styles (`export-footer.css`)

- Remove now-unused rules tied to the old horizontal cramped layout:
  - `.template-selector` flex rules and its `@media (max-width: 380px)` gap override (block removed from template).
  - `.template-icon`, `.template-label` (no longer used in the fixed bar).
  - `@media (max-width: 768px)` block's `flex-wrap: wrap`, `height: auto`, `min-height: 64px` — replace with rules that keep the bar single-line/fixed-height at all widths (remove wrapping behavior per spec Behavior point 2).
  - `.accent-select`, `.template-select` min-width/height rules — move/adapt into new dialog-content styles if still needed for sizing within the dialog.
- Keep/adapt:
  - `.export-footer` fixed positioning, sidebar-responsive `left` rules — unchanged (spec requires same fixed positioning behavior).
  - `.export-actions` flex row — unchanged, now governs just two buttons.
  - `::ng-deep .p-select-sm .p-select-label` — keep if template/accent selects retain `size="small"` inside the dialog.
  - `.accent-option`, `.accent-swatch` — keep, reused inside the dialog for the accent color template.
  - `::ng-deep .ats-info-button ...` / `::ng-deep .preview-button ...` hover rule — keep `.preview-button` portion; `.ats-info-button` portion still applies since the button retains its class inside the dialog.
- Add new rules for the Export dialog's internal content layout (new class, e.g. `.export-dialog-content`):
  - Vertical stack layout (`display: flex; flex-direction: column; gap: var(--space-3)` or similar), grouping template/accent selectors, GDPR checkbox, and PDF/DOCX action buttons.
  - Reuse existing spacing tokens (`--space-*`) already used elsewhere in this file for consistency.

## Step 4 — Tests (`export-footer.spec.ts`)

Update/extend per spec Acceptance criteria:

- **Footer content assertions**: add/update tests asserting the fixed `.export-footer` bar renders exactly two `p-button` triggers (Preview, Export) and does NOT contain the template select, accent select, GDPR checkbox, or ATS info button directly (query within `.export-footer` scope, not the whole fixture, since dialogs render as siblings).
- **Export dialog open/close**:
  - `exportDialogVisible` is `false` by default.
  - Clicking the Export button in the footer sets `exportDialogVisible()` to `true`.
  - Dialog closes when `exportDialogVisible` is set to `false` (mirrors existing preview-dialog test pattern).
- **Existing tests relocated, not deleted** — update element queries so they look inside the Export dialog content instead of the top-level fixture where necessary:
  - Template selector tests (`renders a p-select for the template`, disabled options via `allowedTemplateIds`) — open the Export dialog first (`component.exportDialogVisible.set(true); fixture.detectChanges();`) before querying, since PrimeNG dialogs may not render content when `visible` is `false`.
  - Accent color selector tests — same adjustment (open dialog first).
  - ATS info dialog tests (`opens the dialog when the ATS info button is clicked`, content text assertions) — open Export dialog first, then locate the ATS info button inside it.
  - GDPR checkbox tests — open Export dialog first, then query the checkbox.
  - Export PDF / Export DOCX button tests (`emits exportPdf`/`exportDocx`, loading/disabled state) — open Export dialog first, then locate buttons inside it.
- **Preview dialog tests** — unchanged, still triggered directly from the footer's Preview button (no dialog needs to be open first).
- **Collapsed layout tests** — unchanged (`.export-footer` fixed-bar class toggling is unaffected by this restructuring).
- Confirm no test relies on `.template-selector` or the old cramped-wrap CSS class no longer present in the template.

## Step 5 — Verification

Run in order, fixing any failures before moving to the next:

1. `npm exec nx lint opticv-web`
2. `npm exec nx typecheck opticv-web`
3. `npm exec nx test opticv-web -- --testFile=export-footer.spec.ts`
4. `npm exec nx build opticv-web`
5. Manual browser verification (per spec Acceptance):
   - Load the CV optimization results page with the footer visible.
   - Confirm footer shows only Preview and Export buttons, no wrapping, at 375px, 768px, and desktop widths.
   - Click Export → dialog opens anchored bottom-right, contains template select, accent select, ATS info button, GDPR checkbox, Export PDF/DOCX buttons; all function as before.
   - Click ATS info button from within the Export dialog → ATS Info dialog opens on top, Export dialog remains open underneath (stacking check per spec edge case).
   - Trigger an export → dialog remains open, loading/disabled state shows correctly on the corresponding button.
   - Run AXE/accessibility check on the footer and the new Export dialog (focus management, keyboard navigation, ARIA labels) per `.claude/context/conventions.md`.

## Out of Scope (confirmed, no action)

- `cv-optimization.ts` / `cv-optimization.html` — no changes needed, `ExportFooter`'s public API is unchanged.
- CV Preview dialog content/behavior — untouched.
- ATS Template Information dialog content — untouched, only its trigger's location moves.
- Export logic/services (`cv-export.service.ts`, PDF/DOCX generation) — untouched.
- GDPR clause logic, template list, accent color list/data (`cv-templates.ts`) — untouched.
