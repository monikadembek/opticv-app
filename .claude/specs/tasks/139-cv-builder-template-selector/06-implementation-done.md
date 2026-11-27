# Implementation Done — Task 139-cv-builder-template-selector

Source: commit `3fae323` (`8afe033..3fae323`), 24 files (19 source and test files, 4 task docs, `docs/tasks-list.md`), plus an uncommitted follow-up to `cv-builder.spec.ts` that fixes Critical #1 from `05-code-review.md`.
Inputs: `02-spec.md`, `03-spec-review.md` (PASS WITH ISSUES), `04-implementation-plan.md`, `05-code-review.md`.

## Summary

The Export CV dialog and the ATS Template Information dialog were moved out of `ExportFooter` into a new shared `CvExportDialog` component (`features/cv-optimization/components/cv-export-dialog/`). The new component has a `showCompliance` input that controls the GDPR section. `ExportFooter` now renders `<app-cv-export-dialog>` with `showCompliance` set to `true`. Its public API is unchanged.

These helpers were added:

- `getAllowedTemplateIds(subscription)` in `cv-templates.ts`, now used by both `CvOptimization` and `CvBuilder`
- `toExportFileName(name)` in `shared/utils.ts`
- an optional `fileName` parameter (default `'optimized-cv'`) on `CvExportService.exportToPdf` / `exportToDocx`

The CV Builder now has a fixed footer bar, shown only in the loaded state. It holds an "Export CV" button that opens the shared dialog with `showCompliance` set to `false`. Template choices are limited by subscription tier, and a fallback effect resets a template the tier doesn't allow. PDF and DOCX export use `mergedCv()`, the selected template and accent color, and a file name built from the CV name.

Unit tests were added or updated for every changed unit. In the run recorded in `05-code-review.md`, lint and typecheck passed. The full test run then had 1 failure, a timeout in "opens the export dialog from the footer button". That test now runs in its own `describe` block, where the `CvExportDialog` template is stubbed. With that change, the full `opticv-web` suite passed: 74 files, 1653 tests passed, 10 skipped. `nx build opticv-web` also passed.

## Specification Coverage

