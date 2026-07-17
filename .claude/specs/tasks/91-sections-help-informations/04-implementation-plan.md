# Implementation Plan — Task 91

## Source

- Specification: `.claude/specs/tasks/91-sections-help-informations/02-spec.md`
- Specification review: `.claude/specs/tasks/91-sections-help-informations/03-spec-review.md`
  (result: PASS WITH ISSUES)

## Correction Carried Forward From Review

The spec repeatedly says "9 sections" / "9 `app-section-card` usages". Verified
against the current codebase (`cv-optimization.html`): there are **8**
`app-section-card` usages total — Job Posting (live-flow only) + 7 result
sections (ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades, Cover
Letter, Interview Prep, LinkedIn Profile). This plan uses the correct count of
8 throughout. No other spec content is changed.

## Files

### Modified

1. `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.ts`
2. `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.html`
3. `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.css`
4. `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.spec.ts`
5. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

### Created

None — no new files needed; the help affordance is added to the existing
`SectionCard` component via a new optional input, a local signal, and a named
content-projection slot.

---

## Step 1 — `SectionCard` component class (`section-card.ts`)

- Import `ButtonModule` from `primeng/button` and `DialogModule` from
  `primeng/dialog`; add both to the component's `imports` array (alongside
  existing `ProcessingPlaceholder`).
- Import `signal` from `@angular/core` (already imports `input`, `model`,
  `Component`, `ChangeDetectionStrategy`).
- Add new input: `readonly helpTitle = input<string>();` (optional, no
  default — `undefined` when not passed).
- Add new local state: `readonly helpDialogVisible = signal(false);`.
- Do not add/modify a `toggleHelp` type method beyond what's needed — the
  dialog is opened directly via `(onClick)="helpDialogVisible.set(true)"` in
  the template (mirrors `ExportFooter`'s inline `infoDialogVisible.set(true)`
  pattern, no extra method required).
- No changes to `sectionId`, `icon`, `title`, `status`, `collapsed` — public
  API for existing inputs/model stays untouched per spec.

## Step 2 — `SectionCard` template (`section-card.html`)

- Inside `.section-card__header`, immediately after the
  `<h2 class="section-card__title">` element and before the status badge
  `@if` blocks, add:
  - `@if (helpTitle()) { <p-button icon="pi pi-info" [rounded]="true"
    [outlined]="true" size="small" severity="secondary"
    class="section-card__help-button" [ariaLabel]="'About ' + title() + '
    section'" [title]="'About ' + title() + ' section'"
    (onClick)="helpDialogVisible.set(true)" /> }`
  - Confirms this label is distinct from the existing toggle's
    `aria-label` (`"Expand/Collapse " + title() + " section"`), satisfying the
    spec's accessibility requirement.
