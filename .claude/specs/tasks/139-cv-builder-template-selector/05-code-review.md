# Code Review — Task 139: CV Builder — add export CV dialog

Reviewed commit: `3fae323` (diff `HEAD~1..HEAD`).
Inputs: `02-spec.md`, `04-implementation-plan.md`, all changed source and spec files under `apps/opticv-web`.

Verification run during review:

| Command | Result |
| --- | --- |
| `npm exec nx typecheck opticv-web` | Pass |
| `npm exec nx lint opticv-web` | Pass (0 errors, 70 warnings, none new in changed files that block) |
| `npm exec nx test opticv-web` (full suite, run twice) | **Fail**: 1 failed / 1651 passed / 10 skipped. The same test failed both times |
| `npm exec nx test opticv-web -- --include='**/cv-builder.spec.ts'` | Pass (62/62) |
| `npm exec nx build opticv-web` | Not run |

---

### Summary

- Overall result: **PASS WITH ISSUES**
- The shared `CvExportDialog` extraction is clean: markup and CSS moved verbatim, `ExportFooter` keeps its public API, and `getAllowedTemplateIds`, `toExportFileName` and the `fileName` parameter on `CvExportService` match the spec. Typecheck and lint pass. However, the full `opticv-web` test suite fails because of one new builder test that times out under load, which breaks the spec's acceptance criterion. The builder footer also goes beyond the spec and plan: it moves Save/Cancel from the header into the footer, makes Export CV a secondary button, and changes the form's grid column width, none of which the spec or plan asked for.

---

### Conventions Violations

#### Critical (must fix before merge)

1. **Full test suite fails (acceptance criterion broken).**
   `apps/opticv-web/src/app/features/cv-builder/cv-builder.spec.ts:778`, the test "opens the export dialog from the footer button", fails with `Error: Test timed out in 5000ms` (it took about 7081 ms) when the whole `opticv-web` suite runs. It failed on both full runs. It passes when `cv-builder.spec.ts` runs alone. The test renders the open PrimeNG `p-dialog` with the complete builder form, which is too slow under full-suite load. Spec §Acceptance requires `npm exec nx test opticv-web` to pass, and CI runs the full suite.

#### Non-Critical (should fix)

1. **Rejected export promise isn't handled.** `cv-builder.ts:395–418`: `exportCvAsPdf()` and `exportCvAsDocx()` chain only `.finally(...)`. If the export fails, the rejection is re-thrown and surfaces as an unhandled promise rejection. This matches the existing optimization-page pattern (`cv-optimization.ts:1770–1775`) and the spec's "no error toast" assumption, so it isn't a regression. It's still noise in the console and in error monitoring.
2. **Leftover header layout rule.** `cv-builder.css:56–61`: `.builder-header` still has `justify-content: space-between` even though the header now contains only the `<h1>`. This is harmless, but the rule no longer does anything.
3. **Unrelated formatting change.** `cv-export.service.ts:399`: the `gdprFooterHeight` assignment was reflowed onto one line. Formatting only, but it's outside the task's footprint (rules: "Minimal footprint").

