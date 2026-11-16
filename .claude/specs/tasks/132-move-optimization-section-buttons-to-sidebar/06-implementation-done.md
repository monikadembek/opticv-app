# Implementation Done — Task 132

## Summary

The cv-optimization page now lists three groups in the sidebar (Job Posting, Resume Optimization, Additional Materials), each with a static label and all of its items always visible. A tab bar with the same three tabs sits above the section cards, and only the selected group's cards are shown. Clicking a sidebar item in another group switches the group, expands the card and scrolls to it after render. The mobile strip lists the items of all groups. The group "Resume Analysis" was renamed to "Resume Optimization" and the page heading "CV Optimization" was changed to "Resume Optimization". Delivered in commits `5900c7e` and `5ea5e43` on branch `132-sidebar-changes`.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Sidebar shows three groups with static labels (Job Posting, Resume Optimization, Additional Materials) | Implemented | `NAV_GROUPS` in `optim-sidebar.ts`, rendered in `optim-sidebar.html` |
| All items of all groups always visible; no accordion, chevron or group buttons | Implemented | |
| Job Posting treated as the first group, showing only its card/banner | Implemented | Own `job-posting` tab and panel |
| Right side shows only the selected group's cards | Implemented | `p-tabpanel` per group |
| Tab bar above the cards with the same three tabs as the sidebar groups | Implemented | `p-tablist` built from `navGroups` |
| Tabs and sidebar stay in sync; tab click cancels edits and sets the group's first item active | Implemented | `onResultsTabChanged` |
| Item click in another group switches group, expands the card, scrolls after render | Implemented | `handleSectionClick`, `afterNextRender` |
| First-view defaults per group; clicked card stays expanded | Implemented | `applyTabDefaults` |
| Collapsed sidebar: divider per group, icon items with tooltips | Implemented | |
| Mobile strip lists items of all groups, no group switchers | Implemented | |
| Group renamed to "Resume Optimization"; both page headings renamed | Implemented | Heading in run state and in initial form |
| Default shown group is Resume Optimization; "New Optimization" resets to it | Implemented | |
| Export footer only for Resume Optimization; Expand/Collapse All scoped to shown group | Implemented | |
| Partial-results warning stays above the group content | Implemented | |
| Items disabled/dimmed in the initial state | Implemented | |
| Accessibility: real buttons, focus-visible, valid tab/tabpanel relationships | Implemented | AXE not run |
| Unit tests for sidebar, mobile strip and page-level flow | Implemented | Full suite: 1347 passed, 10 skipped |
| build, lint, typecheck pass | Implemented | Development build, lint (0 errors), typecheck |

## Files

### Created

- `.claude/specs/tasks/132-move-optimization-section-buttons-to-sidebar/02-spec.md`
- `.claude/specs/tasks/132-move-optimization-section-buttons-to-sidebar/03-spec-review.md`
- `.claude/specs/tasks/132-move-optimization-section-buttons-to-sidebar/04-implementation-plan.md`
- `.claude/specs/tasks/132-move-optimization-section-buttons-to-sidebar/05-code-review.md`
- `.claude/specs/tasks/132-move-optimization-section-buttons-to-sidebar/06-implementation-done.md`

### Modified (under `apps/opticv-web/src/app/features/cv-optimization/`)

- `models.ts`
- `cv-optimization.ts`
- `cv-optimization.html`
- `cv-optimization.spec.ts`
- `components/optim-sidebar/optim-sidebar.ts`
- `components/optim-sidebar/optim-sidebar.html`
- `components/optim-sidebar/optim-sidebar.css`
- `components/optim-sidebar/optim-sidebar.spec.ts`
- `components/mobile-tabs/mobile-tabs.ts`
- `components/mobile-tabs/mobile-tabs.html`
- `components/mobile-tabs/mobile-tabs.css`
- `components/mobile-tabs/mobile-tabs.spec.ts`
- `docs/tasks-list.md`

## Components

| Component | Status |
| --- | --- |
| `OptimSidebar` | Exist |
| `MobileTabs` | Exist |
| `CvOptimization` | Exist |

## Stores

No stores are part of the plan or the task.

## Deviations

- The plan's first version (group headers as accordion buttons, chevron, `tabSelected` outputs, `onGroupClick`, mobile group switchers, collapsed-mode group icon buttons) was implemented and then replaced; the final code contains none of these. The plan and spec were updated to the final design.
- `ActiveResultsTab` has three values (`'job-posting'` added) and the Job Posting card/banner moved into its own tab panel.
- `OptimSidebar` and `MobileTabs` have no `activeTab` input.
- The `p-tabs` structure was kept (`p-tablist`, `p-tab`, `p-tabpanels`, `p-tabpanel`); the tabs are generated from `NAV_GROUPS`.
- First-view default logic was extracted into `applyTabDefaults(tab)`; scrolling into `scrollToSection(id)`.
- `docs/tasks-list.md` entry for task 132 was updated.

## Additional Implementation

Additional implementation not covered by the original documents:

- Rename of the group "Resume Analysis" to "Resume Optimization" and of both "CV Optimization" page headings to "Resume Optimization" (requested during implementation).
- Exported helper `tabForSection(id)` and `NavGroup` interface in `optim-sidebar.ts`.
