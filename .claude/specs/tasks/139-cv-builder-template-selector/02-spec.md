# Task Specification

## Source

Azure DevOps Task: 139 — CV Builder: add export CV dialog

## Goal

Let users of the CV Builder pick a **template** and **accent color** and **export the CV they built to
PDF and DOCX**. The export dialog should match the one on the CV Optimization page and follow the same
subscription-tier template limits. To do this without copying code, move the existing export dialog
out of `ExportFooter` into a reusable component that has an option to hide the **Compliance (GDPR)**
section. Both pages then use that component, and the CV Builder hides the Compliance section because it
already has its own GDPR section in the form.

## Context

Frontend only (`apps/opticv-web`). No backend or DB changes.

| Area | File | Current state |
| --- | --- | --- |
| CV Builder page | `apps/opticv-web/src/app/features/cv-builder/cv-builder.{ts,html,css}` | Has `selectedTemplate = signal<CvTemplateId>('default')` and `accentColor = signal(DEFAULT_ACCENT_COLOR)` passed to `<app-cv-a4-preview>`, but nothing in the UI changes them. No export. `mergedCv()` already includes `gdprClause` from the builder's own Compliance card. |
| Optimization export footer | `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.{ts,html,css}` | Fixed bottom bar (Preview + Export CV buttons) plus three dialogs: **CV Preview**, **Export CV** (Template section: Layout select + Accent color select + "New to ATS templates?" banner; Compliance section: GDPR checkbox; Export section: Export PDF / Export DOCX), and **ATS Template Information**. |
| Optimization page | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.{ts,html}` | `allowedTemplateIds` is computed from `UserSettingsApiService.userProfile().subscription` via `getEffectiveTier` + `TIER_LIMITS[tier].allowedTemplates`. An `effect` resets `selectedTemplate` to `allowed[0] ?? 'default'` when the current template isn't allowed. `exportCvAsPdf/Docx()` call `CvExportService` and send PostHog `optimized_cv_exported`. |
| Templates config | `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts` | `CV_TEMPLATES`, `CV_ACCENT_COLORS`, `DEFAULT_ACCENT_COLOR`, `ACCENT_AWARE_TEMPLATE_IDS`. |
| Export service | `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` | `providedIn: 'root'`. `exportToPdf(cv, templateId, accentColor)` / `exportToDocx(...)`. File names are hard-coded: `optimized-cv.pdf`, `optimized-cv.docx`. Does nothing during SSR. |
| Tier limits | `packages/shared/datatypes/src/lib/datatypes.ts` | `TIER_LIMITS.FREE.allowedTemplates = ['default', 'classic']`; BASIC/PRO = `'ALL'`. |
| Shared utils | `apps/opticv-web/src/app/shared/utils.ts` | Has `validateCvName`, `getErrorMessage`. |

Convention note: the CV Builder already reuses components from `features/cv-optimization`
(`SectionCard`, `CvA4Preview`, `cv-templates`). The new shared dialog follows that convention and goes in
`features/cv-optimization/components/`.

The `--sidebar-w` offset in `export-footer.css` belongs to the Optimization page's own sidebar
(`optim-sidebar`). The CV Builder has no sidebar.

## Clarifications (resolved)

| # | Question | Decision |
| --- | --- | --- |
| 1 | How should the export dialog be shared? | **Extract a shared dialog component** with a `showCompliance` input. `ExportFooter` (optimization) and `CvBuilder` both use it. |
| 2 | Where does the builder open the dialog? | A **fixed footer bar** at the bottom of the builder page with an "Export CV" button, like the optimization page. |
| 3 | Can unsaved CVs be exported? | **Yes. Export the current form state** (exactly what the live preview shows), whether it's saved or not. Export doesn't save, and doesn't change the unsaved-changes state. |
| 4 | Download file name? | **Use the CV name**, made safe for file names, falling back to `cv` when the result is empty. The optimization page keeps `optimized-cv.*`. |

## Scope

### In scope

1. **New shared component `CvExportDialog`**
   (`features/cv-optimization/components/cv-export-dialog/cv-export-dialog.{ts,html,css}`): contains
   the **Export CV** dialog and the **ATS Template Information** dialog moved from `ExportFooter`
   without changes, plus a `showCompliance` input that controls the Compliance section.
2. **Refactor `ExportFooter`** to render `<app-cv-export-dialog>` instead of its own export and ATS info
   dialog markup. Its public API (inputs, models, outputs) stays the same, so
   `cv-optimization.html` doesn't change. Its look and behavior don't change.
3. **Shared tier helper** `getAllowedTemplateIds(subscription)` in `cv-templates.ts`. `CvOptimization`
   uses it in `allowedTemplateIds` (same result as today) and so does `CvBuilder`.
4. **`CvExportService`**: add an optional `fileName` (base name without extension) parameter to
   `exportToPdf` and `exportToDocx`, defaulting to `'optimized-cv'`.
5. **File-name helper** `toExportFileName(name: string): string` in `shared/utils.ts`.
6. **CV Builder**:
   - a fixed footer bar with an "Export CV" button
   - the export dialog with `showCompliance = false`
   - template choices limited by tier, and a fallback when the selected template isn't allowed
   - PDF/DOCX export of `mergedCv()` with the selected template, accent color and CV-name-based file name
   - bottom padding so the footer never covers form content
7. Unit tests for all of the above.

### Out of scope

- Compliance/GDPR section in the builder's export dialog (the builder form already has it).
- Saving the selected template or accent color (no DB field exists; the selection resets on every
  page load, as on the optimization page).
- A "Preview" button or dialog in the builder footer (the builder already has a live A4 preview on the
  page).
- Changes to the PDF/DOCX rendering logic, templates or accent colors.
- Backend, Prisma or `@opticv/datatypes` changes.
- New PostHog analytics events (not requested; see Assumptions).
- Moving the CV-template-related files from `cv-optimization` to a shared folder.

## Behavior

### A. Shared `CvExportDialog` component

Selector `app-cv-export-dialog`, `ChangeDetectionStrategy.OnPush`, uses `input()` / `model()` / `output()`.

| Member | Kind | Default | Notes |
| --- | --- | --- | --- |
| `visible` | `model<boolean>` | `false` | Two-way bound by the host. Closing the dialog (X / Esc) sets it to `false`. |
| `selectedTemplate` | `model<CvTemplateId>` | `'default'` | |
| `accentColor` | `model<string>` | `DEFAULT_ACCENT_COLOR` | |
| `includeGdprClause` | `model<boolean>` | `false` | Used only when `showCompliance` is `true`. |
| `showCompliance` | `input<boolean>` | `true` | When `false`, the whole **Compliance** section isn't rendered. |
| `allowedTemplateIds` | `input<CvTemplateId[]>` | all template IDs | |
| `isExportingPdf` / `isExportingDocx` | `input<boolean>` | `false` | |
| `exportPdf` / `exportDocx` | `output<void>` | — | |

Contents (moved from `ExportFooter` without changes, apart from the generic ARIA labels below):

- The **Export CV** `p-dialog` (non-modal, `position="bottomright"`, 420px, not draggable,
  `styleClass="export-dialog"`) with these sections:
  - **Template**:
    - **Layout** `p-select`. Templates the user's tier doesn't allow are disabled and get the
      `(Upgrade to unlock)` suffix (same `templates` computed as today).
    - **Accent color** `p-select` with color swatches. It's disabled when the selected template isn't in
      `ACCENT_AWARE_TEMPLATE_IDS` (same `accentColorDisabled` computed).
    - **"New to ATS templates?"** banner, which opens the ATS info dialog.
  - **Compliance**: GDPR checkbox card, shown only when `showCompliance()` is `true`.
  - **Export CV**: Export PDF / Export DOCX buttons with loading and disabled states from
    `isExportingPdf` / `isExportingDocx`. They emit `exportPdf` / `exportDocx`.
- The **ATS Template Information** dialog (modal, 600px) with the same text and its own `infoDialogVisible`
  signal. Opening it doesn't close the export dialog.
- The export buttons' ARIA labels become generic: `"Export CV to PDF"` / `"Export CV to DOCX"` (today they
  say "optimized CV", which is wrong in the builder).
- The dialog CSS (export-dialog content, section, template field, accent swatch, ATS banner and GDPR card
  styles) moves from `export-footer.css` to `cv-export-dialog.css`. Footer-bar styles stay in
  `export-footer.css`.
- Element IDs in the dialog (`export-template-select`, `export-accent-select`) stay as they are. Each page
  renders only one instance, so the IDs stay unique.

### B. `ExportFooter` (CV Optimization) after the refactor

- Keeps the footer bar (Preview + Export CV buttons), the **CV Preview** dialog and its existing public
  API: `sidebarExpanded`, `selectedTemplate`, `accentColor`, `includeGdprClause`, `isExportingPdf`,
  `isExportingDocx`, `mergedCv`, `allowedTemplateIds`, `exportPdf`, `exportDocx`.
- Renders `<app-cv-export-dialog>` with `[(visible)]` bound to its `exportDialogVisible` signal. It passes
  its models and inputs through, sets `showCompliance` to `true`, and re-emits `exportPdf` / `exportDocx`.
- `templates`, `accentColors`, `accentColorDisabled` and `infoDialogVisible` move into `CvExportDialog`.
- The optimization page looks and behaves the same as before.

### C. Tier helper

`getAllowedTemplateIds(subscription: { tier: SubscriptionTier; status: SubscriptionStatus } | null | undefined): CvTemplateId[]`
in `cv-templates.ts`:

- If there's no subscription, use the `FREE` tier. Otherwise use `getEffectiveTier(tier, status)`.
- If the tier's `allowedTemplates` is `'ALL'`, return every `CV_TEMPLATES` ID. Otherwise return that tier's list.
- `CvOptimization.allowedTemplateIds` becomes
  `computed(() => getAllowedTemplateIds(this.userSettingsApiService.userProfile.value()?.subscription))`,
  which gives the same result as today.

### D. `CvExportService`

- `exportToPdf(cv, templateId = 'default', accentColor = DEFAULT_ACCENT_COLOR, fileName = 'optimized-cv')`
  saves as `` `${fileName}.pdf` ``.
- `exportToDocx(cv, templateId = 'default', accentColor = DEFAULT_ACCENT_COLOR, fileName = 'optimized-cv')`
  downloads as `` `${fileName}.docx` ``.
- The optimization page calls both without the new argument, so its file names don't change.

### E. `toExportFileName(name)`

In `shared/utils.ts`. It turns a CV name into a safe base file name with no extension:

1. Remove characters that aren't allowed in file names: `\ / : * ? " < > |` and control characters
   (U+0000–U+001F).
