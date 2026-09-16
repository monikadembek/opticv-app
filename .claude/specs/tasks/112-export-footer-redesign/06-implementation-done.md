# Implementation Done

Task ID: 112-export-footer-redesign

## Summary

`ExportFooter`'s template was restructured so the fixed bottom bar (`.export-footer`) renders two `p-button`s (Preview, Export CV) instead of the previous seven inline controls. A new `p-dialog` (`exportDialogVisible`, `position="bottomright"`) was added containing the template selector, accent color selector, an ATS info trigger, the GDPR clause checkbox, and the Export PDF / Export DOCX buttons. The component's public `@Component` API (inputs/outputs/models) is unchanged. `export-footer.css` was updated to remove the old horizontal/wrapping layout rules and add new dialog-content layout rules. `export-footer.spec.ts` was updated with new/relocated test groups for the export dialog and its contents.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Footer reduced to exactly two buttons: Preview and Export | Implemented | `export-footer.html:1-20` — two `p-button`s, labels "Preview" and "Export CV" |
| Preview button unchanged behavior | Implemented | `previewVisible.set(true)`, dialog unchanged |
| Export button opens new Export dialog | Implemented | `exportDialogVisible.set(true)`, new `p-dialog` added |
| Export dialog: `position="bottomright"` | Implemented | `export-footer.html:43` |
| Export dialog: `[modal]="true"` | Not implemented | Attribute absent from the Export dialog element (`export-footer.html:39-47`) |
| Export dialog: non-draggable | Implemented | `[draggable]="false"` |
| Buttons show icon-only on ≤768px | Not implemented | Single `p-button` per action with `label` set; no icon-only variant present in template or CSS |
| Fixed bar no longer wraps at narrow widths | Implemented | `flex-wrap`/`min-height` rules removed from the `@media (max-width: 768px)` block in `export-footer.css` |
| Template selector moved into dialog, same bindings | Implemented | Same `optionLabel`/`optionValue`/`optionDisabled`, `selectedTemplate` model |
| Accent color selector moved into dialog, same bindings/disabled logic | Implemented | Same `accentColor` model, `accentColorDisabled()` binding, swatch templates |
| ATS info trigger moved into dialog | Implemented | Now a native `<button class="ats-info-banner">` (previously a `p-button`); opens `infoDialogVisible` |
| GDPR checkbox moved into dialog, same behavior | Implemented | Same `includeGdprClause` model, same aria-label |
| Export PDF button moved into dialog, same behavior | Implemented | Same `isExportingPdf` loading/disabled bindings, same `exportPdf` output |
| Export DOCX button moved into dialog, same behavior | Implemented | Same `isExportingDocx` loading/disabled bindings, same `exportDocx` output |
| Dialog remains open after triggering export | Implemented | No auto-close logic added on `exportPdf`/`exportDocx` emit |
| ATS info dialog unchanged content | Implemented | `export-footer.html:172-198` content unchanged |
| Both dialogs can be open at once (stacking) | Implemented | ATS Info `p-dialog` remains a template-level sibling of the Export dialog |
| `maxWidth: '95vw'` on Export dialog | Implemented | `[style]="{ width: '420px', maxWidth: '95vw' }"` |
| Public `@Component` API unchanged | Implemented | All inputs/outputs/models in `export-footer.ts` preserved verbatim |
| `export-footer.spec.ts` updated to cover new structure | Implemented | New/relocated test groups for footer bar, export dialog, and relocated controls |

## Files

### Modified

- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.css`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts`
- `docs/tasks-list.md`

### Created

- `.claude/specs/tasks/112-export-footer-redesign/00-raw-task.md`
- `.claude/specs/tasks/112-export-footer-redesign/02-spec.md`
- `.claude/specs/tasks/112-export-footer-redesign/03-spec-review.md`
- `.claude/specs/tasks/112-export-footer-redesign/04-implementation-plan.md`
- `.claude/specs/tasks/112-export-footer-redesign/ui/export-cv-modal-design.png`

## Components

| Component | Status |
| --- | --- |
| `ExportFooter` fixed bar (Preview + Export buttons) | Exist |
| Export dialog (`exportDialogVisible`, `position="bottomright"`) | Exist |
| Preview dialog | Exist |
| ATS Info dialog | Exist |

## Stores

Not applicable — no store changes in plan or spec for this task.

## Deviations

- Plan §2a specifies both footer buttons follow a responsive icon-only pattern below 768px (label+icon on desktop, icon-only with `title` attribute below 768px, matching the prior Preview button's dual-markup pattern). The implemented footer contains a single `p-button` per action with no icon-only variant.
- Plan §2c specifies `[modal]="true"` on the Export dialog. The implemented Export dialog does not include a `[modal]` binding.
- Plan §2c/2d describe the ATS info trigger as "the same `p-button`" relocated into the dialog. The implemented trigger is a native `<button class="ats-info-banner">` with new banner-style markup/content, not the original `p-button`.
- Footer Export button label is "Export CV" (`export-footer.html:13`); spec text (02-spec.md, Behavior §1, Assumptions) refers to a button labeled "Export".

## Additional Implementation

Additional implementation not covered by the original documents:

- `.ats-info-banner` styling (`export-footer.css:115-157`) — a new banner-style component (icon, title, description text, chevron) replacing the prior compact `p-button` ATS info trigger; not described in the spec or plan, which both specify relocating the existing `p-button` unchanged.
