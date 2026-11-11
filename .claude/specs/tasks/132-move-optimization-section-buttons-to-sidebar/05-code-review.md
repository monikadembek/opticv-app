# Code Review — Task 132

First reviewed commit `5900c7e`; re-reviewed after the fixes in `5ea5e43` (branch `132-sidebar-changes`) against the updated `02-spec.md` and `04-implementation-plan.md`.

### Summary

- Overall result: PASS WITH ISSUES
- Critical issues: 0 (2 found in the first review, both fixed)
- The sidebar lists all three groups with static labels and all items; a tab bar with the same three tabs sits above the section cards; only the selected group's cards are visible. Both critical findings from the first review are resolved, and typecheck, lint (0 errors), the development build and all 1347 tests pass. Remaining items are non-critical; AXE and browser checks have not been run.

### Resolved since the first review

1. **Clicked section ended up collapsed on the first visit to a group** — fixed. The first-view default logic is extracted into `applyTabDefaults(tab)` (`cv-optimization.ts`) and `handleSectionClick` applies it right after switching group, before expanding the clicked card. Tests added: switching to the clicked section's group, and a non-default card (Interview Prep) staying expanded on first visit while Cover Letter stays expanded and LinkedIn Profile collapses.
2. **`role="tabpanel"` with a dangling `aria-labelledby`** — fixed. The tab bar is back (`p-tablist` with one `p-tab` per `NAV_GROUPS` entry), so every `p-tabpanel` has its labelling tab. AXE has not been run on the page.
3. **Dead `(valueChange)` binding and over-narrow `onResultsTabChanged` signature** — no longer applicable: the tab bar uses them again and the method accepts the PrimeNG value type with a guard.
4. **Test gaps** — added: cross-group `handleSectionClick`, first-visit expansion, three tabs rendered with sidebar group names, tab click switching the group and active section, unknown tab values ignored.
5. **Spec and plan out of date** — both updated to the final design (tab bar plus always-visible sidebar groups, Job Posting as a group, renames, `applyTabDefaults`, `tabForSection`).

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. `cv-optimization.ts` is over 1790 lines; `rules.md` sets a 1000-line limit. The overage predates this task. `cv-optimization.spec.ts` is also well over (about 3800 lines).
2. `MobileTabs.statuses` input is declared and bound but unused (predates this task).
3. The `PromptType | 'JOB_POSTING'` id type is repeated across several inputs in the sidebar (minor duplication).
4. No direct test for the job-posting group's default expansion (`JOB_POSTING` expanded on first view) or for `jobPostingSectionIds` / `activeTabSectionIds` on the `'job-posting'` tab.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| All groups and items always visible in the sidebar with static labels | Covered | `optim-sidebar.html`; no group buttons or chevrons |
| Job Posting treated as the first group, showing only its card/banner | Covered | Own `job-posting` tab/panel |
| Tab bar above the cards with the same three tabs as the sidebar groups | Covered | `p-tablist` built from `NAV_GROUPS` |
| Right side shows only the selected group's cards | Covered | `p-tabpanel` per group |
| Item click in another group switches group, expands the card, scrolls after render | Covered | `handleSectionClick` with `afterNextRender` |
| First-view defaults per group; clicked card stays expanded | Covered | `applyTabDefaults` |
| Tab click and sidebar stay in sync; edits cancelled; first item active | Covered | `onResultsTabChanged` |
| Collapsed sidebar: dividers per group, icon items with tooltips | Covered | |
| Mobile strip lists all items of all groups | Covered | |
| Renames (group and page heading to "Resume Optimization") | Covered | Both headings changed |
| Export footer, scrollspy, Expand/Collapse All unchanged in behavior | Covered | Scoped to the shown group |
| AXE/WCAG AA | Partial | Valid ARIA relationships by construction; AXE not run |
| Unit tests for sidebar, mobile strip, page flow | Covered | See Non-Critical 4 for the remaining gap |

### Plan Deviations

None. The plan was updated to match the implemented design.

### Null Safety Issues

- `cv-optimization.html` `jobApplication()!` inside `@if (isStoredMode() && jobApplication())`: guarded by the `@if`, moved unchanged from its original location.
- No new unguarded nullables. `tabForSection` returns `ActiveResultsTab | undefined` and `handleSectionClick` handles `undefined`.

### Code Smells

- `cv-optimization.ts` remains very large and mixes state, selection, persistence and navigation (pre-existing).
- `defaultExpandedId` in `applyTabDefaults` is a nested ternary on three tab values; a lookup keyed by tab would read better.
- `handleSectionClick` calls `onResultsTabChanged`, which already sets `activeSection` to the group's first item, then overwrites it; the double set is redundant.
- Magic number `5.5 * 16 + 42` for the scroll offset (pre-existing, now in `scrollToSection`).
- One unrelated test (`cover-letter-editor.spec.ts`, "renders all variant cards") timed out in `beforeEach` in earlier full runs and passed when run alone; it passed in the latest full run.

### Recommendation

- Merge as-is (after an AXE and browser check; the non-critical items can be follow-ups)
