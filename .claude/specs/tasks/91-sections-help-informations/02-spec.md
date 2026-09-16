# Task Specification

## Source

Task 91 — UX: Adding Help information to sections on the CV Optimization page

## Goal

Add a small "info" affordance to the header of every section card on the `cv-optimization`
page. Clicking it opens a modal dialog with a short, plain-language explanation of what
the section is, why it matters, and how ATS uses it — so users understand the purpose of
each section without leaving the page.

## Context

- Frontend: `apps/opticv-web/src/app/features/cv-optimization/`
- The page renders one `app-section-card` (`components/section-card/`) per optimization
  section (Job Posting, ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades,
  Cover Letter, Interview Prep, LinkedIn Profile).
- Existing precedent for this exact UI pattern already exists in
  `components/export-footer/export-footer.ts`/`.html`: a `pi-info` icon `p-button`
  (`rounded`, `outlined`, `severity="secondary"`, `size="small"`) that toggles a
  `signal<boolean>` to show/hide a `p-dialog` ("ATS Template Information").
- Approved copy source: `docs/help-informations.md` (per-section explanatory text,
  written by the PO/planning phase). The "Job Posting" section also gets a help button,
  using the "Job Posting" paragraph from that doc (added during clarification since the
  original doc only explicitly listed the other 8 sections' copy).

## Scope

### In scope

- Extend `SectionCard` (`section-card.ts` / `section-card.html` / `section-card.css`)
  to render an optional `pi-info` help button in `.section-card__header`, positioned
  right after the title (`h2.section-card__title`) and before the status badge /
  collapse chevron.
- Clicking the button opens a `p-dialog` containing:
  - A header (dialog title — the section's help title, e.g. "About Job Posting").
  - A body — plain text and/or rich content (heading/paragraph/list) projected via a
    named `ng-content` slot.
- The help button/dialog is **opt-in per usage**: sections that don't provide help
  content render no button (no dialog, no visual change) — see `helpTitle` details
  below.
- Wire up all 9 `app-section-card` usages in `cv-optimization.html` (Job Posting + the
  8 result sections) with their help title and body content, using the copy from
  `docs/help-informations.md`.
- Keyboard/screen-reader accessibility for the new button and dialog, consistent with
  existing `p-dialog`/`p-button` usage in the codebase (WCAG AA, focus management via
  PrimeNG's built-in dialog focus trap).

### Out of scope

- Changing the copy/wording beyond what's in `docs/help-informations.md`.
- Tooltips (`pTooltip`) on individual fields/badges — unaffected, out of scope.
- Any change to `export-footer`'s existing info dialog.
- Backend changes — this is presentation-only, no API/data model involved.
- Persisting "dialog seen/dismissed" state — dialogs are stateless, always available.

## Behavior

1. `SectionCard` gains:
   - `helpTitle = input<string>()` — optional. When present, the help button renders.
   - A named content-projection slot for the help dialog body, e.g.
     `<ng-content select="[sectionHelp]" />`, projected only inside the dialog (not in
     the visible card body).
   - A local `helpDialogVisible = signal(false)` to control dialog visibility, mirroring
     `ExportFooter.infoDialogVisible`.
2. In the card header, when `helpTitle()` is truthy, render a `p-button`:
   - `icon="pi pi-info"`, `[rounded]="true"`, `[outlined]="true"`, `size="small"`,
     `severity="secondary"`.
   - `[ariaLabel]` / `title` = `"About " + title() + " section"` (or similar descriptive
     label distinct from the existing collapse-toggle `aria-label`).
   - `(onClick)="helpDialogVisible.set(true)"`.
3. Below the existing card markup, render a `p-dialog`:
   - `[header]="helpTitle()"`, `[visible]="helpDialogVisible()"`,
     `(visibleChange)="$event ? null : helpDialogVisible.set(false)"`, `[modal]="true"`,
     `[draggable]="false"`, sized similarly to the export-footer info dialog
     (`{ width: '600px', maxWidth: '95vw' }`).
   - Dialog body renders the projected `[sectionHelp]` content.
4. In `cv-optimization.html`, each of the 9 `app-section-card` elements gets:
   - `[helpTitle]="'About <Section Name>'"` (or equivalent short title).
   - A child element/`<ng-template>` with the `sectionHelp` attribute containing the
     corresponding paragraph from `docs/help-informations.md`, marked up as plain
     paragraph text (bullet lists only where useful, e.g. none of the current copy
     strictly requires one, but the slot supports it for future content).
5. Each section's dialog is independent — opening one section's help dialog has no
   effect on other sections' state (each `SectionCard` instance owns its own
   `helpDialogVisible` signal).
6. The help button is purely informational — it does not affect `collapsed`, `status`,
   or any other section state, and works regardless of whether the section is collapsed
   or its status (pending/processing/completed/error).

## Edge Cases

- **Section has no help content:** `helpTitle()` is `undefined` → no button rendered,
  no dialog in the DOM interaction path, no layout shift in the header (existing
  sections without a `helpTitle` input passed behave exactly as today).
- **Collapsed section:** the help button remains visible/clickable in the header even
  when the section body is collapsed (header is always rendered, per current
  `section-card.html` structure).
- **Job Posting section (live-flow only):** only rendered when
  `!isStoredMode() && submittedJobApplication()`; when rendered, it gets the same help
  button treatment as the other 8 sections, using the "Job Posting" copy.
- **Long dialog content:** dialog uses the same `maxWidth: '95vw'` responsive
  constraint as the existing export-footer dialog so it doesn't overflow on mobile.
- **Multiple dialogs open:** not possible — only one `p-dialog` exists per
  `SectionCard` instance and each is opened/closed independently; no cross-section
  interference expected since each has its own signal.

## Data / API

- No backend/API changes.
- No new shared types in `@opticv/datatypes` required — `helpTitle` is a plain
  `string`, help body is static template content passed via content projection.
- No DB changes.

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx lint opticv-web` passes.
- `npm exec nx typecheck opticv-web` passes.
- All 9 sections (Job Posting + 8 result sections) on `cv-optimization` show a `pi-info`
  button in their header that opens a dialog with the copy from
  `docs/help-informations.md`.
- Existing `SectionCard` usages elsewhere in the app (if any, outside
  `cv-optimization.html`) continue to render unchanged when `helpTitle` is not passed.
- Help button and dialog pass AXE checks and WCAG AA (keyboard operable, focus trapped
  in dialog while open, focus returns to trigger button on close, accessible name via
  `ariaLabel`/`title`).
- No breaking changes to `SectionCard`'s existing public API (`sectionId`, `icon`,
  `title`, `status`, `collapsed` inputs/model remain unchanged).
