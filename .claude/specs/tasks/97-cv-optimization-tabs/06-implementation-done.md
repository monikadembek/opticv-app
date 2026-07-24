# Implementation Done

Task ID: 97-cv-optimization-tabs

## Summary

The CV optimization results page (`cv-optimization.ts` / `.html`) was changed to render its 7 result sections inside two PrimeNG `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel` tabs ("CV Analysis" / "Additional Materials"), with Job Posting and the partial-results warning rendered outside and above both tab panels. A new `activeResultsTab` signal (`ActiveResultsTab` type in `models.ts`) drives: which group's `app-section-card` blocks render, sidebar (`app-optim-sidebar`) and mobile-tabs (`app-mobile-tabs`) nav-item filtering, Collapse/Expand All scoping, a lazy per-tab first-section-expanded default, export-footer visibility, and scrollspy re-scoping on tab switch. No route, query-param, or data-loading changes were made.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Tab bar with two tabs, positioned below heading/action-buttons row, above Job Posting | Implemented | `<p-tabs>` block in `cv-optimization.html` renders after the heading/buttons row and after the Job Posting / partial-results-warning blocks. |
| Job Posting renders below tab bar, visible regardless of active tab | Implemented | Both live (`app-section-card` for `JOB_POSTING`) and stored (`app-job-info-banner`) variants render before `<p-tabs>`, outside any `p-tabpanel`. |
| Below Job Posting, only active tab's group section cards render | Implemented | `<p-tabpanel value="cv-analysis">` contains ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades; `<p-tabpanel value="additional-materials">` contains Cover Letter, Interview Prep, LinkedIn Profile. |
| Default active tab = "CV Analysis" on every load/navigation, no persistence | Implemented | `activeResultsTab = signal<ActiveResultsTab>('cv-analysis')`; reset to `'cv-analysis'` in `runOptimization()`; no query param, localStorage, or route state used. |
| Sidebar shows only Job Posting + active tab's group items | Implemented | `OptimSidebar.visibleNavGroups` computed filters `NAV_GROUPS` to `'Job Posting'` plus the group matching `activeTab()`. |
| Mobile tabs show only Job Posting + active tab's group items | Implemented | `MobileTabs.navItems` computed applies the same filter as the sidebar. |
| Clicking a shown nav item scrolls to/expands that section (no cross-tab switching needed) | Implemented | `handleSectionClick()` unchanged; only reachable for items already filtered to the active tab. |
| Collapse/Expand All scoped to active tab's sections only | Implemented | `activeTabSectionIds` computed selects `cvAnalysisSectionIds()` or `additionalMaterialsSectionIds()` based on `activeResultsTab()`; `allSectionsCollapsed` and `toggleAllSections()` both use `activeTabSectionIds()`. |
| Initial default disclosure computed independently per group, first time each tab is viewed | Implemented | Constructor effect keyed on `pageState()` + `activeResultsTab()`, guarded by `initializedTabDefaults` (a `Set<ActiveResultsTab>`), expands `RESUME_AUTOPSY` for cv-analysis / `COVER_LETTER` for additional-materials the first time each tab's condition is met. |
| Export footer renders only when `canExportCv() && jobApplicationId()` AND active tab is "CV Analysis" | Implemented | `@if (canExportCv() && jobApplicationId() && activeResultsTab() === 'cv-analysis')` in `cv-optimization.html`. |
| Scrollspy re-scoped/recomputed on tab switch | Implemented | Scrollspy effect additionally reads `this.activeResultsTab()`, re-running `setupScrollspy()` (which re-queries `[data-section]` from the current DOM) after a tab switch. |
| Switching tabs while a section is `processing` shows processing placeholder, no special handling | Implemented | No new logic added; existing `sectionStatus()`/processing rendering is unaffected by tab switching. |
| In-progress bullet/keyword edit cancelled on tab switch | Implemented | `onResultsTabChanged()` calls `onBulletEditCancelled()` and `onKeywordEditCancelled()` before setting the new tab. Cover Letter/Summary Rewrite were not given equivalent cancellation, per the plan's noted absence of an analogous in-progress-edit signal for those two. |
| `hasPartialStoredResults` warning stays global, unaffected by active tab | Implemented | Renders unconditionally before `<p-tabs>`. |
| Retry buttons unaffected by tabs | Implemented | No changes made to `retryablePromptTypes` or retry button bindings. |
| Mobile: `app-mobile-tabs` and the new tab bar coexist; `app-mobile-tabs` items filtered to Job Posting + active group | Implemented | `app-mobile-tabs` retained as a separate element; its `navItems` computed applies the active-tab filter. |
| No route/URL/query-param change | Implemented | No route or query param changes made. |
| No change to data loading (`ngOnInit`, `forkJoin`, SSE streaming) | Implemented | `ngOnInit`, `loadStoredOptimization`, `runOptimization`'s SSE/stream logic unchanged aside from added state-reset lines for the new tab/collapse signals. |
| No persistence of active tab across reload/navigation | Implemented | `activeResultsTab` is an in-memory signal only; no storage/query-param read or write. |
| No change to `NAV_GROUPS` data structure | Implemented | `NAV_GROUPS` in `optim-sidebar.ts` unchanged; only new filtering computeds were added around it. |
| Build passes (`npm exec nx build opticv-web`) | Implemented | Verified: build succeeds. |
| Lint passes (`npm exec nx lint opticv-web`) | Implemented | Verified: no lint errors in files changed by this task; 2 pre-existing errors remain in unrelated files (`app.spec.ts`, `cv-a4-preview.spec.ts`). |
| Unit tests added/updated for tab switching, per-tab collapse scoping, export footer visibility, sidebar/mobile-tabs filtering, scrollspy re-scoping | Implemented | Present in `cv-optimization.spec.ts`, `optim-sidebar.spec.ts`, `mobile-tabs.spec.ts`. |
| No breaking changes to data loading, SSE streaming, or persisted user-selection state | Implemented | No modifications to persistence methods (`persistBulletState`, `persistSummaryState`, `persistCoverLetterState`) or their triggers. |
| Passes AXE checks; tab bar keyboard-navigable, ARIA roles, visible focus, WCAG AA contrast | Implemented | Delivered via PrimeNG `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel`, which provide WAI-ARIA Tabs pattern roles/attributes and keyboard navigation without custom code; no manual AXE run recorded in the plan or review documents. |
| Typecheck passes (`npm exec nx typecheck opticv-web`) | Not implemented | Plan states this command fails in the repo independent of this task's changes (pre-existing `tsconfig.app.json`/`tsconfig.spec.json` `TS5069` issue); type correctness was verified via successful build instead. |