- After the existing closing `</div>` of the outer `section-card` div (i.e.,
  as a sibling at the template root, same level as the `export-footer`
  pattern where dialogs live outside the main content div), add:
  - `@if (helpTitle()) { <p-dialog [header]="helpTitle()"
    [visible]="helpDialogVisible()" (visibleChange)="$event ? null :
    helpDialogVisible.set(false)" [modal]="true" [draggable]="false"
    [style]="{ width: '600px', maxWidth: '95vw' }"> <ng-content
    select="[sectionHelp]" /> </p-dialog> }`
  - Gating the dialog itself behind `@if (helpTitle())` (not just the
    button) keeps the dialog out of the DOM entirely when no help content is
    configured, matching the edge case in the spec ("no dialog in the DOM
    interaction path").
- No changes to the existing `.section-card__toggle` button, status badges,
  or `.section-card__body` content-projection (`<ng-content />` unnamed slot
  stays as-is for the section's main body).

## Step 3 — `SectionCard` styles (`section-card.css`)

- Add a `.section-card__help-button` rule only if visual spacing needs
  adjustment next to the title within the existing flex header (`gap:
  var(--space-3)` on `.section-card__header` already provides spacing
  between flex children, so this may require no new CSS at all).
- If PrimeNG's default button sizing causes misalignment against
  `.section-card__title`/`.section-card__toggle`, add a minimal rule scoped to
  `.section-card__help-button` (e.g. `flex-shrink: 0`) — do not modify
  unrelated existing rules.

## Step 4 — `SectionCard` unit tests (`section-card.spec.ts`)

Extend the existing spec file (do not replace it) with new test cases
covering the added behavior, consistent with the file's existing style
(`TestBed`, `fixture.componentRef.setInput`, native DOM queries):

- Does not render a help button when `helpTitle` is not set (query for
  `.section-card__help-button` or the `pi-info` icon within the header,
  expect null) — covers the opt-in/no-regression requirement.
- Renders a help button when `helpTitle` is set to a non-empty string.
- Help button has an accessible name distinct from the collapse toggle's
  (contains `helpTitle`-driven text, e.g. `"About Test Section section"`).
- Clicking the help button sets `helpDialogVisible` to `true` (verify via
  the dialog becoming visible/rendered, or via component instance signal
  state).
- Dialog is not present/visible in the DOM before the button is clicked
  when `helpTitle` is set (initial state).
- Projected `[sectionHelp]` content appears inside the dialog once opened —
  add an inline test host or pass simple projected content via
  `fixture.nativeElement.innerHTML`/a wrapper test component if the existing
  spec pattern doesn't already support content projection assertions; keep
  consistent with existing spec conventions (no new testing utilities
  introduced beyond what's needed).
- Toggling `collapsed` to `true` does not affect the help button's
  presence/visibility (covers the "collapsed section" edge case).

## Step 5 — Wire up `cv-optimization.html`

For each of the 8 `app-section-card` usages, add:

1. `[helpTitle]="'About <Section Name>'"` input binding.
2. A child element carrying the `sectionHelp` attribute (e.g.
   `<ng-template sectionHelp>` or a plain `<div sectionHelp>` — pick
   whichever satisfies Angular content projection into `<ng-content
   select="[sectionHelp]" />`; a plain attribute-decorated element such as
   `<div sectionHelp>...</div>` is simplest and consistent with the
   existing codebase's lack of `ng-template`-based projection elsewhere),
   containing the corresponding paragraph from `docs/help-informations.md` as
   plain text (no bullet lists — matches the source doc, which is prose-only
   for every section).

Concrete mapping (title / help copy source paragraph in
`docs/help-informations.md`):

| # | `app-section-card` (line ref, pre-edit) | `title()` | `helpTitle` value | Copy source heading |
|---|---|---|---|---|
| 1 | Job Posting, line ~85 (only when `!isStoredMode() && submittedJobApplication()`) | `"Job Posting"` | `"About Job Posting"` | `**Job Posting**` |
| 2 | ATS Analysis, line ~118 | `"ATS Analysis"` | `"About ATS Analysis"` | `**ATS Analysis**` |
| 3 | Keyword Gap, line ~147 | `"Keyword Gap"` | `"About Keyword Gap"` | `**Keyword Gap**` |
| 4 | Summary Rewrite, line ~187 | `"Summary Rewrite"` | `"About Summary Rewrite"` | `**Summary Rewrite**` |
| 5 | Bullet Upgrades, line ~219 | `"Bullet Upgrades"` | `"About Bullet Upgrades"` | `**Bullet Upgrades**` |
| 6 | Cover Letter, line ~263 | `"Cover Letter"` | `"About Cover Letter"` | `**Cover Letter**` |
| 7 | Interview Prep, line ~295 | `"Interview Prep"` | `"About Interview Prep"` | `**Interview Prep**` |
| 8 | LinkedIn Updates, line ~321 | `"LinkedIn Profile"` | `"About LinkedIn Profile"` | `**LinkedIn Profile**` |

- Copy each paragraph's text verbatim from `docs/help-informations.md` into
  the corresponding `[sectionHelp]`-attributed element as plain paragraph
  text (e.g. wrapped in a single `<p>`), with no wording changes (out of
  scope per spec).
- Insert the `[helpTitle]` binding and `sectionHelp` child element inside
  the existing `<app-section-card>...</app-section-card>` blocks, without
  reordering or modifying any other existing attribute bindings, event
  bindings, or projected content (retry buttons, result components, etc.)
  already present in each block.
- Line numbers above are from the current file state pre-edit and are for
  implementer orientation only — re-verify each block by its `title="..."`
  / section comment (`<!-- ATS Analysis -->`, etc.) before editing, since line
  numbers shift as earlier edits are applied.

## Step 6 — Accessibility Verification

- Confirm the new `p-button`'s `ariaLabel`/`title` text
  (`"About <Title> section"`) is distinct from the existing toggle's
  (`"Expand/Collapse <Title> section"`) for every one of the 8 sections —
  no duplicate accessible names within a single header.
- Confirm PrimeNG `p-dialog`'s built-in focus trap and focus-return-to-trigger
  behavior is relied upon (no custom focus management code needed, consistent
  with `export-footer`'s existing dialog which uses no extra focus-handling
  code).
- Run AXE checks (existing project tooling/process) against the
  `cv-optimization` page with at least one help dialog open and closed, to
  confirm no new violations are introduced.

## Step 7 — Verification Commands (Acceptance)

Run in this order, fixing any failures before proceeding to the next:

1. `npm exec nx lint opticv-web`
2. `npm exec nx typecheck opticv-web`
3. `npm exec nx test opticv-web` (includes the extended `section-card.spec.ts`
   and existing `cv-optimization.spec.ts`)
4. `npm exec nx build opticv-web`

Manually verify in a running dev server (`npm exec nx serve opticv-web`):

- All 8 sections on `/cv-optimization` (reachable via a live optimization
  flow, so Job Posting's card renders) show a `pi-info` button in their
  header.
- Each button opens a dialog titled `"About <Section>"` with the correct
  paragraph from `docs/help-informations.md`.
- Dialogs are independent — opening one section's dialog does not affect
  others.
- Help button remains clickable when its section is collapsed.
- Existing `SectionCard` usages without `helpTitle` (if any exist outside
  `cv-optimization.html` — confirm via a repo-wide search for
  `app-section-card` usages) render unchanged (no button, no layout shift).

## Non-Goals (Explicit, Per Spec)

- No copy changes beyond `docs/help-informations.md`.
- No changes to `pTooltip` usages.
- No changes to `export-footer`'s existing info dialog.
- No backend/API/datatypes changes.
- No persistence of dialog-seen state.
