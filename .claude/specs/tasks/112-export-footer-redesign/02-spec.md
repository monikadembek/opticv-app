# Task Specification

## Source

Azure DevOps Task: 112

## Goal

Redesign `ExportFooter` (`apps/opticv-web/src/app/features/cv-optimization/components/export-footer/`) so the fixed bottom footer shows only two controls — **Preview** and **Export** — instead of the current cluttered row (template select, accent color select, ATS info button, GDPR checkbox, Preview button, Export PDF button, Export DOCX button). Clicking **Export** opens a `p-dialog` positioned at the bottom-right of the page containing the template settings, GDPR checkbox, and the actual export action buttons (PDF/DOCX).

## Context

Component: `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/` (`export-footer.ts`, `.html`, `.css`, `.spec.ts`).

Used in `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` (`<app-export-footer>`), rendered as a fixed bar at the bottom of the CV optimization results page when `canExportCv() && jobApplicationId() && activeResultsTab() === 'cv-analysis'`.

Currently the footer is a single fixed bar (`.export-footer`) containing, left to right:

- Template selector (`p-select`, icon + label)
- Accent color selector (`p-select`, swatch UI)
- ATS info button (opens "ATS Template Information" `p-dialog`)
- GDPR clause checkbox
- Preview button (icon-only on mobile, icon+label on desktop) — opens CV preview `p-dialog`
- Export PDF button
- Export DOCX button

On screens ≤768px the bar wraps (`flex-wrap: wrap`), which is the cramped behavior the task wants removed.

## Scope

### In scope

- Reduce the visible fixed footer to exactly two buttons: **Preview** and **Export**.
- Preview button keeps its current behavior unchanged (opens the existing CV Preview `p-dialog`, unchanged content/behavior).
- Export button opens a new **Export dialog** (`p-dialog`, `position="bottomright"`) containing:
  - Template selector (`p-select`, same options/behavior as today)
  - Accent color selector (same options/behavior/disabled-state logic as today)
  - ATS info button (moved from footer into this dialog, same behavior — opens the existing "ATS Template Information" dialog)
  - GDPR clause checkbox (same behavior)
  - "Export PDF" button (same behavior/loading/disabled state)
  - "Export DOCX" button (same behavior/loading/disabled state)
- Update `export-footer.css` to reflect the simplified footer layout (remove now-unused wrapping/cramped-layout rules for the old inline controls; add styles for the new dialog content layout).
- Update `export-footer.spec.ts` to cover the new structure (see Acceptance).
- Preserve all existing `@Component` inputs/outputs/models on `ExportFooter` (`sidebarExpanded`, `selectedTemplate`, `accentColor`, `includeGdprClause`, `isExportingPdf`, `isExportingDocx`, `mergedCv`, `allowedTemplateIds`, `exportPdf`, `exportDocx`) — the public API of the component does not change, only its internal template/markup.

### Out of scope

- Changes to `cv-optimization.ts` / `cv-optimization.html` beyond what's needed because `ExportFooter`'s public API is unchanged.
- Changes to the CV Preview dialog content/behavior.
- Changes to the ATS Template Information dialog content.
- Changes to export logic/services (`cv-export.service.ts`, PDF/DOCX generation).
- Any changes to GDPR clause logic, template list, or accent color list/data (`cv-templates.ts`).

## Behavior

