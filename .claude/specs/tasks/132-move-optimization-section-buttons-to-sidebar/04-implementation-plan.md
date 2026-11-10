# Implementation Plan — Task 132

Source: `02-spec.md` (review result: PASS WITH ISSUES, no critical issues). All work is frontend, under `apps/opticv-web/src/app/features/cv-optimization/`. No dependency installs, backend, or shared-type changes.

## Planning decisions (resolving review gaps without adding requirements)

- **Tab panels:** keep `p-tabs` / `p-tabpanels` / `p-tabpanel` exactly as they are and remove only `p-tablist` + `p-tab`. Panel mounting and state retention then behave as today (no change to cover-letter / editor state handling).
- **Single-select switcher:** group header click is a switcher, not a collapsible accordion. Clicking the active header is a no-op (no emit).
- **Active section on switch:** `onResultsTabChanged` sets `activeSection` to the first item id of the newly selected group (spec Edge Cases). No scroll is triggered; page scroll position is left unchanged. Scrollspy re-setup continues via the existing effect on `activeResultsTab`.
- **Inactive group header:** shows no status indicators (spec: "collapsed to its header only").
- **Mobile:** switchers are rendered as the first buttons in the existing strip, labelled with the first word of the group name (same convention as existing items), full name in `aria-label`. The strip is already hidden in the `initial` state by the page template.
- **Header icons:** Resume Analysis → `pi-file`, Additional Materials → `pi-book` (distinct from all item icons).

## Files

### 1. Modify `components/optim-sidebar/optim-sidebar.ts`

- Extend the `NAV_GROUPS` type with optional `tab: ActiveResultsTab` and `icon: string` on the two tab groups ("Resume Analysis" → `'cv-analysis'`, "Additional Materials" → `'additional-materials'`). "Job Posting" keeps neither.
- Add `tabSelected = output<ActiveResultsTab>()`.
- Replace `visibleNavGroups` with a `navGroups` view computed from `NAV_GROUPS` that returns every group plus an `isActive` flag (`group.tab === activeTab()`); the Job Posting group is always treated as expanded.
- Add `onGroupClick(tab)` that emits `tabSelected` only when `tab !== activeTab()`.
- Keep scoring-ring methods, `showScores`, and `sectionClicked` unchanged.

### 2. Modify `components/optim-sidebar/optim-sidebar.html`

- Job Posting group: unchanged rendering (label when expanded, divider when collapsed, then its item).
- Each tab group: render a `<button type="button" class="group-header">` instead of the plain label (expanded: icon + group name; collapsed: icon only with `title`). Bind `[class.active]`, `[attr.aria-expanded]="isActive"`, `[attr.aria-controls]="'nav-group-' + tab"`, `[disabled]="pageState() === 'initial'"`, `[class.dimmed]` for the same state, and `(click)="onGroupClick(tab)"`. In collapsed mode keep an `aria-label` with the full group name.
- Render the group's items inside `<div [id]="'nav-group-' + tab">` only when `isActive`; item buttons stay as they are (status icons, `sectionClicked`).
- Keep native control flow only (`@for` / `@if`); no `ngClass`.

### 3. Modify `components/optim-sidebar/optim-sidebar.css`

- Add `.group-header` styles reusing existing tokens (full-width flex button, same padding/typography as `.sidebar-group-label` but interactive, hover background `--neutral-100`, active color `--primary-700` with `--primary-50` background, `:focus-visible` outline, `.dimmed`/disabled treatment matching `.nav-item.dimmed`).
- Add collapsed-mode styling so the header icon is centered like `.nav-item__icon`. Verify text/background contrast meets WCAG AA.
- No other layout changes.

### 4. Modify `components/mobile-tabs/mobile-tabs.ts` and `mobile-tabs.html`

- Add `tabSelected = output<ActiveResultsTab>()`.
- Expose a `tabSwitchers` list derived from `NAV_GROUPS` (groups having `tab`), and keep `navItems` as the Job Posting + active-group items.
- Template: render the switcher buttons first (`class="mobile-tab"`, `.active` when `group.tab === activeTab()`, `aria-pressed`, `aria-label` full name, label = first word, group icon), then the existing item buttons. Clicking the active switcher does nothing.
- Scroll-into-view effect keeps using the index of the active section within `navItems()` offset by the number of switchers so it still targets the right button; update the index lookup accordingly (button query list now contains switchers + items).

### 5. Modify `cv-optimization.html`

- Wire `(tabSelected)="onResultsTabChanged($event)"` on both `<app-optim-sidebar>` and `<app-mobile-tabs>`.
- Remove `<p-tablist>` and its two `<p-tab>` elements; leave `<p-tabs>`, `<p-tabpanels>` and both `<p-tabpanel>` blocks untouched.

### 6. Modify `cv-optimization.ts`

- Remove `TabList` and `Tab` from the `primeng/tabs` import and from the component `imports` array (keep `Tabs`, `TabPanels`, `TabPanel`).
- In `onResultsTabChanged`, after setting `activeResultsTab`, set `activeSection` to the first item id of the selected group using `NAV_GROUPS`. Existing edit-cancellation behavior stays first.
- No change to the `New Optimization` reset (`activeResultsTab.set('cv-analysis')`); also reset `activeSection` only if it is already reset there today (verify during implementation; do not add new reset logic otherwise).

### 7. Modify tests

- `optim-sidebar.spec.ts`: replace the group-label / divider count assertions (which relied on `visibleNavGroups`) and update item-count tests. Add tests: both group headers always rendered; active header has `aria-expanded="true"`, inactive `"false"`; only active group's items rendered; clicking inactive header emits `tabSelected` with the right tab; clicking active header does not emit; headers disabled in `initial` state; collapsed mode renders icon-only headers with `title`/`aria-label`.
- `mobile-tabs.spec.ts`: add tests for rendered switchers, active highlight, `tabSelected` emission, and no emission for the active switcher; adjust existing item-count assertions to account for the two switchers.
- `cv-optimization.spec.ts`: existing `onResultsTabChanged` tests remain valid; add tests that switching tab sets `activeSection` to the first item of the new group, and that the tab bar (`p-tablist`) is no longer rendered while the sidebar `tabSelected` event triggers the tab change.

## Verification checklist

- `npm exec nx test opticv-web` passes (updated and new specs).
- `npm exec nx lint opticv-web`, `npm exec nx typecheck opticv-web`, `npm exec nx build opticv-web` pass.
- Manual: both switchers visible without scrolling on desktop (expanded and collapsed sidebar) and mobile; switching shows only that group's sections; export footer only on Resume Analysis; Expand/Collapse All scoped to active tab; first visit to Additional Materials expands Cover Letter; keyboard Tab/Enter/Space operates headers; AXE clean.
