# Task Specification

## Source

Azure DevOps Task: 132 — Move buttons for Resume Analysis and Additional materials back to sidebar

## Goal

Make navigation between the result groups permanently visible by listing all groups and their items in the sidebar (and the mobile strip), in addition to a tab bar above the cards with one tab per group. The right-hand content still renders only the cards of the group that contains the selected item, so the user does not scroll through all result sections.

## Context

Frontend only (`apps/opticv-web`), feature `features/cv-optimization`:

- `cv-optimization.html` / `cv-optimization.ts` — hosts the results area. `activeResultsTab` (`'job-posting' | 'cv-analysis' | 'additional-materials'`) decides which group's cards are visible. It also drives the export footer (visible only on `cv-analysis`), per-group default expand state (`initializedTabDefaults`), scrollspy, and Expand/Collapse All (`activeTabSectionIds`).
- `components/optim-sidebar/*` — renders `NAV_GROUPS`.
- `components/mobile-tabs/*` — mobile horizontal strip.
- Shared model `ActiveResultsTab` in `models.ts`.

No backend, API, or DB impact.

## Scope

### In scope

- **Groups.** The sidebar shows three groups, each with a static label (same style as the existing "Job Posting" label): **Job Posting**, **Resume Optimization** (previously "Resume Analysis"), **Additional Materials**. Job Posting is treated as the first group, with the single item "Job Posting and CV".
- **Always visible.** All items of all groups are always displayed. Group labels are not buttons: no accordion behavior, no chevron, no expand/collapse.
- **Right-hand content.** Only the cards of the group that holds the selected item are visible:
  - Job Posting group → the Job Posting card (live flow) or the job info banner (stored mode) only.
  - Resume Optimization group → ATS Analysis, Keywords, Summary Rewrite, Bullet Upgrades.
  - Additional Materials group → Cover Letter, Interview Prep, LinkedIn Profile.
- **Item click.** Clicking a sidebar (or mobile strip) item selects it. If the item belongs to a different group than the one currently shown, the page switches to that group first, then expands the item's card (if collapsed) and scrolls to it after the new group has rendered. If it belongs to the current group, it expands and scrolls as before.
- **First-view defaults.** The first time a group is shown, its default card is expanded and the group's other cards are collapsed: Job Posting card for Job Posting, ATS Analysis for Resume Optimization, Cover Letter for Additional Materials. A card the user clicked to open must stay expanded even on a group's first view.
- **Tab bar.** A tab bar (`p-tablist`) sits above the section cards with three tabs matching the sidebar groups, in the same order and with the same names: Job Posting, Resume Optimization, Additional Materials. Selecting a tab shows that group's cards. Tabs and sidebar stay in sync: selecting a tab sets the first item of that group as the active item; selecting a sidebar item switches the selected tab. Panels remain `p-tabpanel`s, so the ARIA tab relationships are valid. Hidden groups stay in the DOM so component state (e.g. editors) is preserved.
- **Collapsed (icon-only) sidebar.** Group labels are replaced by a divider per group, as with the previous divider behavior; item buttons keep icon + tooltip.
- **Mobile.** The mobile strip lists the items of all groups in order (Job Posting, Resume Optimization, Additional Materials). There are no separate group switchers; selecting an item behaves as in "Item click".
- **Renames.** Group "Resume Analysis" → "Resume Optimization". Page heading "CV Optimization" → "Resume Optimization" (both the heading shown during/after a run and the initial upload form heading).
- **Accessibility.** Item buttons remain real `<button>`s with visible focus, keyboard operable, WCAG AA contrast, and no dangling ARIA relationships.
- **Tests.** Update/add unit tests for the sidebar, mobile strip and page-level flow.

### Out of scope

- Changes to section content, scoring rings, export footer behavior, backend/API.
- Changing which sections belong to the Resume Optimization and Additional Materials groups.
- New routes or URL-persisted group state.
- Accordion/collapsible group headers, chevron icons, group switcher buttons in the sidebar, mobile group switchers (these were built and then removed at the product owner's request).

## Behavior

1. In processing/completed states the sidebar shows: score rings (unchanged), then the three groups, each with its label and all of its items (status icons / spinner as today).
2. Clicking an item in the group currently shown: it becomes the active item, its card expands if collapsed, and the page scrolls to it.
3. Clicking an item in another group: the right-hand content swaps to that group's cards, any open bullet or keyword edit is cancelled, the item becomes active, its card is expanded (regardless of the group's first-view default), and the page scrolls to it once rendered.
4. The group shown by default after a run (and after "New Optimization") is Resume Optimization (`cv-analysis`). The active item defaults to ATS Analysis.
5. In the initial state (before a run) all items are disabled/dimmed as today.
6. Expand All / Collapse All applies only to the cards of the group currently shown.
7. The export footer is shown only while the Resume Optimization group is shown.
8. The partial-results warning stays above the group content for all groups.
9. The tab bar above the cards shows the three groups with the shown group's tab selected. Clicking a tab switches the group as in (3) (edits cancelled, first item active) without scrolling. The Job Posting card is no longer permanently shown above the other cards.

## Edge Cases

- Initial page state: all items disabled, no switching possible.
- Stored mode vs. live flow: identical behavior; Job Posting group shows the job info banner in stored mode and the read-only card in live flow; partial stored results still show "not processed" placeholders per section.
- Switching groups while a keyword/bullet edit is active: edits are cancelled.
- First visit to a group via a non-default item (e.g. Interview Prep before Additional Materials was opened): the clicked card stays expanded, the group's other non-default cards are collapsed.
- Scrollspy: only updates the active item among cards of the group in view; it does not switch groups.
- "New Optimization" resets the shown group to Resume Optimization.
- No job application available: the Job Posting group shows no card.

## Data / API

- Endpoints: none.
- Models: `ActiveResultsTab` gains `'job-posting'`. `NAV_GROUPS` entries each carry a `tab`. A helper maps a section id to its group tab.
- DB: none.

## Assumptions

- The default shown group stays Resume Optimization even though Job Posting is listed first in the sidebar.
- The tab bar uses the same group list as the sidebar, so names and order cannot diverge.
- Hidden group panels remain mounted (state retained) rather than being destroyed.
- Inactive groups' items show their status icons because all items are always visible.
- Mobile strip labels continue to use the first word of each item label.

## Acceptance (DEV)

- build passes (`nx build opticv-web`), lint and typecheck pass
- unit tests cover: all groups/items rendered with static labels and no group buttons/chevrons; collapsed sidebar dividers; group tab mapping; mobile strip lists all items; cross-group item click switches group and keeps the clicked card expanded on first visit; first-view defaults; three tabs rendered above the cards with the sidebar group names, tab click switches the shown group
- no breaking changes to export footer, scrollspy, Expand/Collapse All, or per-group default expansion
- AXE/WCAG AA: keyboard navigable, no dangling ARIA attributes, sufficient contrast
- All navigation items visible without scrolling the results on desktop and mobile
