# Implementation Plan

Task ID: 97-cv-optimization-tabs

Source: `02-spec.md`, `03-spec-review.md` (PASS WITH ISSUES — remaining ambiguities resolved via follow-up clarification, see Resolved Ambiguities below).

Status: **Implemented.** This document reflects what was actually built, including a post-implementation change (tab bar swapped from a hand-rolled component to PrimeNG's `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel`).

## Resolved Ambiguities (from post-review clarification)

- Inline-edit cancellation on tab switch: **in scope**. Only applies to bullet/keyword edits (`activeBulletEditKey`, `activeKeywordEditKey`), the only ones with an actual "in-progress edit" signal on the page component. Cover Letter and Summary Rewrite have no equivalent in-progress-edit signal (verified in their component source — they only hold selected-variant/edited-text state, not an "editing now" flag), so there is nothing to cancel for those two.
- Initial default-expand-first-section timing: computed **lazily, the first time the user switches to/views a given tab** (not as soon as data is ready in the background).
- ARIA structure: the tab list and tab panels are handled by PrimeNG's `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel` (see below). Job Posting section (and the partial-results warning) render as normal siblings **before** `<p-tabs>`, outside any tabpanel.

## Tab Bar: PrimeNG `Tabs` (superseding the original custom-component plan)

The original plan called for a new hand-rolled `results-tabs` component implementing `role="tablist"`/`role="tab"` and arrow-key navigation manually. During implementation this was replaced with PrimeNG's `Tabs` component set instead, since:
- The app already standardizes on PrimeNG for all other UI (buttons, dialogs, editor, select), so a custom tab implementation was an unnecessary deviation.
- PrimeNG's `Tabs`/`TabList`/`Tab` already implement the WAI-ARIA Tabs pattern (roles, `aria-selected`, `aria-controls`, arrow-key navigation, focus management) without any custom code, and match the app's theme automatically.
- `TabPanels`/`TabPanel` provide the `role="tabpanel"` wrapper with correctly generated `id`/`aria-labelledby` pairing (PrimeNG derives these from an internal `Tabs` instance id), which is simpler and more correct than hand-computing matching `id`/`aria-controls` pairs across a separate custom component and manual panel `<div>`s.

No new component directory was created for this. `apps/opticv-web/src/app/features/cv-optimization/components/results-tabs/` does **not** exist.

## Files Changed

### 1. `apps/opticv-web/src/app/features/cv-optimization/models.ts`

- Added and exported: `export type ActiveResultsTab = 'cv-analysis' | 'additional-materials';`

### 2. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

Imports:
- `import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';`
- `import { ActiveResultsTab, SectionStatus } from './models';`
- All five PrimeNG tab components added to the component's `imports` array.

State:
- `readonly activeResultsTab = signal<ActiveResultsTab>('cv-analysis');`
- `private readonly initializedTabDefaults = signal<ReadonlySet<ActiveResultsTab>>(new Set());` (replaces the old single `initializedDefaults` boolean signal).

Computed signals (added after `allSectionIds`):
- `cvAnalysisSectionIds` — `['JOB_POSTING', RESUME_AUTOPSY, KEYWORD_GAP, SUMMARY_REWRITE, BULLET_UPGRADE]` filtered to ids present in `allSectionIds()`.
- `additionalMaterialsSectionIds` — `[COVER_LETTER, INTERVIEW_PREP, LINKEDIN_REWRITE]` filtered the same way.
- `activeTabSectionIds` — returns one of the above two based on `activeResultsTab()`. Used to scope Collapse/Expand All and the default-collapse effect.
- `allSectionsCollapsed` — changed from `this.allSectionIds().every(...)` to `this.activeTabSectionIds().every(...)`.

Behavior changes:
- `toggleAllSections()` — rewritten to build a new `Set` from the current `collapsedSections()`, adding/removing only `activeTabSectionIds()` members, so the inactive tab's collapsed state is untouched.
- Constructor's scrollspy effect — now also reads `this.activeResultsTab()` so it re-runs `setupScrollspy()` (via the existing deferred `setTimeout`) whenever the active tab changes, since switching tabs unmounts/remounts `[data-section]` elements.
- Constructor's default-collapse effect — rewritten to key off both `pageState()` and `activeResultsTab()`: if the current tab is not yet in `initializedTabDefaults()` and `pageState() !== 'initial'`, it merges into `collapsedSections` (collapsing every id in `activeTabSectionIds()` except the group's default-expanded id — `RESUME_AUTOPSY` for `cv-analysis`, `COVER_LETTER` for `additional-materials`) and marks that tab as initialized. This runs lazily per tab, satisfying the "first time viewed" resolution.
- New method:
  ```ts
  onResultsTabChanged(tab: string | number | undefined): void {
    if (tab !== 'cv-analysis' && tab !== 'additional-materials') return;
    this.onBulletEditCancelled();
    this.onKeywordEditCancelled();
    this.activeResultsTab.set(tab);
  }
  ```
  The parameter type is `string | number | undefined` (not `ActiveResultsTab`) because that is PrimeNG `Tabs`' `valueChange` emission type; the method narrows it before use.
