# Implementation Done — Task 91

## Summary

Added an opt-in help affordance to `SectionCard`: a header button that opens a `p-dialog`
containing plain-language explanatory content, projected via a named `sectionHelp` slot.
Wired up the help title and content on all 8 `app-section-card` usages on the
`cv-optimization` page (Job Posting in both live-flow and stored-mode-via-`JobInfoBanner`
paths, plus the 7 result sections), using copy from `docs/help-informations.md`. Extended
`section-card.spec.ts` with new test cases covering the added behavior.

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `SectionCard` gains optional `helpTitle = input<string>()` | Implemented | `section-card.ts:26` |
| Named content-projection slot for help dialog body (`[sectionHelp]`) | Implemented | `section-card.html:95` |
| Local `helpDialogVisible = signal(false)` | Implemented | `section-card.ts:28` |
| Help button rendered in `.section-card__header` after title, before status badge/chevron, only when `helpTitle()` truthy | Implemented | `section-card.html:9-47` |
| Help button opens dialog via `(click)="helpDialogVisible.set(true)"` | Implemented | `section-card.html:13` |
| Help button uses `p-button` (`icon="pi pi-info"`, `rounded`, `outlined`, `size="small"`, `severity="secondary"`) | Not implemented | Deviation — see Deviations section |
| `ariaLabel`/`title` = `"About " + title() + " section"`, distinct from toggle's aria-label | Implemented | `section-card.html:11-12` |
| `p-dialog` with `[header]`, `[visible]`, `(visibleChange)`, `[modal]="true"`, `[draggable]="false"`, `{ width: '600px', maxWidth: '95vw' }` | Implemented | `section-card.html:86-97` |
| Dialog gated behind `helpTitle()` truthy (not in DOM when absent) | Implemented | `section-card.html:9`, `86` |
| Opt-in per usage — no button/dialog/layout shift when `helpTitle` not passed | Implemented | Covered by spec tests |
| Wire up all 8 `app-section-card` usages with `helpTitle` + `sectionHelp` content | Implemented | `cv-optimization.html` (7 sections) + `job-info-banner.html` (Job Posting, stored mode) |
| Job Posting section (live-flow) gets help button treatment | Implemented | `cv-optimization.html:85-107` |
| Job Posting section (stored mode, via `JobInfoBanner`) gets help button treatment | Implemented | `job-info-banner.html:1-55` (not explicitly named in spec, which only discusses the live-flow Job Posting card, but `JobInfoBanner` also wraps an `app-section-card` and was extended identically — see Additional Implementation) |
| Copy sourced from `docs/help-informations.md`, no wording changes | Implemented | Verified verbatim against doc for all 8 sections |
| Keyboard/screen-reader accessibility, WCAG AA, PrimeNG focus trap | Partially implemented | Dialog uses `p-dialog` (PrimeNG focus trap applies); help button itself is a plain native `<button>`, not `p-button` — see Deviations |
| No breaking changes to existing `SectionCard` public API (`sectionId`, `icon`, `title`, `status`, `collapsed`) | Implemented | Unchanged in `section-card.ts` |
| Each section's dialog independent (own signal per instance) | Implemented | `helpDialogVisible` is per-component-instance state |
| Help button visible/clickable when section collapsed | Implemented | Header always rendered regardless of `collapsed()` |
| `npm exec nx build opticv-web` passes | Not verified | Not run as part of this report |
| `npm exec nx lint opticv-web` passes | Not verified | Not run as part of this report |
| `npm exec nx typecheck opticv-web` passes | Not verified | Not run as part of this report |

## Files

### Created

- `apps/opticv-web/public/images/info-icon.svg`

### Modified

- `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.css`
- `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.css`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts`
- `docs/tasks-list.md`

### Referenced (pre-existing, not modified)

- `docs/help-informations.md`

## Components

| Component (per plan) | Status |
|---|---|
| `SectionCard` (`section-card.ts`/`.html`/`.css`/`.spec.ts`) | Exist |

## Stores

No stores were specified in the plan for this task. N/A.

## Deviations

- The help button is implemented as a plain native `<button class="section-card__help-button">`
  with an inline SVG icon (`section-card.html:10-47`), not as a PrimeNG `p-button` with
  `icon="pi pi-info"` as specified in the spec (Behavior item 2) and plan (Step 2).
  `ButtonModule` from `primeng/button` is still imported in `section-card.ts` but is unused
  in the template for the help button.
- `DialogModule`/`p-dialog` is used as specified for the dialog itself.
- `job-info-banner.ts`/`.html`/`.css` were modified to wrap its content in an
  `app-section-card` with `helpTitle` and `[sectionHelp]` content — this file is not listed
  in the implementation plan's "Files → Modified" list.
- `cv-optimization.ts` was modified — not listed in the implementation plan's "Files →
  Modified" list. (Diff shows no functional changes tied to the help-dialog feature beyond
  what is visible in the template wiring; exact nature of the `.ts` diff was not isolated
  separately from the file's current full content.)
- An SVG asset `apps/opticv-web/public/images/info-icon.svg` was added but is not referenced
  by `section-card.html` (which inlines its own SVG markup directly rather than using this
  file via `NgOptimizedImage` or an `<img>` tag).
- Help button `title`/`aria-label` text implemented as `"About " + title() + " section"`
  (matches spec's suggested format).
- `helpTitle` values wired in templates use the `"<Section Name> Section"` suffix form
  (e.g. `"Job Posting Section"`, `"ATS Analysis Section"`) rather than the spec's suggested
  `"About <Section Name>"` prefix form (e.g. `"About Job Posting"`) — the spec explicitly
  left exact title strings to implementation discretion (see spec review, Non-Critical
  Issues).

## Additional Implementation

Additional implementation not covered by the original documents:

- `job-info-banner.ts`/`.html`/`.css` (stored-mode Job Posting banner) were extended with
  the same `helpTitle`/`sectionHelp` treatment as the live-flow Job Posting card. Neither
  the spec nor the implementation plan mentions `JobInfoBanner` — both only discuss the
  live-flow `app-section-card` usage for Job Posting in `cv-optimization.html`.
- Unit test fixes in `settings.spec.ts` (error message text: `'Update Error'` →
  `'Preference Update Error'`) and `top-header.spec.ts` (route path: `'/'` → `'/home'`) —
  unrelated to the help-dialog feature; committed under "Task 91: Update failing unit
  tests" but not described in the spec, spec review, or implementation plan.
- `apps/opticv-web/public/images/info-icon.svg` was added but is unused in the current
  template code.