| # | Requirement | Status | Note |
| --- | --- | --- | --- |
| A | `CvExportDialog` (`app-cv-export-dialog`, OnPush) with models `visible`, `selectedTemplate`, `accentColor`, `includeGdprClause`; inputs `showCompliance` (default `true`), `allowedTemplateIds` (default: all), `isExportingPdf`, `isExportingDocx`; outputs `exportPdf`, `exportDocx` | Implemented | `cv-export-dialog.ts` |
| A | Export CV `p-dialog` (non-modal, `bottomright`, 420px, not draggable, `export-dialog`) with Template / Compliance / Export CV sections moved unchanged | Implemented | `cv-export-dialog.html` |
| A | Layout select with tier-disabled templates and `(Upgrade to unlock)` suffix; accent select disabled for non-accent templates | Implemented | `templates` / `accentColorDisabled` computeds moved |
| A | Compliance section rendered only when `showCompliance()` is `true` | Implemented | `@if (showCompliance())` |
| A | ATS Template Information dialog with its own `infoDialogVisible`; opening it leaves the export dialog open | Implemented | |
| A | Generic ARIA labels "Export CV to PDF" / "Export CV to DOCX" | Implemented | |
| A | Dialog CSS moved to `cv-export-dialog.css`; footer-bar CSS stays in `export-footer.css` | Implemented | |
| A | Element IDs `export-template-select` / `export-accent-select` unchanged | Implemented | |
| B | `ExportFooter` keeps footer bar, CV Preview dialog and public API | Implemented | |
| B | `ExportFooter` renders `<app-cv-export-dialog>` with two-way bindings, `showCompliance=true`, re-emits `exportPdf` / `exportDocx` | Implemented | `export-footer.html` |
| B | `templates`, `accentColors`, `accentColorDisabled`, `infoDialogVisible` removed from `ExportFooter` | Implemented | |
| C | `getAllowedTemplateIds(subscription)` (FREE when no subscription, `getEffectiveTier` otherwise, `'ALL'` → all IDs) | Implemented | `cv-templates.ts` |
| C | `CvOptimization.allowedTemplateIds` uses `getAllowedTemplateIds` | Implemented | Unused `CV_TEMPLATES`, `getEffectiveTier`, `TIER_LIMITS` imports removed |
| D | `exportToPdf` / `exportToDocx` optional `fileName` (default `'optimized-cv'`), used for `.pdf` / `.docx` | Implemented | |
| D | Optimization page calls without `fileName` | Implemented | `cv-optimization.ts` call sites unchanged |
| E | `toExportFileName(name)`: removes illegal and control characters, collapses whitespace, trims, removes leading and trailing dots, falls back to `'cv'` | Implemented | `shared/utils.ts` |
| F1 | Builder `allowedTemplateIds` from the user profile subscription (FREE while loading) | Implemented | |
| F2 | Builder fallback `effect` resets `selectedTemplate` to `allowed[0] ?? 'default'` | Implemented | |
| F3 | Fixed footer bar, loaded state only, with "Export CV" button (`pi pi-cog`, `size="small"`, `ariaLabel="Export CV"`) that opens the dialog | Implemented | The footer also contains Cancel and Save. Export CV is secondary/outlined (see Deviations) |
| F3 | Footer styles in `cv-builder.css` (64px, white, top border, shadow, full width, `z-index: 100`); `.builder-layout` bottom padding | Implemented | `justify-content: space-between` (see Deviations) |
| F4 | `<app-cv-export-dialog>` in builder with `visible`, `selectedTemplate`, `accentColor`, `allowedTemplateIds`, `showCompliance=false`, `isExporting*`, `exportPdf` / `exportDocx` bindings | Implemented | |
| F5 | `exportCvAsPdf()` / `exportCvAsDocx()`: re-entry guard, loading signal, service call with `mergedCv()`, template, accent and `toExportFileName(name())`, reset in `finally` | Implemented | |
| F6 | Export doesn't save, navigate or change `savedSnapshot`; unsaved-changes guard unchanged | Implemented | |
| F7 | Exported GDPR clause comes from the builder's own Compliance checkbox | Implemented | Via `mergedCv()` |
| Out of scope | No Compliance section in the builder dialog, no persisted template or accent, no builder Preview button, no rendering, backend, Prisma or datatypes changes, no new PostHog events | Implemented | None of these were added |
| Acceptance | Tests: `CvExportDialog` spec (template options, accent disabled, ATS dialog, export emits and loading states, Compliance shown and hidden, close sets `visible=false`) | Implemented | New `cv-export-dialog.spec.ts` |
| Acceptance | Tests: `ExportFooter` (footer bar, dialog opening, pass-through including `showCompliance=true`) | Implemented | |
| Acceptance | Tests: `getAllowedTemplateIds` (none / FREE / BASIC / PRO / lapsed) | Implemented | |
| Acceptance | Tests: `toExportFileName` (ordinary, illegal characters, whitespace, dots, empty) | Implemented | |
| Acceptance | Tests: `CvExportService` default and custom `fileName` | Implemented | |
| Acceptance | Tests: `CvBuilder` (footer only in loaded state, opens dialog, `showCompliance=false`, tier, fallback, export calls and loading signals, `hasUnsavedChanges` unchanged) | Implemented | The plan's "rejected export promise resets loading" test isn't present |
| Acceptance | `nx lint` / `nx typecheck opticv-web` pass | Implemented | Recorded in `05-code-review.md` |
| Acceptance | `nx test opticv-web` passes | Implemented | After the spec fix: 74 files passed, 1653 tests passed, 10 skipped. One earlier full run had a hook timeout in `cover-letter-editor.spec.ts` (a file task 139 didn't change). The next run passed |
| Acceptance | `nx build opticv-web` passes | Implemented | Ran after the spec fix. The output had only the existing CommonJS warnings (e.g. `jspdf`) |

## Files

### Created (4)

- `apps/opticv-web/src/app/features/cv-optimization/components/cv-export-dialog/cv-export-dialog.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-export-dialog/cv-export-dialog.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-export-dialog/cv-export-dialog.css`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-export-dialog/cv-export-dialog.spec.ts`

### Modified (15)

Paths under `apps/opticv-web/src/app/`:

- `features/cv-builder/cv-builder.ts`, `.html`, `.css`, `.spec.ts` (`.spec.ts` also changed after the commit, see Deviation 10)
- `features/cv-optimization/components/export-footer/export-footer.ts`, `.html`, `.css`, `.spec.ts`
- `features/cv-optimization/cv-optimization.ts`
- `features/cv-optimization/cv-templates.ts`, `cv-templates.spec.ts`
- `features/cv-optimization/services/cv-export.service.ts`, `cv-export.service.spec.ts`
- `shared/utils.ts`, `utils.spec.ts`

### Documentation

- `.claude/specs/tasks/139-cv-builder-template-selector/00-raw-task.md`, `02-spec.md`, `03-spec-review.md`, `04-implementation-plan.md` (created)
- `docs/tasks-list.md` (task 139 title and description updated)

## Components

| Component (from plan) | Status | Location |
| --- | --- | --- |
| `CvExportDialog` (new) | Exist | `features/cv-optimization/components/cv-export-dialog/` |
| `ExportFooter` (modified, uses `CvExportDialog`) | Exist | `features/cv-optimization/components/export-footer/` |
| `CvBuilder` (modified: `allowedTemplateIds`, `exportDialogVisible`, `isExportingPdf`, `isExportingDocx`, fallback effect, `exportCvAsPdf`, `exportCvAsDocx`) | Exist | `features/cv-builder/` |
| `CvOptimization` (modified `allowedTemplateIds`) | Exist | `features/cv-optimization/` |
| `CvExportService` (modified, `fileName` parameter) | Exist | `features/cv-optimization/services/` |
| `getAllowedTemplateIds` | Exist | `features/cv-optimization/cv-templates.ts` |
| `toExportFileName` | Exist | `shared/utils.ts` |

## Stores

| Store (from plan) | Status | Note |
| --- | --- | --- |
| None planned | — | No store changes. `UserSettingsApiService.userProfile` (existing) is read by `CvBuilder` |

## Deviations

1. The builder footer contains Cancel and Save in a `.builder-actions` wrapper on the left, and Export CV on the right. Cancel and Save were removed from `.builder-header`. The plan specified a footer with only the Export CV button.
2. The Export CV button in the builder footer uses `severity="secondary"` and `[outlined]="true"`. The plan specified a primary button.
3. `.builder-footer` uses `justify-content: space-between`. The plan copied `flex-end` from `.export-footer`.
4. The builder footer's `aria-label` is `"CV actions"`. The plan specified `"CV export actions"`.
5. `:host { display: block; scroll-padding-bottom: … }` wasn't added to `cv-builder.css`.
6. `toExportFileName` collapses whitespace before removing illegal characters, and then collapses repeated spaces again. The plan listed removal first, then collapsing.
7. The builder test for a rejected export promise (plan §8) isn't present.
8. The builder fallback-effect test uses `TestBed.tick()`. The plan named `fixture.detectChanges()` / `TestBed.flushEffects()`.
9. `cv-export.service.ts` has a formatting-only reflow of the `gdprFooterHeight` assignment.
10. In `cv-builder.spec.ts`, "opens the export dialog from the footer button" moved out of `describe('in the loaded state')` into a new `describe('with a stubbed export dialog template')`. That block calls `TestBed.overrideComponent(CvExportDialog, { set: { template: '' } })` before compiling. `setup()` takes an optional `beforeCompile` callback for this. The plan didn't specify this test structure.

## Additional Implementation

> Additional implementation not covered by the original documents.

1. **Builder grid column width.** At ≥1024px, `.builder-content` changed from `minmax(0, 1fr) minmax(0, 480px)` to `minmax(0, 600px) minmax(0, 480px)`.
2. **Save and Cancel moved to the footer.** The builder's Save and Cancel buttons moved from the page header to the fixed footer. A new test asserts the footer layout ("places Cancel/Save on the left and Export CV on the right of the footer").
3. **Dialog close test.** In `cv-builder.spec.ts`, a new test "closes the export dialog when it emits visibleChange(false)" checks that the builder's `exportDialogVisible` is reset when the dialog's `visible` model is set to `false`.
4. **Task description update.** In `docs/tasks-list.md`, task 139's title and description were rewritten ("CV Builder - add export cv dialog").
