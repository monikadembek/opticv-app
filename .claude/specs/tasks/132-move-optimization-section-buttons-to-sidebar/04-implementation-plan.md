# Implementation Plan — Task 132

Source: `02-spec.md` (updated to the final design). All work is frontend, under `apps/opticv-web/src/app/features/cv-optimization/`. No dependency installs, backend, or shared-type changes.

## Planning decisions

- **Groups as data:** every `NAV_GROUPS` entry carries a `tab` (`'job-posting' | 'cv-analysis' | 'additional-materials'`). A `tabForSection(id)` helper maps an item id to its group.
- **No group controls:** group labels stay static; the sidebar and mobile strip emit only `sectionClicked`. The page decides whether a group switch is needed.
- **Tabs and panels:** PrimeNG `p-tabs` stays, with a `p-tablist` of three `p-tab`s generated from `NAV_GROUPS` (so names/order match the sidebar) and three `p-tabpanel`s. Hidden panels stay mounted (state retained) and ARIA tab relationships are valid because the tabs exist.
- **First-view defaults:** extracted into a reusable method so a section click can apply them before expanding the clicked card.
- **Scroll after switch:** when the click changes group, scrolling is deferred until after the next render.

## Files

### 1. Modify `models.ts`

- Add `'job-posting'` to `ActiveResultsTab`.

### 2. Modify `components/optim-sidebar/optim-sidebar.ts`

- Introduce an exported `NavGroup` interface (`group`, `tab`, `items`) and type `NAV_GROUPS` with it.
- Give the groups `tab` values: Job Posting → `'job-posting'`, Resume Optimization → `'cv-analysis'`, Additional Materials → `'additional-materials'`. Rename "Resume Analysis" to "Resume Optimization".
- Export `tabForSection(id: string): ActiveResultsTab | undefined`.
- Remove the `activeTab` input and the group filtering; expose `navGroups = NAV_GROUPS`.
- Keep scoring-ring methods, `showScores`, `sectionClicked`, `toggleClicked`.

### 3. Modify `components/optim-sidebar/optim-sidebar.html` and `.css`

- Render every group: static `.sidebar-group-label` when expanded, `.sidebar-divider` when collapsed, then all of the group's item buttons (unchanged item markup: status icons, tooltip when collapsed, disabled/dimmed in the initial state).
- Keep the existing `:focus-visible` outline for `.nav-item`. No group-header, chevron or indented-list styles.

### 4. Modify `components/mobile-tabs/mobile-tabs.ts`, `.html`, `.css`

- Remove `activeTab`, `tabSelected`, switcher list and switcher click handler.
- `navItems` becomes the flat list of all `NAV_GROUPS` items; the scroll-into-view effect indexes directly into the button list.
- Template renders only item buttons (first word of label); keep `:focus-visible` outline.

### 5. Modify `cv-optimization.ts`

- Keep the `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel` imports; add `Injector` injection and `afterNextRender` import; import `NAV_GROUPS` and `tabForSection`; expose `navGroups = NAV_GROUPS` for the template.
- Remove `'JOB_POSTING'` from `cvAnalysisSectionIds`; add `jobPostingSectionIds` (contains `'JOB_POSTING'` only when a job application exists).
- `activeTabSectionIds`: switch over the three tabs.
- Extract the first-view default logic into private `applyTabDefaults(tab)` (default expanded card: `JOB_POSTING` / `RESUME_AUTOPSY` / `COVER_LETTER`; collapse the other cards of that group; mark tab initialized). The existing effect calls it when the page state is not initial.
- `onResultsTabChanged(tab: string | number | undefined)` (bound to `p-tabs` `valueChange`; ignores values other than the three tabs): cancel bullet/keyword edits, set `activeResultsTab`, set `activeSection` to the group's first item.
- `handleSectionClick(id)`: resolve `tabForSection(id)`; when it differs from the shown group, call `onResultsTabChanged` and, if the page state is not initial, `applyTabDefaults`; then set `activeSection`, expand the card if collapsed, and scroll — immediately when no switch happened, via `afterNextRender` (with the injected `Injector`) when the group changed. Scrolling lives in private `scrollToSection(id)`.

### 6. Modify `cv-optimization.html`

- Drop `[activeTab]` and `(tabSelected)` bindings on `<app-optim-sidebar>` and `<app-mobile-tabs>`.
- Keep `<p-tabs [value]="activeResultsTab()" (valueChange)="onResultsTabChanged($event)">`. Add `<p-tablist>` with `@for (group of navGroups; track group.tab) { <p-tab [value]="group.tab">{{ group.group }}</p-tab> }`. Panels (`<p-tabpanels class="px-0!">`) in order: job-posting, cv-analysis, additional-materials.
- Move the live-flow Job Posting card and the stored-mode job info banner into the job-posting panel. The partial-results warning stays above the panels.
- Change both "CV Optimization" headings (run state and initial form) to "Resume Optimization".

### 7. Modify tests

- `optim-sidebar.spec.ts`: all groups' items rendered; static labels for every group when expanded; no group-header buttons or chevrons; dividers per group when collapsed; `tabForSection` mapping; keep item, status, toggle and scoring tests.
- `mobile-tabs.spec.ts`: one button per item across all groups; active highlight; `sectionClicked` emission.
- `cv-optimization.spec.ts`: heading text "Resume Optimization"; switching tab sets the first item of the new group as active section; three tabs rendered above the cards with the sidebar group names, tab click switches the group and sets the first item active, unknown tab values ignored; `handleSectionClick` switches to the clicked section's group; first visit to a group via a non-default item leaves that card expanded while the group's default card stays expanded and other cards collapse.

## Verification checklist

- `npm exec nx typecheck opticv-web`, `npm exec nx lint opticv-web`, `npm exec nx build opticv-web`, `npm exec nx test opticv-web` pass.
- Manual: tab bar above the cards shows three tabs in sync with the sidebar; all three groups and their items visible in the sidebar (expanded and collapsed) and in the mobile strip; clicking an item in another group swaps the right-hand cards, expands the card and scrolls to it; Job Posting group shows only the job posting card/banner; export footer only for Resume Optimization; Expand/Collapse All scoped to the shown group; keyboard operation; AXE clean.