2. Collapse runs of whitespace into one space and trim the result.
3. Remove leading and trailing dots.
4. If the result is empty, return `'cv'`.

Examples:

- `"My Backend CV"` → `"My Backend CV"`
- `"  CV: 2026/Q1  "` → `"CV 2026Q1"`
- `"???"` → `"cv"`
- `""` → `"cv"`

### F. CV Builder

1. **Allowed templates**: `allowedTemplateIds = computed(() => getAllowedTemplateIds(userSettingsApiService.userProfile.value()?.subscription))`.
   While the profile hasn't loaded yet, the FREE tier applies (same as the optimization page).
2. **Fallback**: an `effect` (same as on the optimization page) sets `selectedTemplate` to
   `allowed[0] ?? 'default'` whenever the selected template isn't in `allowedTemplateIds()`.
3. **Footer bar**: a new fixed bar at the bottom of the viewport, shown only in the loaded editor state
   (the main `@else` branch). It isn't shown in the loading or load-error states. It contains one
   primary button: **"Export CV"** (`pi pi-cog`, `size="small"`, `ariaLabel="Export CV"`), which sets
   `exportDialogVisible` to `true`.
   - It looks like the optimization footer: 64px tall, white background, top border and shadow, actions
     on the right, `z-index: 100`. It spans the full width (`left: 0; right: 0`) because the builder has
     no sidebar.
   - Styles go in `cv-builder.css`. `.builder-layout` gets enough bottom padding (footer height + the
     existing spacing) so the last form section and the preview are never covered.
