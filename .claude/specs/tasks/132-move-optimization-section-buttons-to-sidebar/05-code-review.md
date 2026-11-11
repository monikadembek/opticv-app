# Code Review — Task 132

Reviewed commit `5900c7e` (branch `132-sidebar-changes`) against `02-spec.md` and `04-implementation-plan.md`. No `05-implementation-done.md` exists; the file list came from `git diff --name-only HEAD~1 HEAD`.

### Summary

- Overall result: PASS WITH ISSUES
- Critical issues: 2
- The sidebar restructure works as the user last directed: all three groups with static labels, all items always visible, and the right side showing only the selected group's cards (Job Posting is its own group). Two problems should be fixed before merge: clicking a not-yet-visited group's non-default item lands on a collapsed card, and the leftover `p-tabpanel` markup without a tablist likely violates the AXE requirement. The spec and plan are also out of date.

### Conventions Violations

#### Critical (must fix before merge)

1. **Clicked section ends up collapsed on the first visit to a group** — `cv-optimization.ts` `handleSectionClick` (~line 786) together with the first-view default effect (~line 650).
   `handleSectionClick` switches the tab, then expands the clicked card (a no-op because it is not collapsed yet). The default-expansion effect then runs for the newly viewed tab and collapses every card except the group's default one. Clicking "Interview Prep" or "LinkedIn Profile" before Additional Materials was ever opened therefore scrolls to a collapsed card, which contradicts the requirement that the click expands the card (spec Behavior 3). The same applies to the Job Posting group only if its default were not that card; for it the default is the clicked card, so it is unaffected.
2. **AXE / WCAG: `role="tabpanel"` with a dangling `aria-labelledby`** — `cv-optimization.html` lines 93–539.
   The `p-tablist`/`p-tab` elements were removed but `p-tabs`/`p-tabpanel` remain. `p-tabpanel` renders `role="tabpanel"` and `aria-labelledby="<tabsId>_tab_<value>"` (verified in `primeng-tabs.mjs`), and no element with that id exists. `conventions.md` says the page MUST pass all AXE checks (the `aria-valid-attr-value` / required-role relationship is a likely failure). Inactive panels are also only hidden with `hidden`, so all three panels' content stays in the DOM.

#### Non-Critical (should fix)

1. `cv-optimization.ts` is 1793 lines (was 1754). `rules.md` sets a 1000-line limit. The overage predates this task but grew by 39 lines. `cv-optimization.spec.ts` is 3765 lines.
2. `onResultsTabChanged(tab: string | number | undefined)` keeps a PrimeNG-shaped signature that is no longer needed, since both callers now pass an `ActiveResultsTab`. The `(valueChange)` binding on `p-tabs` in `cv-optimization.html:93–96` is dead because there is no tab bar.
3. `MobileTabs.statuses` input is declared and bound but never used in `mobile-tabs.ts` / `mobile-tabs.html` (predates this task, left in place).
4. `optim-sidebar.ts`: the `NavGroup.items[].id` type `PromptType | 'JOB_POSTING'` is repeated in several inputs; minor duplication.
5. Test gaps in `cv-optimization.spec.ts` (see below): no test for cross-group `handleSectionClick`, `jobPostingSectionIds`, `activeTabSectionIds` for `'job-posting'`, or the job-posting default expansion.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Switchers visible in the sidebar, not only in the page body | Covered | All groups always visible in the sidebar (`optim-sidebar.html`) |
| Right side shows only the selected group's cards | Covered | `p-tabpanel` per group; Job Posting moved into its own panel |
| Group headers as accordion buttons with `aria-expanded` / `aria-controls` | Superseded | Removed at the user's later request; groups are static labels |
| Tab bar removed from main content | Covered | `p-tablist` / `p-tab` removed (but see Critical 2) |
| Collapsed sidebar: icon buttons for groups | Superseded | Group icons removed; groups show a divider when collapsed |
| Mobile: add two switcher buttons | Superseded | Mobile strip now lists all items of all groups, no switchers |
| New output wired to `onResultsTabChanged` | Superseded | `tabSelected` outputs removed; `sectionClicked` now switches tab via `handleSectionClick` |
| Preserve edit cancellation, first-view defaults, scrollspy, export footer, Expand/Collapse All | Partial | Preserved, but the first-view default interacts badly with section clicks (Critical 1) |
| Active section set to first item of new group on switch | Covered | `onResultsTabChanged` |
| Initial state: controls disabled | Covered | Items disabled/dimmed; group headers no longer exist |
| Unit tests for sidebar, mobile-tabs, page-level switching | Partial | Sidebar and mobile specs updated; page-level tests for the new flow are missing |

### Plan Deviations

- Plan files 1–4 (accordion headers, chevron, `tabSelected`, mobile switchers, `onGroupClick`) were implemented, then replaced after user feedback. Final state: no `onGroupClick`, no `tabSelected`, no group icons, no `activeTab` input on `OptimSidebar` or `MobileTabs`.
- `ActiveResultsTab` gained a third value `'job-posting'`; `NAV_GROUPS` entries all carry `tab`; new exported `tabForSection`; new `jobPostingSectionIds` computed. None are in the plan.
- `handleSectionClick` now switches tabs and uses `afterNextRender` with an injected `Injector`; the plan kept it unchanged.
- The plan said to keep the Job Posting card above the tabs. It was moved into a `job-posting` `p-tabpanel`, so it no longer shows together with the other groups' cards (user-directed).
- Group "Resume Analysis" renamed to "Resume Optimization" and both page headings changed from "CV Optimization" to "Resume Optimization" (user-directed, not in spec).
- `02-spec.md` and `04-implementation-plan.md` were not updated to reflect any of the above.

### Null Safety Issues

- `cv-optimization.html:~124` `jobApplication()!` inside `@if (isStoredMode() && jobApplication())`: guarded by the `@if`, moved unchanged from the original location.
- No new unguarded nullables introduced. `tabForSection` returns `ActiveResultsTab | undefined` and `handleSectionClick` handles `undefined`.

### Code Smells

- `cv-optimization.ts` remains very large and mixes state, selection, persistence and navigation (pre-existing; see Non-Critical 1).
- `defaultExpandedId` is a nested ternary on three tab values; a lookup keyed by tab would be clearer.
- `handleSectionClick` calls `onResultsTabChanged`, which already sets `activeSection` to the group's first item, then overwrites it; the double set is redundant.
- Magic number `5.5 * 16 + 42` for the scroll offset (pre-existing, moved into `scrollToSection`).
- Build and lint were not re-run after the final restructure; typecheck and tests were. One unrelated test (`cover-letter-editor.spec.ts`, "renders all variant cards") timed out in `beforeEach` during full runs and passed when run alone.

### Recommendation

- Fix critical issues before merge