## Files

### Created

None.

### Modified

- `apps/opticv-web/src/app/features/cv-optimization/models.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.spec.ts`
- `docs/tasks-list.md`

## Components

| Component (from plan) | Status | Note |
| --- | --- | --- |
| `results-tabs` (originally planned custom tab component) | Missing | Superseded during implementation by PrimeNG's `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel`, per the implementation plan's documented post-implementation change. `components/results-tabs/` does not exist. |
| `OptimSidebar` (modified, not created) | Exist | Gained `activeTab` input and `visibleNavGroups` computed. |
| `MobileTabs` (modified, not created) | Exist | Gained `activeTab` input; `navItems` changed from static field to filtering computed. |

## Stores

Not applicable — no NgRx Signal Store was planned or introduced by this task. State is held in component-local signals on `CvOptimization`.

## Deviations

- The implementation plan itself records one deviation from the original plan: the tab bar was first built as a custom `results-tabs` component, then replaced with PrimeNG's `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel` set during implementation; the custom component was deleted and never shipped.
- The tab labeled with `value="cv-analysis"` displays the text "Resume Analysis" in `cv-optimization.html`, differing from the implementation plan's own `04-implementation-plan.md` code snippet, which shows the label as "CV Analysis".
- `runOptimization()` additionally resets `collapsedSections` to an empty `Set` on a new run; the plan notes this was not in the original plan and was added during implementation because the new default-collapse effect merges into existing collapsed state rather than replacing it.
- The default-collapse effect and `initializedDefaults` signal (single boolean in the pre-task code) were replaced with `initializedTabDefaults` (a `Set<ActiveResultsTab>`), to track per-tab initialization instead of a single one-time initialization.
- A test-infrastructure change was made to `cv-optimization.spec.ts`'s existing `ResizeObserver` stub, adding an `unobserve` method, because PrimeNG's `TabList` calls `resizeObserver.unobserve(...)` in `ngOnDestroy` and the stub previously lacked it.

## Additional Implementation

None.
