# Task Specification

## Source

Task 97: UX/UI - CV optimization page - split results into 2 groups displayed in separate tabs

## Goal

Split the CV optimization results page into two tabs by content type, instead of one long flat list of sections:

- **Tab A — "CV Analysis"**: ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades.
- **Tab B — "Additional Materials"**: Cover Letter, Interview Prep, LinkedIn Profile.

The Job Posting section stays outside both tabs and is always visible. Implementation is tabs-on-one-route — no URL/route change, no query param, no persistence across navigation.

## Context

`apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` (+ `.html`) is the page component. It loads all data once (`ngOnInit` → `forkJoin` in live mode, or `loadStoredOptimization` in stored mode) into signals on the component, and currently renders `JOB_POSTING` + all 7 result sections (`app-section-card` per `PromptType`) as one flat vertical list. Navigation between sections is via `app-optim-sidebar` (desktop) and `app-mobile-tabs` (mobile), both driven by `NAV_GROUPS` (`optim-sidebar.ts:10-65`), which already groups nav items into `Job Posting`, `Resume Analysis` (= Tab A), and `Additional Materials` (= Tab B). Section visibility is currently controlled only by `collapsedSections` (expand/collapse), not by any tab concept — this task adds a tab dimension on top.

The tab bar itself is implemented with PrimeNG's `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel` components (`primeng/tabs`) rather than a hand-rolled component, since the app already standardizes on PrimeNG throughout and this component set provides ARIA tablist/tab/tabpanel semantics and keyboard navigation out of the box.

The export footer (`app-export-footer`) depends only on Group A data (`mergedCv`, `canExportCv`) and must only render while Tab A is active.

## Scope

### In scope