4. **Dialog**: `<app-cv-export-dialog>` with:
   - `[(visible)]` bound to `exportDialogVisible`
   - `selectedTemplate` and `accentColor` bound to the builder's existing signals
   - `[allowedTemplateIds]="allowedTemplateIds()"`
   - `[showCompliance]="false"`
   - `[isExportingPdf]` / `[isExportingDocx]` from the matching signals
   - `(exportPdf)="exportCvAsPdf()"` and `(exportDocx)="exportCvAsDocx()"`

   Changing the template or accent color updates the live `<app-cv-a4-preview>` straight away, because
   it's already bound to the same signals and the dialog is non-modal.
5. **Export**: `exportCvAsPdf()` and `exportCvAsDocx()`:
   - Do nothing if that format's export is already running.
   - Set the matching `isExporting*` signal to `true`.
   - Call `CvExportService.exportToPdf/Docx(mergedCv(), selectedTemplate(), accentColor(), toExportFileName(name()))`.
   - Reset the signal in `finally`.
6. **State**: exporting doesn't save, doesn't navigate and doesn't change `savedSnapshot`. The
   unsaved-changes guard (`canDeactivate`, `beforeunload`) behaves exactly as before.
7. **GDPR**: the exported CV includes the GDPR clause only if the builder's own Compliance checkbox is
   checked. This already works because `mergedCv().gdprClause` comes from `computeGdprClause()`.

## Edge Cases

- **FREE user** (or a user whose subscription has lapsed): only Default and Classic can be selected.
  Modern, Corporate, Minimal and Impact show as "(Upgrade to unlock)" and are disabled.
- **Profile loads after the page renders**: until it loads, the FREE tier applies. When a paid profile
  arrives, every template unlocks. When a FREE profile arrives and a locked template is selected, the
  fallback effect resets it to `default`.
- **Accent color with a non-accent template** (Classic, Minimal): the Accent color select is disabled. The
  stored accent value is kept and applies again if the user switches back to an accent-aware template.
