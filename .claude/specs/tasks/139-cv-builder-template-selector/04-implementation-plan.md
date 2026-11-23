# Implementation Plan — Task 139: CV Builder — add export CV dialog

Sources: `02-spec.md`, `03-spec-review.md` (**PASS WITH ISSUES**, no critical issues).
Scope: frontend only (`apps/opticv-web`). No backend, Prisma or `@opticv/datatypes` changes.

---

## Review findings resolved

| Review item | Resolution |
| --- | --- |
| NC #1: builder tests need a tier source | `cv-builder.spec.ts` provides `{ provide: UserSettingsApiService, useValue: { userProfile: { value: signal(null) } } }`, the same mock shape as `cv-optimization.spec.ts` (L236–240). Tests set `userProfile.value` to change the tier. The builder also gets a `CvExportService` mock (`exportToPdf` / `exportToDocx` as `vi.fn().mockResolvedValue(undefined)`). |
| NC #2: `cv-templates.ts` runtime import | Accepted. `cv-templates.ts` imports `TIER_LIMITS`, `getEffectiveTier`, `SubscriptionTier` and `SubscriptionStatus` from `@opticv/datatypes`. `datatypes` imports nothing from the web app, so there is no cycle. |
| NC #3: mobile preview visibility | No change. On screens under 1024px the dialog covers the preview. The spec doesn't ask for mobile-specific behavior. |
| NC #4: template and accent vs. unsaved changes | No code change. `currentSnapshot` stays `{ name, cv: mergedCv() }`, so template and accent changes don't mark the form dirty. A test confirms this (see §8). |
| NC #5: footer accessibility | The builder footer bar is a `<footer>` element with `aria-label="CV export actions"`. `.builder-layout` gets bottom padding, and `:host` gets `scroll-padding-bottom` equal to the footer height plus spacing, so a focused element is never hidden behind the bar. |
| NC #6: bottom padding value | `.builder-layout { padding-bottom: calc(64px + var(--space-6, 24px)); }`. The other sides keep `var(--space-6, 24px)`. |
| NC #7: Windows reserved names | No change (not in the spec). |
| NC #8: footer test cleanup | `templates`, `accentColors`, `accentColorDisabled` and `infoDialogVisible` are **removed** from `ExportFooter`. Their tests are deleted from `export-footer.spec.ts` and rewritten in `cv-export-dialog.spec.ts`. |
| Unclear: duplicate-click guard | Both: the button's `[disabled]` binding (in the dialog) **and** an early return in the builder handler. |

---

## Frontend Plan

### 1. `cv-templates.ts`: tier helper

File: `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts`

- Import `TIER_LIMITS` and `getEffectiveTier`, plus the types `SubscriptionTier` and `SubscriptionStatus`, from `@opticv/datatypes`.
- Add the exported function:
  `getAllowedTemplateIds(subscription: { tier: SubscriptionTier; status: SubscriptionStatus } | null | undefined): CvTemplateId[]`
  - `const tier = subscription ? getEffectiveTier(subscription.tier, subscription.status) : 'FREE'`
  - `TIER_LIMITS[tier].allowedTemplates === 'ALL'` → `CV_TEMPLATES.map((t) => t.id)`. Otherwise return the list cast to `CvTemplateId[]`, exactly as `cv-optimization.ts` L366–369 does today.

File: `apps/opticv-web/src/app/features/cv-optimization/cv-templates.spec.ts`

- Add a `describe('getAllowedTemplateIds')` with these cases:
  - `null` → `['default', 'classic']`
  - `undefined` → `['default', 'classic']`
  - FREE / ACTIVE → `['default', 'classic']`
  - BASIC / ACTIVE → all 6 IDs
  - PRO / ACTIVE → all 6 IDs
  - a paid tier with a lapsed status: the expected result comes from `getEffectiveTier` (FREE when that function returns FREE for the status). Choose the status value by reading `getEffectiveTier` in `datatypes.ts` L158.

### 2. `CvOptimization`: use the helper

File: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

- Replace the body of `allowedTemplateIds` (L360–370) with
  `computed(() => getAllowedTemplateIds(this.userSettingsApiService.userProfile.value()?.subscription))`.
- Import `getAllowedTemplateIds` from `./cv-templates`. Remove `getEffectiveTier`, `TIER_LIMITS` and `CV_TEMPLATES` from the imports **only if** nothing else in the file uses them (check with grep first).
- No template or HTML change. The existing tests at L1579–1600 must still pass without edits.