- Add a tab bar with two tabs: "CV Analysis" and "Additional Materials".
- Tab bar position: below the "CV Optimization" heading + Collapse/Expand All + New Optimization buttons row, above the Job Posting section.
- Job Posting section (live-mode `app-job-upload` read-only card, or stored-mode `app-job-info-banner`) renders below the tab bar, visible regardless of active tab.
- Below Job Posting: only the section cards belonging to the currently active tab's group render.
- Default active tab on every page load/navigation: "CV Analysis" (no persistence, no query param, no localStorage).
- Sidebar (`app-optim-sidebar`) and mobile tabs (`app-mobile-tabs`) only show: the `JOB_POSTING` nav item + the nav items belonging to the currently active tab's group. Items from the inactive group are not rendered/clickable.
- Clicking a nav item in the sidebar/mobile-tabs (all belonging to Job Posting or the active group, per the above) scrolls to/expands that section as today — no cross-tab switching is needed since the inactive group's items aren't shown.
- "Collapse All" / "Expand All" button scope: per-tab. It only affects the sections rendered in the currently active tab (Job Posting + active group's sections). The initial default disclosure state (first section of a group expanded, rest collapsed) is computed per tab/group, independently for each group, so that switching tabs the first time shows that tab's first section already expanded.
- Export footer: continues to render only when `canExportCv()` is true, and only while "CV Analysis" tab is active.
- Scrollspy (`setupScrollspy`) must only observe `[data-section]` elements currently in the DOM (i.e. belonging to Job Posting + the active tab), so `activeSection` doesn't get set to a section that isn't rendered.

### Out of scope

- Any route/URL change (no new route, no query param for active tab).
- Any change to data loading (`ngOnInit`, `forkJoin`, SSE streaming) — all data keeps loading for both tabs immediately, regardless of which tab is active.
- Any change to disclosure pattern v1/v2 behavior itself (collapse/expand mechanics of `app-section-card`) beyond scoping "Collapse All" to the active tab.
- Persisting the active tab across page reloads or back/forward navigation.
- Any redesign of `NAV_GROUPS` data structure in `optim-sidebar.ts` (it already matches the split and is reused as-is).

## Behavior

1. **Initial/upload state** (`pageState() === 'initial'`): unchanged — no tabs, no sidebar items enabled, just the upload form.
2. **Once processing starts or stored results load** (`pageState() !== 'initial'`):
   - A new tab bar renders below the heading/action-buttons row: "CV Analysis" (default active) and "Additional Materials".
   - Below the tab bar, the Job Posting section (`app-section-card` in live mode / `app-job-info-banner` in stored mode) always renders, regardless of active tab.
   - Below Job Posting, only the section cards for the active tab's group render:
     - "CV Analysis" active → ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades.
     - "Additional Materials" active → Cover Letter, Interview Prep, LinkedIn Profile.
   - Switching tabs (clicking the other tab button) swaps the rendered section cards; the previously active tab's sections unmount.
3. **Sidebar / mobile tabs**: nav items shown are `JOB_POSTING` + the active tab's group items only (2 groups' worth: Job Posting group + whichever of Resume Analysis / Additional Materials matches the active tab). Clicking any shown nav item behaves as today: sets `activeSection`, expands the section if collapsed, scrolls to it. No cross-group switching logic is needed because items from the other group are not shown while inactive.
4. **Collapse/Expand All**: label and behavior ("Expand All" shown when the active tab's sections are all collapsed, "Collapse All" otherwise) is computed from only the active tab's section ids (Job Posting + active group). Clicking it collapses/expands only those sections; the other tab's collapse state is preserved independently and restored when the user switches back to it.
5. **Initial default disclosure** (first section expanded, rest collapsed): applied independently per group the first time its data becomes available/relevant — i.e., "CV Analysis" tab defaults to ATS Analysis expanded (as today), and "Additional Materials" tab defaults to Cover Letter expanded, the first time each tab is viewed with data ready.
6. **Export footer**: renders only when `canExportCv() && jobApplicationId()` AND the active tab is "CV Analysis". Switching to "Additional Materials" hides it; switching back to "CV Analysis" shows it again (given the same `canExportCv` conditions still hold).
7. **Scrollspy**: recomputed/re-scoped whenever the active tab changes, so it only observes `[data-section]` elements currently rendered (Job Posting + active tab's sections).

## Edge Cases

- Switching tabs while a section in the newly-active tab is still `processing`: the section card renders its processing placeholder as today; no special handling needed since data loading is unaffected by tab switching.
- Switching tabs while a bullet/keyword/summary/cover-letter inline edit is open (`activeBulletEditKey`, `activeKeywordEditKey`, etc.): switching away from the tab containing the open editor should not persist a stale editing UI state indefinitely, but since those editors belong to sections that unmount when the tab is inactive, any open inline edit in the outgoing tab should be cancelled/reset (reuse existing `onBulletEditCancelled()` / `onKeywordEditCancelled()` — extend the tab-switch handler to also cancel cover letter/summary edit-in-progress state if analogous open-edit signals exist) so state doesn't leak or desync when the tab is revisited.
- `hasPartialStoredResults` warning banner: keep rendering below Job Posting regardless of active tab (it's a page-level warning, not tied to one group) — unless the user wants it scoped too; treated as out-of-scope for this task and kept global.
- Retry buttons (`retryablePromptTypes`) inside each section: unaffected, since they operate purely on `PromptType` and don't reference tabs.
- Mobile view: `app-mobile-tabs` (the horizontal scrollable section shortcut bar) is a distinct UI element from the new "CV Analysis"/"Additional Materials" tab bar — both exist simultaneously; `app-mobile-tabs` items are filtered to Job Posting + active group per the sidebar behavior described above.

## Data / API

- No backend/API changes. No new endpoints, no schema changes.
- New local UI state: an `activeTab` signal (e.g. `'cv-analysis' | 'additional-materials'`, default `'cv-analysis'`) added to `CvOptimization` component, not persisted anywhere (in-memory only, resets on navigation/reload).
- `collapsedSections` state: no data-shape change required if collapse/expand logic keys off `activeTab` when computing which ids to affect and when initializing defaults; the existing `Set<string>` of collapsed section ids can still hold ids from both groups simultaneously (state preserved per group across tab switches).

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- Typecheck passes (`npm exec nx typecheck opticv-web`)
- Lint passes (`npm exec nx lint opticv-web`)
- Unit tests added/updated for: tab switching, per-tab collapse/expand scoping, export footer visibility per tab, sidebar/mobile-tabs filtering by active tab, scrollspy re-scoping on tab switch
- No breaking changes to data loading, SSE streaming, or persisted user-selection state (bullets/keywords/summary/cover letter edits)
- Passes AXE checks; tab bar keyboard-navigable (arrow keys/Tab, `role="tablist"`/`role="tab"`/`role="tabpanel"` provided by PrimeNG's `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel`), visible focus states, WCAG AA color contrast

## Assumptions

- "CV Analysis" tab is always the default/first tab on load, matching the task's framing of it as the primary resume-editing task.
- The tab bar uses PrimeNG's `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel` (not a reuse of `app-mobile-tabs`, which serves a different purpose — a quick-jump/scrollspy shortcut bar — and is kept as-is except for the item-filtering behavior described above).
- "Additional Materials" tab's default expanded section is "Cover Letter" (first item in that group per `NAV_GROUPS`), mirroring how "CV Analysis" defaults to "ATS Analysis" (first item in `Resume Analysis` group) today.
- `hasPartialStoredResults` warning and Job Posting section remain un-scoped by tab (always visible), since neither is a member of either group in `NAV_GROUPS`.