---

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| A. `CvExportDialog` with `visible`/`selectedTemplate`/`accentColor`/`includeGdprClause` models, `showCompliance`/`allowedTemplateIds`/`isExporting*` inputs, `exportPdf`/`exportDocx` outputs, OnPush | Covered | `cv-export-dialog.ts:22–62`, defaults match the spec table |
| A. Export dialog + ATS info dialog moved unchanged; Compliance wrapped in `@if (showCompliance())` | Covered | `cv-export-dialog.html`. IDs, classes and templates unchanged |
| A. Generic ARIA labels "Export CV to PDF/DOCX" | Covered | `cv-export-dialog.html:121,131` |
| A. Dialog CSS moved to `cv-export-dialog.css`; footer-bar CSS stays | Covered | The CSS diff shows a verbatim move. Only `::ng-deep .preview-button` changed position inside `export-footer.css` |
| B. `ExportFooter` uses shared dialog, keeps public API, `showCompliance=true`, re-emits outputs | Covered | `export-footer.html:39–53`, `export-footer.ts` |
| B. `templates`/`accentColors`/`accentColorDisabled`/`infoDialogVisible` removed from footer | Covered | |
| C. `getAllowedTemplateIds(subscription)` in `cv-templates.ts`; used by `CvOptimization` | Covered | `cv-templates.ts:83–96`, `cv-optimization.ts:359–363` |
| D. `CvExportService` optional `fileName` defaulting to `'optimized-cv'` | Covered | `cv-export.service.ts:359,831,960,1465` |
| E. `toExportFileName` (illegal chars, control chars, whitespace collapse, trim, dots, `'cv'` fallback) | Covered | `utils.ts:67–79`. The order differs from the spec: whitespace is collapsed first, then illegal characters are removed, then repeated spaces are collapsed again. All the spec examples still produce the expected results |
| F1. `allowedTemplateIds` from tier (FREE while profile loads) | Covered | `cv-builder.ts:131–135` |
| F2. Fallback effect resets a locked template | Covered | `cv-builder.ts:175–180` |
| F3. Fixed footer bar, only in loaded state, with **one primary** "Export CV" button (`pi pi-cog`, small, `ariaLabel`), actions on the right | Partial | The footer renders only in the `@else` branch, as required. But it also contains Cancel/Save (moved from the header), Export CV is `severity="secondary" [outlined]="true"` rather than primary, and the CSS uses `justify-content: space-between` rather than placing actions on the right (`cv-builder.html:401–428`, `cv-builder.css:44`) |
| F3. `.builder-layout` bottom padding so footer never covers content | Covered | `cv-builder.css:28` |
| F4. `<app-cv-export-dialog>` bindings incl. `[showCompliance]="false"` | Covered | `cv-builder.html:430–443` |
| F5. Export handlers: re-entry guard, loading signals, `mergedCv()` + template + accent + `toExportFileName(name())`, reset in `finally` | Covered | `cv-builder.ts:395–418` |
| F6. Export doesn't save/navigate or change `savedSnapshot`; unsaved-changes guard unchanged | Covered | `currentSnapshot` is unchanged, and the tests confirm it |
| F7. GDPR in export comes from the builder's own checkbox | Covered | via `mergedCv()` |
| Out of scope: no Preview button in the builder footer, no analytics, no backend changes | Covered | |
| Acceptance: build/lint/typecheck pass | Partial | Lint and typecheck pass. Build wasn't run during this review |
| Acceptance: `nx test opticv-web` passes | **Missing** | See Critical #1 |
| Acceptance tests: `CvExportDialog` spec | Covered | All listed cases present |
| Acceptance tests: `ExportFooter` spec | Covered | |
| Acceptance tests: `getAllowedTemplateIds`, `toExportFileName`, `CvExportService` | Covered | |
| Acceptance tests: `CvBuilder` export tests | Partial | All listed cases are present, but the "rejected export promise still resets `isExportingPdf`" test from plan §8 is missing |
| Accessibility: footer button has an accessible name; dialog labels kept | Covered | |

---

### Plan Deviations

1. **Save/Cancel moved into the footer.** Plan §7 puts a single "Export CV" `<p-button>` in the footer. The implementation removes `.builder-actions` (Cancel/Save) from `.builder-header` and places it in the footer's left side (`cv-builder.html:401–419`), with Export CV on the right. A new test asserts this layout (`cv-builder.spec.ts:288–297`).
2. **Export CV button styling.** The plan says primary. The implementation uses `severity="secondary"` and `[outlined]="true"` (`cv-builder.html:420–428`).
3. **Footer alignment.** The plan copies `justify-content: flex-end`. The implementation uses `space-between` (`cv-builder.css:44`).
4. **Footer ARIA label.** The plan uses `aria-label="CV export actions"`. The implementation uses `"CV actions"` (`cv-builder.html:401`). Given that the footer content changed, the label fits, but it differs from the plan.
5. **`:host` `scroll-padding-bottom` not added.** Plan §7 (resolving review item NC #5) calls for `:host { display: block; scroll-padding-bottom: calc(64px + var(--space-6, 24px)); }`. It isn't in `cv-builder.css`.
6. **Unplanned grid change.** `.builder-content` at ≥1024px changed from `minmax(0, 1fr) minmax(0, 480px)` to `minmax(0, 600px) minmax(0, 480px)` (`cv-builder.css:102`). The spec and plan don't mention this.
7. **Missing test.** Plan §8: "A rejected export promise still resets `isExportingPdf` to `false`". There's no such test in `cv-builder.spec.ts`.
8. **`toExportFileName` step order.** This differs from plan §4 (see Spec Coverage E). The behavior is equivalent for the documented cases.
9. **Fallback test uses `TestBed.tick()`** rather than `fixture.detectChanges()` / `TestBed.flushEffects()`. This is equivalent, but noted for accuracy.

---

### Null Safety Issues

None. `userProfile.value()?.subscription` is guarded with optional chaining, `getAllowedTemplateIds` handles `null`/`undefined`, `allowed[0] ?? 'default'` covers an empty list, and `name()` is a non-null `signal<string>`.

---

### Code Smells

1. **Duplicated footer-bar CSS.** `.builder-footer` (`cv-builder.css:34–55`) copies the `.export-footer` base rule and its mobile media query almost line for line. The plan allows this explicitly, so it's noted only for awareness.
2. **Near-identical export handlers.** `exportCvAsPdf` and `exportCvAsDocx` (`cv-builder.ts:395–418`) differ only in the signal and service method. They mirror the existing optimization-page pattern, so this is acceptable.
3. **Magic value `64px`.** It appears in `cv-builder.css` twice (footer height and layout padding) and also in `export-footer.css`. There's no shared token.

---

### Recommendation

- **Fix critical issues before merge**: make the full `opticv-web` test suite pass. The "opens the export dialog from the footer button" test times out under full-suite load. Also confirm that the unplanned footer changes (Save/Cancel moved into the footer, secondary Export button, grid column width) are intended. If they are, update the spec or plan to match.