1. Footer renders as a fixed bottom bar (same fixed positioning behavior as today: full width minus sidebar width, responsive to `sidebarExpanded`) containing only two `p-button`s, right-aligned (or same alignment as current `.export-actions` group): **Preview** and **Export**.
2. On viewports ≤768px, both buttons show icon-only (matching the current small-screen pattern already used for Preview), so the bar no longer needs to wrap — it stays a single-line, fixed-height bar at all widths.
3. Clicking **Preview** opens the existing CV Preview `p-dialog` (`previewVisible` signal) — unchanged.
4. Clicking **Export** opens a new Export dialog (new signal, e.g. `exportDialogVisible`) as a `p-dialog` with `position="bottomright"`, `[modal]="true"`, non-draggable (consistent with the other two dialogs in this component).
5. Inside the Export dialog:
   - Template selector and accent color selector behave exactly as before (same bindings: `selectedTemplate` model, `accentColor` model, `accentColorDisabled` computed, `templates` computed for upgrade-locked labels).
   - ATS info button opens the existing "ATS Template Information" `p-dialog` (`infoDialogVisible` signal) — unchanged content, now triggered from inside the Export dialog instead of the footer.
   - GDPR checkbox behaves exactly as before (`includeGdprClause` model).
   - "Export PDF" / "Export DOCX" buttons behave exactly as before: emit `exportPdf` / `exportDocx` outputs, reflect `isExportingPdf` / `isExportingDocx` loading+disabled state.
6. The Export dialog remains open after triggering an export (no auto-close on click), consistent with current behavior where the footer's export buttons don't close anything — user closes the dialog manually via the dialog's close control or by clicking outside (standard `p-dialog` dismiss behavior).

## Edge Cases

- **Export in progress**: if `isExportingPdf()` or `isExportingDocx()` is `true` while the Export dialog is open, the respective button shows its loading/disabled state inside the dialog (same as today, just relocated).
- **Template upgrade-locked options**: `templates()` computed already disables/labels locked templates ("Upgrade to unlock") — this logic and the `p-select` `optionDisabled` binding must carry over unchanged into the dialog.
- **Accent color disabled**: when the selected template is not accent-aware (`accentColorDisabled()`), the accent color `p-select` remains disabled inside the dialog, same as today.
- **Both dialogs open at once**: opening ATS info from within the Export dialog must not close the Export dialog underneath it (nested/stacked `p-dialog`s — verify PrimeNG handles z-index stacking correctly, same pattern already exists today between the footer and its two dialogs).
- **Small viewport width for bottom-right dialog**: `p-dialog` with `position="bottomright"` must still respect `maxWidth: '95vw'` (or similar) so it doesn't overflow on narrow screens, consistent with the existing dialogs' `[style]` config.

## Data / API

No backend/API changes. No data model changes. Purely a frontend component template/markup restructuring within `ExportFooter`.

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx lint opticv-web` passes.
- `npm exec nx typecheck opticv-web` passes.
- `npm exec nx test opticv-web -- --testFile=export-footer.spec.ts` passes; update/extend tests to cover:
  - Footer renders exactly Preview and Export buttons (no template/accent/GDPR/ATS controls directly in the footer).
  - Clicking Export opens the export dialog; clicking Preview opens the preview dialog.
  - Template select, accent select, GDPR checkbox, ATS info button, Export PDF/DOCX buttons are present and functional inside the export dialog, preserving existing model bindings and emitted outputs (`exportPdf`, `exportDocx`).
- No breaking changes to `ExportFooter`'s public `@Component` API (inputs/outputs/models unchanged) — parent (`cv-optimization.html`) requires no changes.
- Manually verified in browser: footer no longer wraps/cramps at narrow widths (e.g. 375px, 768px); Export dialog appears anchored at bottom-right and is usable at those widths; AXE/accessibility checks pass (labels, focus management, keyboard navigation for the new dialog trigger and its contents), per `.claude/context/conventions.md` accessibility requirements.

## Assumptions

- "Export button" in the task means a single button labeled "Export" (not two separate PDF/DOCX buttons) that opens the dialog; the actual format-specific export actions live inside the dialog. No UI mockup was provided, so exact dialog internal layout (spacing, grouping) follows the existing controls' current styling, just reflowed into a dialog body.
- The Export dialog's PDF/DOCX buttons will use the same labels/icons as the current footer buttons ("Export PDF" / `pi-file-pdf`, "Export DOCX" / `pi-file-word`).
- "Right bottom side of the page" is implemented via PrimeNG's built-in `p-dialog` `position="bottomright"`, per user clarification.
