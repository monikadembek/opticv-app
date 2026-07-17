# Code Review — Task 91: Sections Help Informations

## Summary

- Overall result: **PASS WITH ISSUES**
- The core feature works end-to-end: all 8 `app-section-card` usages in `cv-optimization.html` (Job Posting + 7 result sections) now render a help button that opens a section-scoped dialog with content from `docs/help-informations.md`, and `section-card.spec.ts` covers the opt-in/accessibility/collapsed-state behavior. However, the implementation deviates from both the spec and the implementation plan on the button's markup (custom SVG button instead of the specified `p-button`), leaves an unused `ButtonModule` import and an unused SVG asset, and is missing the plan's content-projection test case.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. **Unused `ButtonModule` import** — `section-card.ts:8,16` imports `ButtonModule` from `primeng/button` and adds it to the component's `imports` array, but `section-card.html` never uses `p-button` (the help button is a plain `<button>` with inline SVG). This is dead code pulled into the component's dependency graph for no reason.
2. **Unused SVG asset** — `apps/opticv-web/public/images/info-icon.svg` was added but is never referenced anywhere in the diff (the help icon is inlined directly as SVG markup in `section-card.html:16-46`). Should be removed, or the button should actually reference it.
3. **Duplicate `title`/`ariaLabel` construction repeated inline** — `section-card.html:11-12` computes `'About ' + title() + ' section'` twice in the template (once for `title`, once for `ariaLabel`). Minor duplication; could be a single expression/getter, though this mirrors the existing `.section-card__toggle` button's pattern (`section-card.html:63-64`) so it's consistent with existing style in the file.

## Specification Coverage

| Requirement | Status | Note |
| ----------- | ------------------------------ | ---- |
| `helpTitle = input<string>()` optional input | Covered | `section-card.ts:26` |
| Help button opt-in (no button/dialog when `helpTitle` unset) | Covered | Gated by `@if (helpTitle())` for both button (`section-card.html:9`) and dialog (`section-card.html:86`); tested in `section-card.spec.ts:136-148` |
| Button uses `p-button` with `icon="pi pi-info"`, `[rounded]`, `[outlined]`, `size="small"`, `severity="secondary"` | **Partial** | Spec (`02-spec.md:68-69`) and plan (`04-implementation-plan.md:58-62`) both explicitly specify a PrimeNG `p-button` with `pi-info` icon. Actual implementation (`section-card.html:10-47`) is a plain `<button>` with a hand-rolled inline SVG (hardcoded `#047857` green fill), not a `p-button`, and does not use `pi pi-info` at all |
| `[ariaLabel]`/`title` = `"About " + title() + " section"`, distinct from toggle's label | Covered | `section-card.html:11-12`; tested in `section-card.spec.ts:159-172` |
| `(onClick)="helpDialogVisible.set(true)"` | Covered (as `(click)`, since a native `<button>` is used rather than `p-button`) | `section-card.html:13` |
| Named content-projection slot `<ng-content select="[sectionHelp]" />` inside dialog only | Covered | `section-card.html:95` |
| `helpDialogVisible = signal(false)` local state | Covered | `section-card.ts:28` |
| `p-dialog` with `[header]`, `[visible]`, `(visibleChange)`, `[modal]="true"`, `[draggable]="false"`, `{width:'600px', maxWidth:'95vw'}` | Covered | `section-card.html:87-93`, matches export-footer precedent |
| Dialog gated behind `@if (helpTitle())` (not in DOM when no help content) | Covered | `section-card.html:86,97`; tested in `section-card.spec.ts:144-148` |
| All 9(8) `app-section-card` usages wired with `helpTitle` + `sectionHelp` copy from `docs/help-informations.md` | Covered | All 8 sections in `cv-optimization.html` (Job Posting, ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Profile) plus `job-info-banner.html` (stored-mode Job Posting) have `helpTitle` + `[sectionHelp]` div with matching copy |
| Each section's dialog independent (own signal per instance) | Covered | `helpDialogVisible` is per-component-instance signal; no shared state |
| Help button visible/clickable when section collapsed | Covered | Button lives in `.section-card__header`, unaffected by `.section-card__body` collapse; tested in `section-card.spec.ts:186-194` |
| No breaking changes to existing `SectionCard` public API | Covered | `sectionId`, `icon`, `title`, `status`, `collapsed` unchanged |
| Job Posting section (live-flow) gets help button | Covered | `cv-optimization.html:85-107` |
| Job info banner (stored mode) — spec silent on this, but plan/task list note it should match | Covered (bonus) | `job-info-banner.html` wraps `app-section-card` with `helpTitle="Job Posting Section"` and `sectionHelp` content — not explicitly required by `02-spec.md` (spec only discusses the live-flow Job Posting card and 8 result sections) but consistent with the feature's intent per `docs/tasks-list.md`'s task 91 note ("job-info-banner component should look like the rest of sections") |
| AXE / WCAG AA pass | Not verified in this review | No automated AXE run or manual accessibility pass evidenced in the diff or commit history; plan Step 6 calls for this explicitly |