- `runOptimization()` reset block — added `this.collapsedSections.set(new Set());`, `this.initializedTabDefaults.set(new Set());`, and `this.activeResultsTab.set('cv-analysis');`. The `collapsedSections` reset was **not** in the original plan; it was added during implementation because the new default-collapse effect merges into existing collapsed state rather than replacing it wholesale, so a fresh run needs to start from an empty set to avoid stale collapse state leaking across runs.

### 3. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

- Job Posting blocks (live-mode `app-section-card` / stored-mode `app-job-info-banner`) and the `hasPartialStoredResults` warning stay exactly where they were, rendered before the tab structure, unchanged.
- Tab structure inserted directly after the partial-results warning block:
  ```html
  <p-tabs [value]="activeResultsTab()" (valueChange)="onResultsTabChanged($event)">
    <p-tablist>
      <p-tab value="cv-analysis">CV Analysis</p-tab>
      <p-tab value="additional-materials">Additional Materials</p-tab>
    </p-tablist>
    <p-tabpanels>
      <p-tabpanel value="cv-analysis">
        <!-- ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades app-section-card blocks, unchanged -->
      </p-tabpanel>
      <p-tabpanel value="additional-materials">
        <!-- Cover Letter, Interview Prep, LinkedIn Profile app-section-card blocks, unchanged -->
      </p-tabpanel>
    </p-tabpanels>
  </p-tabs>
  ```
- No manual `role="tabpanel"`/`id`/`aria-labelledby` attributes anywhere — `p-tabpanel`/`p-tab` generate and wire these internally.
- `<app-optim-sidebar>` and `<app-mobile-tabs>` bindings both gained `[activeTab]="activeResultsTab()"`.
- Export footer condition changed from `@if (canExportCv() && jobApplicationId())` to `@if (canExportCv() && jobApplicationId() && activeResultsTab() === 'cv-analysis')`.
- No changes to individual `app-section-card` blocks' internals (bindings, retry buttons, help dialogs).

### 4. `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts` (+ `.html`)

- Added input: `readonly activeTab = input<ActiveResultsTab>('cv-analysis');` (imports `ActiveResultsTab` from `../../models`).
- Added computed: `visibleNavGroups` — filters `NAV_GROUPS` to `'Job Posting'` plus whichever of `'Resume Analysis'` / `'Additional Materials'` matches `activeTab()`.
- Template: `@for (group of navGroups; ...)` → `@for (group of visibleNavGroups(); ...)`.

### 5. `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.ts` (+ `.html`)

- Added input: `readonly activeTab = input<ActiveResultsTab>('cv-analysis');`.
- `navItems` changed from a plain computed-once field to a `computed()` that filters `NAV_GROUPS` the same way as the sidebar, then flattens to items.
- The `viewChildren`-based scroll-into-view `effect()` now reads `this.navItems()` (the computed) instead of a cached array, so `tabButtons` indices stay aligned with the currently visible items.
- Template iterates `navItems()` instead of a static field.