- **New, unsaved CV** (`/cv-builder` with no ID): export works on the current form state.
- **Empty or invalid CV name** (empty, or longer than the limit): export still works. The file name
  falls back to `cv`, or to the cleaned name if it's long. Saving is still blocked by the existing
  validation.
- **CV with almost no content**: export is allowed and produces a document with whatever content exists.
  The task asks for no minimum-content check.
- **Double click or concurrent export of the same format**: the button shows a loading state and is
  disabled while that export runs, and the handler also ignores repeat calls. Running PDF and DOCX
  exports at the same time is allowed, as on the optimization page.
- **Export while saving**: allowed. If the save succeeds and navigates to the dashboard, the builder and
  its dialog are destroyed. A download already in progress still finishes, because the service promise
  isn't cancelled.
- **SSR**: the service already returns early when not running in the browser. The footer and dialog
  render on the server, but export runs only on click in the browser.
- **Export error** (e.g. jsPDF or docx throws): the loading state resets in `finally`. No error toast,
  as on the optimization page (see Assumptions).
- **Load error or loading state**: the footer and dialog don't render.

## Data / API

- **Endpoints**: none added or changed.
- **DB**: no changes.
- **Shared types (`@opticv/datatypes`)**: no changes. Uses the existing `TIER_LIMITS`, `getEffectiveTier`,
  `SubscriptionTier` and `SubscriptionStatus`.
- **Frontend models and functions**:
  - `getAllowedTemplateIds(subscription)` in `cv-templates.ts` (new).
  - `toExportFileName(name)` in `shared/utils.ts` (new).
  - `CvExportService.exportToPdf/exportToDocx`: new optional 4th parameter `fileName: string`.
  - New component `CvExportDialog` (`features/cv-optimization/components/cv-export-dialog/`).

## Assumptions

1. The builder footer contains only **Export CV**, with no Preview button, because the page already shows
   a live A4 preview.
2. The template and accent selection lasts only for the session (it's not saved), as on the optimization
   page.
3. The builder doesn't send a PostHog event on export, because the task doesn't ask for analytics. If
   one is wanted, it would follow the `optimized_cv_exported` pattern with `page: 'cv_builder'`.
4. A failed export doesn't show an error toast, which matches the current optimization-page behavior.
5. The export buttons' ARIA labels change from "Export optimized CV to …" to "Export CV to …" for both
   pages, since the dialog is now shared.
6. Like the optimization page, the builder footer doesn't need to account for the app's top header. It's
   anchored to the bottom of the viewport.

## Acceptance (DEV)

- `npm exec nx build opticv-web`, `npm exec nx lint opticv-web` and `npm exec nx typecheck opticv-web`
  pass.
- `npm exec nx test opticv-web` passes, with tests added or updated for:
  - **`CvExportDialog`** (new spec; dialog tests moved from `export-footer.spec.ts`):
    - template options and disabled/upgrade labels for `allowedTemplateIds`
    - accent select disabled for non-accent templates
    - ATS info dialog opens and closes
    - export buttons emit, and show loading/disabled states
    - the Compliance section renders when `showCompliance` is `true` and is missing when it's `false`
    - closing the dialog sets `visible` to `false`
  - **`ExportFooter`**:
    - the footer bar still renders the Preview and Export buttons
    - Export opens `app-cv-export-dialog`
    - models, inputs and outputs pass through, including `showCompliance` set to `true`
  - **`getAllowedTemplateIds`**: no subscription (FREE), a FREE subscription, BASIC/PRO (all templates),
    and a lapsed paid status, which falls back through `getEffectiveTier`.
  - **`toExportFileName`**: ordinary names, illegal characters, whitespace collapsing, leading and
    trailing dots, and the empty fallback.
  - **`CvExportService`**: the default file name is still `optimized-cv.{pdf,docx}`, and a custom
    `fileName` is used when one is passed.
  - **`CvBuilder`**:
    - the footer renders only in the loaded state
    - the Export button opens the dialog
    - the dialog has `showCompliance` set to `false`
    - `allowedTemplateIds` follows the tier
    - the fallback effect resets a locked template
    - `exportCvAsPdf` and `exportCvAsDocx` call the service with `mergedCv()`, the selected template, the
      accent color and the cleaned name, and toggle the loading signals
    - export doesn't change `hasUnsavedChanges`
  - **`CvOptimization`**: the existing tests still pass after the switch to `getAllowedTemplateIds`.
- No breaking changes: the optimization page's export footer and dialog look and behave the same, and
  its file names are still `optimized-cv.pdf` / `optimized-cv.docx`.
- Accessibility: the builder footer button has an accessible name. The dialog keeps its existing labels,
  `inputId` associations and keyboard support, and passes AXE checks.