### 3. `CvExportService`: optional file name

File: `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

- `exportToPdf(cv, templateId = 'default', accentColor = DEFAULT_ACCENT_COLOR, fileName = 'optimized-cv')`. Change `doc.save('optimized-cv.pdf')` to `` doc.save(`${fileName}.pdf`) ``.
- `exportToDocx(cv, templateId = 'default', accentColor = DEFAULT_ACCENT_COLOR, fileName = 'optimized-cv')`. Change `anchor.download = 'optimized-cv.docx'` to `` `${fileName}.docx` ``.
- Nothing else in the service changes.

File: `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.spec.ts`

- Keep the existing tests "saves the file as optimized-cv.pdf" and "triggers anchor download with optimized-cv.docx" (they cover the default).
- Add tests "saves the PDF with a custom fileName" (`saveMock` called with `'My CV.pdf'`) and "downloads the DOCX with a custom fileName" (`anchor.download === 'My CV.docx'`), using the same mocks as the neighboring tests.

### 4. `toExportFileName` utility

File: `apps/opticv-web/src/app/shared/utils.ts`

- Add the exported function `toExportFileName(name: string): string`. It applies these steps in order:
  1. Remove `/[\\/:*?"<>|\u0000-\u001F]/g`.
  2. Replace `/\s+/g` with `' '`.
  3. `trim()`.
  4. Remove leading and trailing dots (`/^\.+|\.+$/g`).
  5. Trim again, and return `'cv'` if the result is empty.

File: `apps/opticv-web/src/app/shared/utils.spec.ts`

- Add a `describe('toExportFileName')` covering the spec examples:
  - `'My Backend CV'` → `'My Backend CV'`
  - `'  CV: 2026/Q1  '` → `'CV 2026Q1'`
  - `'???'` → `'cv'`
  - `''` → `'cv'`
- Also add:
  - leading and trailing dots: `'..cv..'` → `'cv'`
  - control characters are removed
  - tabs and newlines collapse to single spaces

### 5. New shared component `CvExportDialog`

Folder: `apps/opticv-web/src/app/features/cv-optimization/components/cv-export-dialog/`

Files:

- `cv-export-dialog.ts`
- `cv-export-dialog.html`
- `cv-export-dialog.css`
- `cv-export-dialog.spec.ts`

**`cv-export-dialog.ts`**

- Selector `app-cv-export-dialog`, `ChangeDetectionStrategy.OnPush`, no `standalone` flag.
- Imports: `ButtonModule`, `DialogModule`, `FormsModule`, `Select`.
- API (signatures only):
  - `visible = model<boolean>(false)`
  - `selectedTemplate = model<CvTemplateId>('default')`
  - `accentColor = model<string>(DEFAULT_ACCENT_COLOR)`
  - `includeGdprClause = model<boolean>(false)`
  - `showCompliance = input<boolean>(true)`
  - `allowedTemplateIds = input<CvTemplateId[]>(CV_TEMPLATES.map((t) => t.id))`
  - `isExportingPdf = input<boolean>(false)`
  - `isExportingDocx = input<boolean>(false)`
  - `exportPdf = output<void>()`
  - `exportDocx = output<void>()`
- Internal members, moved from `ExportFooter` without changes:
  - `infoDialogVisible = signal(false)`
  - `accentColors = CV_ACCENT_COLORS`
  - the `templates` computed
  - the `accentColorDisabled` computed

**`cv-export-dialog.html`**

- Move the **Export CV** `<p-dialog>` (`export-footer.html` L39–171) and the **ATS Template Information** `<p-dialog>` (L173–203) here.
- In the Export CV dialog, bind `[visible]="visible()"` and `(visibleChange)="$event ? null : visible.set(false)"`.
- Wrap the Compliance `<section>` in `@if (showCompliance()) { … }`.
- Change the export buttons' `ariaLabel` values to `"Export CV to PDF"` and `"Export CV to DOCX"`.
- Everything else is copied unchanged: IDs, classes, `ng-template #selectedItem/#item`, option bindings and the `position="bottomright"` dialog settings.

**`cv-export-dialog.css`**

- Move these rules from `export-footer.css`:
  - from `::ng-deep .export-dialog .p-dialog-header` through `::ng-deep .export-action-button.p-button:not(:disabled):hover`, which includes `.export-dialog-content`, `.export-dialog-section*`, `.template-field*`, `.accent-select`, `.template-select`, `.accent-option`, `.accent-swatch`, `.ats-info-banner*`, `.gdpr-card*`, `.export-dialog-actions` and `::ng-deep .export-action-button*`.
- `::ng-deep .preview-button …` stays in `export-footer.css`.

**`cv-export-dialog.spec.ts`**

These tests replace the dialog tests removed from `export-footer.spec.ts`. Set `fixture.componentRef.setInput('visible', true)` before checking DOM inside the dialog.

- Visibility:
  - the dialog renders when `visible` is `true`
  - closing it (`visibleChange` with `false`) sets `visible()` to `false`
- Template select:
  - `templates()` has all templates by default
  - templates outside `allowedTemplateIds` are disabled and get the `(Upgrade to unlock)` suffix
  - setting the `selectedTemplate` model works
  - renders `p-select#export-template-select`
- Accent color:
  - the default is `#059669`
  - `accentColors` equals `CV_ACCENT_COLORS`
  - `accentColorDisabled()` is `true` for `classic` and `minimal` and `false` for accent-aware templates
  - setting the `accentColor` model works
- ATS info dialog:
  - hidden by default
  - the banner click opens it
  - its content includes the ATS text
  - opening it leaves the export dialog open
  - it closes
- Compliance:
  - with `showCompliance` `true` (the default), the GDPR checkbox renders and toggling it updates `includeGdprClause`
  - with `showCompliance` `false`, no GDPR checkbox and no "Compliance" heading render
- Export buttons:
  - PDF and DOCX clicks emit `exportPdf` and `exportDocx`
  - loading and disabled states follow `isExportingPdf` / `isExportingDocx`
  - the ARIA labels are `"Export CV to PDF"` and `"Export CV to DOCX"`

### 6. `ExportFooter`: use the shared dialog

File: `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`

- Imports become `ButtonModule`, `DialogModule`, `CvA4Preview` and `CvExportDialog`. Remove `FormsModule` and `Select`.
- Keep every public input, model and output unchanged.
- Keep `previewVisible` and `exportDialogVisible`.
- Remove `infoDialogVisible`, `accentColors`, `templates` and `accentColorDisabled`, along with the imports that only they used (`CV_ACCENT_COLORS`, `ACCENT_AWARE_TEMPLATE_IDS`, and `computed` if it's no longer used).

File: `export-footer.html`

- Keep the footer bar and the **CV Preview** dialog.
- Replace the two moved dialogs with a single `<app-cv-export-dialog>`, bound as follows:
  - `[visible]="exportDialogVisible()"` and `(visibleChange)="exportDialogVisible.set($event)"`
  - `[selectedTemplate]="selectedTemplate()"` and `(selectedTemplateChange)="selectedTemplate.set($event)"`
  - the same two-way pattern for `accentColor` and `includeGdprClause`
  - `[showCompliance]="true"`
  - `[allowedTemplateIds]="allowedTemplateIds()"`
  - `[isExportingPdf]="isExportingPdf()"` and `[isExportingDocx]="isExportingDocx()"`
  - `(exportPdf)="exportPdf.emit()"` and `(exportDocx)="exportDocx.emit()"`

File: `export-footer.css`

- Keep only these rules:
  - `.export-footer` and its media queries
  - `.export-actions`
  - `::ng-deep .preview-button …`

File: `export-footer.spec.ts`

- Keep:
  - "should create"
  - the fixed-footer-bar tests
  - the tests that Export sets `exportDialogVisible` and that it closes
- Delete these describes, since their behavior is now covered in `cv-export-dialog.spec.ts`:
  - template selector
  - accent color selector
  - ATS info dialog
  - export buttons (inside export dialog)
- Add tests:
  - `app-cv-export-dialog` is rendered
  - its `showCompliance` is `true`
  - its `allowedTemplateIds`, `selectedTemplate`, `accentColor` and `includeGdprClause` mirror the footer inputs
  - an `exportPdf` / `exportDocx` emitted by the child is re-emitted by the footer
  - the child's `visibleChange` with `false` sets `exportDialogVisible` to `false`
- Look up the child with `fixture.debugElement.query(By.directive(CvExportDialog)).componentInstance`.

`cv-optimization.html` and `cv-optimization.ts` (apart from §2): **no change**.

### 7. `CvBuilder`: footer, dialog and export

File: `apps/opticv-web/src/app/features/cv-builder/cv-builder.ts`

- Imports: add `effect` from `@angular/core`, `UserSettingsApiService`, `CvExportService`, `CvExportDialog`, `getAllowedTemplateIds` (from `../cv-optimization/cv-templates`) and `toExportFileName` (from `../../shared/utils`). Add `CvExportDialog` to the component's `imports`.
- Injections:
  - `private readonly userSettingsApiService = inject(UserSettingsApiService)`
  - `private readonly cvExportService = inject(CvExportService)`
- New state:
  - `readonly allowedTemplateIds = computed(() => getAllowedTemplateIds(this.userSettingsApiService.userProfile.value()?.subscription))`
  - `readonly exportDialogVisible = signal(false)`
  - `readonly isExportingPdf = signal(false)`
  - `readonly isExportingDocx = signal(false)`
- Constructor: add an `effect` that resets the template when it isn't allowed. If `allowedTemplateIds()` doesn't include `selectedTemplate()`, call `selectedTemplate.set(allowed[0] ?? 'default')` (same as `cv-optimization.ts` L638–643).
- New methods:
  - `exportCvAsPdf(): void`
    1. If `isExportingPdf()` is already `true`, return.
    2. Set `isExportingPdf` to `true`.
    3. Call `cvExportService.exportToPdf(this.mergedCv(), this.selectedTemplate(), this.accentColor(), toExportFileName(this.name()))`.
    4. In `.finally(...)`, set `isExportingPdf` to `false`.
  - `exportCvAsDocx(): void`: the same steps with `isExportingDocx` and `exportToDocx`.
- `savedSnapshot`, `currentSnapshot`, `save()` and `canDeactivate()` don't change.

File: `apps/opticv-web/src/app/features/cv-builder/cv-builder.html`

- Inside the main `@else` branch, after the closing `</div>` of `.builder-layout` (still inside the `@else`), add:
  - `<footer class="builder-footer" aria-label="CV export actions">` containing one `<p-button>`:
    - `label="Export CV"`, `icon="pi pi-cog"`, `size="small"`, `ariaLabel="Export CV"`
    - `(onClick)="exportDialogVisible.set(true)"`
  - `<app-cv-export-dialog>`, bound as follows:
    - `[visible]="exportDialogVisible()"` and `(visibleChange)="exportDialogVisible.set($event)"`
    - `[selectedTemplate]="selectedTemplate()"` and `(selectedTemplateChange)="selectedTemplate.set($event)"`
    - `[accentColor]="accentColor()"` and `(accentColorChange)="accentColor.set($event)"`
    - `[showCompliance]="false"`
    - `[allowedTemplateIds]="allowedTemplateIds()"`
    - `[isExportingPdf]="isExportingPdf()"` and `[isExportingDocx]="isExportingDocx()"`
    - `(exportPdf)="exportCvAsPdf()"` and `(exportDocx)="exportCvAsDocx()"`
- The loading and load-error branches don't change, so the footer and dialog aren't rendered in those states.

File: `apps/opticv-web/src/app/features/cv-builder/cv-builder.css`

- `.builder-layout`: add `padding-bottom: calc(64px + var(--space-6, 24px));`.
- Add `:host { display: block; scroll-padding-bottom: calc(64px + var(--space-6, 24px)); }`. Before adding it, check that `:host` isn't already defined.
- Add `.builder-footer`, which copies the `.export-footer` base rule:
  - `position: fixed; bottom: 0; left: 0; right: 0; height: 64px;`
  - `background: #fff;`, plus the same `border-top` and `box-shadow`
  - `display: flex; align-items: center; justify-content: flex-end;`
  - `padding: 0 var(--space-6); gap: var(--space-4); z-index: 100;`
  - Don't add any sidebar offset media queries.
- Add `@media (max-width: 768px) { .builder-footer { padding: 0 var(--space-3); } }`.

### 8. `CvBuilder` tests

File: `apps/opticv-web/src/app/features/cv-builder/cv-builder.spec.ts`

- **Setup** (in both `TestBed.configureTestingModule` blocks, L105 and L500):
  - Add the `UserSettingsApiService` mock `{ userProfile: { value: signal<{ subscription: { tier: string; status: string } | null } | null>(null) } }`.
  - Add the `CvExportService` mock `{ exportToPdf: vi.fn().mockResolvedValue(undefined), exportToDocx: vi.fn().mockResolvedValue(undefined) }`.
  - Declare both mocks at the top of the describe, like the other mocks.
- **New `describe('export')`**:
  - The footer (`footer.builder-footer`) and `app-cv-export-dialog` render in the loaded state.
  - They don't render while loading. Use a `getStructuredData` mock that returns a `Subject` that never emits, with a route ID.
  - They don't render after a load error.
  - Clicking the Export CV button sets `exportDialogVisible()` to `true`, and the dialog child's `visible()` is `true`.
  - The dialog child's `showCompliance()` is `false`.
  - With no profile, `allowedTemplateIds()` is `['default', 'classic']`. After `userProfile.value.set({ subscription: { tier: 'PRO', status: 'ACTIVE' } })`, it has all 6 IDs.
  - Fallback: with the PRO profile, set `selectedTemplate` to `'modern'`, then switch the profile to `null`. After `fixture.detectChanges()` / `TestBed.flushEffects()`, `selectedTemplate()` is `'default'`.
  - `exportCvAsPdf()`:
    - calls `exportToPdf` with `(component.mergedCv(), selectedTemplate, accentColor, toExportFileName(name))`, e.g. name `'My: CV'` gives `'My CV'`
    - `isExportingPdf` is `true` during the call and `false` after the promise settles (`await fixture.whenStable()`)
  - `exportCvAsDocx()`: the same checks with `exportToDocx`.
  - A second `exportCvAsPdf()` while the first is still pending doesn't call the service again (use a deferred promise mock).
  - A rejected export promise still resets `isExportingPdf` to `false`. Attach a `.catch` in the test, or set the mock to reject and assert after a settle step, so no unhandled rejection is logged.
  - Exporting doesn't change `hasUnsavedChanges()` (it stays `false` on a freshly loaded CV) and doesn't call `router.navigate` or any `cvApiService` method.
  - Changing `selectedTemplate` or `accentColor` doesn't set `hasUnsavedChanges()` to `true`.
  - With an empty CV name, `exportToPdf` is called with `'cv'` as the file name.

### 9. Verification

Run from the workspace root:

1. `npm exec nx test opticv-web`
2. `npm exec nx lint opticv-web`
3. `npm exec nx typecheck opticv-web`
4. `npm exec nx build opticv-web`
5. `npm exec nx format:check`. If it fails, run `npm exec nx format:write` on the changed files.

Manual check (`npm exec nx serve opticv-web`):

- **Optimization page:** the footer and export dialog look and behave the same as before, including the Compliance section. Exported files are still named `optimized-cv.pdf` / `optimized-cv.docx`.
- **CV Builder, new and edit modes:**
  - The footer is visible and doesn't cover the last section.
  - The dialog has no Compliance section.
  - Changing the template or accent updates the A4 preview live.
  - A FREE account sees locked templates.
  - PDF and DOCX downloads are named after the CV.
  - The unsaved-changes prompt behaves the same as before.

---

## Planned files

| Status | File |
| --- | --- |
| Create | `apps/opticv-web/src/app/features/cv-optimization/components/cv-export-dialog/cv-export-dialog.ts` |
| Create | `apps/opticv-web/src/app/features/cv-optimization/components/cv-export-dialog/cv-export-dialog.html` |
| Create | `apps/opticv-web/src/app/features/cv-optimization/components/cv-export-dialog/cv-export-dialog.css` |
| Create | `apps/opticv-web/src/app/features/cv-optimization/components/cv-export-dialog/cv-export-dialog.spec.ts` |
| Modify | `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts` |
| Modify | `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html` |
| Modify | `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.css` |
| Modify | `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts` |
| Modify | `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts` |
| Modify | `apps/opticv-web/src/app/features/cv-optimization/cv-templates.spec.ts` |
| Modify | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` |
| Modify | `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` |
| Modify | `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.spec.ts` |
| Modify | `apps/opticv-web/src/app/shared/utils.ts` |
| Modify | `apps/opticv-web/src/app/shared/utils.spec.ts` |
| Modify | `apps/opticv-web/src/app/features/cv-builder/cv-builder.ts` |
| Modify | `apps/opticv-web/src/app/features/cv-builder/cv-builder.html` |
| Modify | `apps/opticv-web/src/app/features/cv-builder/cv-builder.css` |
| Modify | `apps/opticv-web/src/app/features/cv-builder/cv-builder.spec.ts` |