### 6. Test files

- `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.spec.ts` — updated the "renders a nav button for every item" test to expect only Job Posting + Resume Analysis items by default; added a case for `additional-materials`; updated the group-label/divider count assertions to use `component.visibleNavGroups().length` instead of `NAV_GROUPS.length`.
- `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.spec.ts` — same pattern: default-tab item count assertion updated, added `activeTab` filtering test cases.
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`:
  - Added `describe('activeResultsTab / onResultsTabChanged', ...)` covering: default value, switching both directions, bullet/keyword edit cancellation on switch, and `runOptimization()` resetting the tab back to `'cv-analysis'`.
  - Added `describe('export footer visibility', ...)` covering `canExportCv()`/`activeResultsTab()` combinations.
  - Updated `describe('default-collapse effect', ...)`: existing "collapses all sections except RESUME_AUTOPSY" tests renamed and scoped to `cvAnalysisSectionIds()` instead of `allSectionIds()`; added tests for the Additional Materials lazy default (Cover Letter expanded on first view) and for cv-analysis collapse state surviving a round-trip through the other tab.
  - Updated `describe('allSectionsCollapsed / toggleAllSections', ...)`: all assertions rescoped from `allSectionIds()` to `activeTabSectionIds()`; added a test confirming `toggleAllSections()` does not touch the inactive tab's sections, and a test confirming it scopes correctly when Additional Materials is active.
  - **Test-infrastructure fix required during implementation**: the existing `ResizeObserver` stub at the top of the spec file (originally added only for `CvA4Preview`) was missing an `unobserve` method. PrimeNG's `TabList` calls `resizeObserver.unobserve(...)` in its `ngOnDestroy`, and JSDOM has no native `ResizeObserver`, so every test that rendered the page past `pageState() !== 'initial'` threw `TypeError: this.resizeObserver.unobserve is not a function` during component teardown, cascading into ~34 unrelated test failures (stored-mode loading, summary/cover-letter persistence, etc.). Fixed by adding `unobserve = vi.fn();` to the stub class alongside the existing `observe`/`disconnect`.

## Sequencing (as executed)

1. Added `ActiveResultsTab` type to `models.ts`.
2. Built the tab bar as a custom `results-tabs` component (initial approach), wired it into `cv-optimization.ts`/`.html`, updated sidebar/mobile-tabs filtering, added test coverage. Full suite green.
3. Per user request, replaced the custom `results-tabs` component with PrimeNG's `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel`:
   - Deleted `components/results-tabs/` entirely.
   - Updated `cv-optimization.ts` imports/`imports` array and `onResultsTabChanged`'s parameter type.
   - Restructured `cv-optimization.html` to use `<p-tabs>`/`<p-tablist>`/`<p-tab>`/`<p-tabpanels>`/`<p-tabpanel>`, moving Job Posting/partial-results-warning above the tab structure.
   - Fixed the `ResizeObserver` test stub gap described above.
4. Ran `npm exec nx build opticv-web`, `npm exec nx lint opticv-web`, `npm exec nx test opticv-web` — build passes, no new lint errors (all remaining warnings/errors pre-exist on other files), all 1110 tests pass.

Note: `npm exec nx typecheck opticv-web` fails in this repo independent of these changes (`TS5069: Option 'emitDeclarationOnly' cannot be specified without specifying option 'declaration' or option 'composite'` in `tsconfig.app.json`/`tsconfig.spec.json`) — a pre-existing tsconfig issue, not something introduced by this task. Type correctness was otherwise verified via the successful `nx build`.

## Out of Scope (reaffirmed from spec)

- No route/query-param changes.
- No changes to `ngOnInit` data loading, SSE streaming, or `loadStoredOptimization`.
- No changes to `app-section-card` collapse mechanics themselves.
- No persistence of `activeResultsTab` across reload/navigation.
- No changes to `NAV_GROUPS` data structure.