## Plan Deviations

1. **Button implementation diverges from Step 1/Step 2 of the plan.** The plan explicitly calls for importing `ButtonModule`/`DialogModule` and rendering `<p-button icon="pi pi-info" [rounded]="true" [outlined]="true" size="small" severity="secondary" ...>`. The actual code imports `ButtonModule` (per plan) but never uses it — the button is a custom `<button>` element with inline SVG markup instead of `p-button`. This is a functional/visual deviation from the plan, not just a style nit: the resulting button uses a custom green checkmark-style icon rather than the "consistent affordance" the spec (`02-spec.md:23`) and `docs/help-informations.md:20-24` both call for (matching `export-footer`'s existing info button).
2. **Test coverage gap vs. plan Step 4.** The plan lists a test case for verifying "Projected `[sectionHelp]` content appears inside the dialog once opened." No such test exists in the final `section-card.spec.ts` — dialog-open tests check `helpDialogVisible()` state only, never assert on projected content rendering.
3. **Plan Step 6 (AXE verification) has no evidence of execution** in the diff (no accessibility test additions, no note in commit messages).
4. **Unrelated changes bundled into task 91 commits**: `settings.spec.ts` and `top-header.spec.ts` were modified (in "Task 91: Update failing unit tests") to match `Preference Update Error` copy and a `/home` route — neither of which is part of task 91's scope, and neither of which has a corresponding source-file change in this diff range. These appear to be pre-existing failing tests fixed opportunistically; harmless but out of scope for this task's plan/spec.

## Null Safety Issues

None. `helpTitle()` is consistently guarded via `@if` before use in both the button and dialog blocks; no unguarded access to the optional input.

## Code Smells

1. **Dead import** — `ButtonModule` in `section-card.ts:8,16` (see Conventions Violations #1).
2. **Dead asset** — `info-icon.svg` (see Conventions Violations #2).
3. **Inline SVG duplication risk** — the ~30-line inline `<svg>` block in `section-card.html:16-46` is entirely inside a single `@if` for one button; if any other component ever needs the same icon, this markup isn't reusable (unlike the unused `info-icon.svg` asset, which could have served that purpose via `NgOptimizedImage` or a `background-image`). Not a current duplication since it appears once, but worth flagging given the abandoned SVG-asset approach.
4. **Magic hex color** — `style="fill: #047857"` (repeated 3x, `section-card.html:35,39,43`) is a hardcoded raw hex value rather than a CSS custom property (the file elsewhere consistently uses `var(--primary-700)`, `var(--text-strong)`, etc. in `section-card.css`). `--primary-700` is already used for `.section-card__icon` background (`section-card.css:25`) and looks like the same color family — using the CSS variable would keep the icon theme-consistent instead of a separately hardcoded value.

## Recommendation

- **Fix critical issues before merge** — there are no *critical* violations, but the deviation from the spec/plan's explicit `p-button`/`pi-info` requirement is significant enough (visual/consistency requirement called out twice in source docs) that it should be reconciled with the author/PO before merging: either update the implementation to use `p-button` + `pi-info` as specified, or get sign-off to keep the custom SVG button and update the spec/plan/docs accordingly. Alongside that, remove the unused `ButtonModule` import and unused `info-icon.svg` asset, and consider adding the missing content-projection test case called out in the plan.
